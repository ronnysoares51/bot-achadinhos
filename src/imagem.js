import { buscarPrevia } from './lojas/previa.js';

// Garante uma foto boa (grande) para a oferta antes de enviar.
// Problema que isto resolve: a miniatura da prévia de link do WhatsApp (~100 px) era usada como
// "foto original" e saía minúscula/borrada, e quando a página bloqueava o robô o post saía sem foto.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
export const TAMANHO_BOM = 25_000; // abaixo disto a imagem é miniatura
const TAMANHO_MAX = 8 * 1024 * 1024;

export const LADO_BOM = 500; // foto com o lado menor abaixo disto sai pequena no WhatsApp
const bytesDe = (b64) => (b64 ? Math.floor((String(b64).length * 3) / 4) : 0);

/** Largura e altura de um JPG, PNG ou WebP lendo só o cabeçalho (null se não reconhecer). */
export function dimensoes(buf) {
  if (!buf || buf.length < 30) return null;
  try {
    if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const tipo = buf.toString('ascii', 12, 16);
      if (tipo === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (tipo === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
      }
      if (tipo === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
      return null;
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) return null;
        const marca = buf[i + 1];
        if (marca === 0xd8 || (marca >= 0xd0 && marca <= 0xd7) || marca === 0x01 || marca === 0xff) {
          i += marca === 0xff ? 1 : 2;
          continue;
        }
        // SOF0..SOF15 (menos DHT/JPG/DAC) trazem altura e largura
        if (marca >= 0xc0 && marca <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marca)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }
  } catch {
    /* cabeçalho estranho */
  }
  return null;
}

/**
 * Qualidade de uma foto (base64): { boa, pontos }. Usa o tamanho em pixels quando dá para ler;
 * só olhar os bytes enganava: a prévia de link do WhatsApp tem 30-60 KB e só ~300 px, e passava
 * como "foto boa", saindo pequena no grupo.
 */
export function qualidade(b64) {
  if (!b64) return { boa: false, pontos: 0 };
  const buf = Buffer.from(String(b64), 'base64');
  const d = dimensoes(buf);
  if (d?.w && d?.h) return { boa: Math.min(d.w, d.h) >= LADO_BOM, pontos: d.w * d.h, ...d };
  return { boa: buf.length >= TAMANHO_BOM, pontos: buf.length * 6 };
}

/** Baixa uma imagem e devolve { base64, bytes } (ou null se não for uma imagem utilizável). */
export async function baixarImagem(url, { timeoutMs = 15000 } = {}) {
  if (!/^https?:\/\//i.test(String(url || ''))) return null;
  try {
    const origem = new URL(url).origin;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', Referer: `${origem}/` },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return null;
    const tipo = resp.headers.get('content-type') || '';
    if (tipo && !/^image\//i.test(tipo)) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 2000 || buf.length > TAMANHO_MAX) return null;
    return { base64: buf.toString('base64'), bytes: buf.length };
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ Mercado Livre
// A foto do ML vem em vários tamanhos, pelo final do nome: "-I" é miniatura (~90 px), "-O" é a
// original e "2X_...-F" a grande. A prévia de link e alguns grupos usam a miniatura, e a página do
// produto costuma bloquear o robô; então a foto grande é montada a partir de qualquer endereço do
// ML que aparecer, e também pedida à API pública do ML pelo código do anúncio.

const FOTO_ML = /^(https?:\/\/[^/]*mlstatic\.com\/)(?:D_[A-Z0-9_]*?)?(\d+-ML[A-Z]\d+_\d+)-[A-Z]\.(?:jpe?g|webp|png)(?:\?.*)?$/i;

/** Endereços da mesma foto do ML, do maior para o menor (em JPG: o WhatsApp não mostra WebP como foto). */
export function fotosGrandesMl(url) {
  const m = String(url || '').match(FOTO_ML);
  if (!m) return [];
  const [, base, id] = m;
  return [`${base}D_NQ_NP_2X_${id}-F.jpg`, `${base}D_NQ_NP_${id}-O.jpg`, `${base}D_${id}-O.jpg`];
}

/** Código do anúncio ou do produto de catálogo do ML num link ({ tipo: 'items'|'products', id }). */
export function codigoMl(url) {
  const texto = decodeURIComponent(String(url || ''));
  const catalogo = texto.match(/\/p\/(ML[A-Z]\d{5,})/i);
  if (catalogo) return { tipo: 'products', id: catalogo[1].toUpperCase() };
  const item = texto.match(/(?:wid=|item_id[:=])(ML[A-Z])-?(\d{5,})/i) || texto.match(/\b(ML[A-Z])-?(\d{6,})/i);
  if (item) return { tipo: 'items', id: `${item[1].toUpperCase()}${item[2]}` };
  return null;
}

async function lerJson(url) {
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    return resp.ok ? await resp.json() : null;
  } catch {
    return null;
  }
}

/** Fotos do anúncio pela API pública do ML. Lista vazia quando ela não responde. */
export async function fotosDaApiMl(link, { json = lerJson } = {}) {
  const codigo = codigoMl(link);
  if (!codigo) return [];
  const dados = await json(`https://api.mercadolibre.com/${codigo.tipo}/${codigo.id}`);
  return (dados?.pictures || []).map((p) => p.secure_url || p.url).filter(Boolean).slice(0, 1);
}

/**
 * Deixa oferta.fotoOriginal com a melhor foto disponível (base64).
 * Ordem: foto já boa > imagem da oferta > imagem da página do produto > miniatura (último recurso).
 * Idempotente: só tenta uma vez por oferta. Não lança erro.
 */
export async function garantirFoto(oferta, { baixar = baixarImagem, previa = buscarPrevia, apiMl = fotosDaApiMl } = {}) {
  if (!oferta || oferta.fotoTentada) return oferta;
  const atual = qualidade(oferta.fotoOriginal);
  if (atual.boa) {
    oferta.fotoTentada = true;
    return oferta;
  }
  let melhor = null;
  const considerar = (r) => {
    if (!r) return;
    const q = qualidade(r.base64);
    if (!melhor || q.pontos > melhor.q.pontos) melhor = { ...r, q };
  };
  const boa = () => Boolean(melhor?.q.boa);

  const tentar = async (urls) => {
    for (const url of urls) {
      if (boa()) return;
      considerar(await baixar(url));
    }
  };
  const doMl = oferta.loja === 'mercadolivre' || /mercadoli[bv]re|meli\.la|mlstatic/i.test(`${oferta.link} ${oferta.urlProduto} ${oferta.imagem}`);
  if (oferta.imagem) await tentar([...fotosGrandesMl(oferta.imagem), oferta.imagem]);
  if (doMl && !boa()) {
    for (const alvo of [oferta.urlProduto, oferta.link].filter(Boolean)) {
      const fotos = await apiMl(alvo).catch(() => []);
      for (const f of fotos) await tentar([...fotosGrandesMl(f), f]);
      if (fotos.length) break;
    }
  }
  if (!boa()) {
    for (const alvo of [...new Set([oferta.urlProduto, oferta.link].filter(Boolean))]) {
      const p = await previa(alvo).catch(() => ({}));
      if (p?.imagem && p.imagem !== oferta.imagem) {
        const antes = melhor;
        await tentar([...fotosGrandesMl(p.imagem), p.imagem]);
        if (melhor !== antes) oferta.imagem = p.imagem;
      }
      if (boa()) break;
    }
  }
  if (melhor && melhor.q.pontos > atual.pontos) oferta.fotoOriginal = melhor.base64;
  oferta.fotoTentada = Boolean(melhor) || atual.pontos > 0;
  const final = qualidade(oferta.fotoOriginal);
  console.log(`[imagem] foto da oferta: ${oferta.fotoOriginal ? `${Math.round(bytesDe(oferta.fotoOriginal) / 1024)} KB${final.w ? ` (${final.w}x${final.h})` : ''}${final.boa ? '' : ' — pequena, não achei maior'}` : 'nenhuma'}`);
  return oferta;
}
