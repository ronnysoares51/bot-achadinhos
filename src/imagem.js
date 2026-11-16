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

/**
 * Deixa oferta.fotoOriginal com a melhor foto disponível (base64).
 * Ordem: foto já boa > imagem da oferta > imagem da página do produto > miniatura (último recurso).
 * Idempotente: só tenta uma vez por oferta. Não lança erro.
 */
export async function garantirFoto(oferta, { baixar = baixarImagem, previa = buscarPrevia } = {}) {
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

  const urls = [];
  if (oferta.imagem) urls.push(oferta.imagem);
  for (const url of urls) {
    considerar(await baixar(url));
    if (melhor?.bytes >= TAMANHO_BOM) break;
  }
  if (!(melhor?.bytes >= TAMANHO_BOM)) {
    const alvo = oferta.urlProduto || oferta.link;
    if (alvo) {
      const p = await previa(alvo).catch(() => ({}));
      if (p?.imagem && p.imagem !== oferta.imagem) {
        const r = await baixar(p.imagem);
        considerar(r);
        if (r) oferta.imagem = p.imagem;
      }
    }
  }
  if (melhor && melhor.bytes > atual) oferta.fotoOriginal = melhor.base64;
  oferta.fotoTentada = Boolean(melhor) || atual > 0;
  console.log(`[imagem] foto da oferta: ${bytesDe(oferta.fotoOriginal) ? `${Math.round(bytesDe(oferta.fotoOriginal) / 1024)} KB` : 'nenhuma'}`);
  return oferta;
}
