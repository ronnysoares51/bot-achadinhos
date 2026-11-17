import { buscarPrevia } from './lojas/previa.js';

// Garante uma foto boa (grande) para a oferta antes de enviar.
// Problema que isto resolve: a miniatura da prévia de link do WhatsApp (~100 px) era usada como
// "foto original" e saía minúscula/borrada, e quando a página bloqueava o robô o post saía sem foto.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
export const TAMANHO_BOM = 25_000; // abaixo disto a imagem é miniatura
const TAMANHO_MAX = 8 * 1024 * 1024;

const bytesDe = (b64) => (b64 ? Math.floor((String(b64).length * 3) / 4) : 0);

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
  const atual = bytesDe(oferta.fotoOriginal);
  if (atual >= TAMANHO_BOM) {
    oferta.fotoTentada = true;
    return oferta;
  }
  let melhor = null;
  const considerar = (r) => {
    if (r && (!melhor || r.bytes > melhor.bytes)) melhor = r;
  };

  const tentar = async (urls) => {
    for (const url of urls) {
      if (melhor?.bytes >= TAMANHO_BOM) return;
      considerar(await baixar(url));
    }
  };
  const doMl = oferta.loja === 'mercadolivre' || /mercadoli[bv]re|meli\.la|mlstatic/i.test(`${oferta.link} ${oferta.urlProduto} ${oferta.imagem}`);
  if (oferta.imagem) await tentar([...fotosGrandesMl(oferta.imagem), oferta.imagem]);
  if (doMl && !(melhor?.bytes >= TAMANHO_BOM)) {
    for (const alvo of [oferta.urlProduto, oferta.link].filter(Boolean)) {
      const fotos = await apiMl(alvo).catch(() => []);
      for (const f of fotos) await tentar([...fotosGrandesMl(f), f]);
      if (fotos.length) break;
    }
  }
  if (!(melhor?.bytes >= TAMANHO_BOM)) {
    const alvo = oferta.urlProduto || oferta.link;
    if (alvo) {
      const p = await previa(alvo).catch(() => ({}));
      if (p?.imagem && p.imagem !== oferta.imagem) {
        const antes = melhor;
        await tentar([...fotosGrandesMl(p.imagem), p.imagem]);
        if (melhor !== antes) oferta.imagem = p.imagem;
      }
    }
  }
  if (melhor && melhor.bytes > atual) oferta.fotoOriginal = melhor.base64;
  oferta.fotoTentada = Boolean(melhor) || atual > 0;
  console.log(`[imagem] foto da oferta: ${bytesDe(oferta.fotoOriginal) ? `${Math.round(bytesDe(oferta.fotoOriginal) / 1024)} KB` : 'nenhuma'}`);
  return oferta;
}
