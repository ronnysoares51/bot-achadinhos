import { config } from '../config.js';
import { normalizarCookies } from './mlLinkbuilder.js';

// Lê título, foto e preço públicos da página do produto (metatags Open Graph / JSON-LD).
// Pode falhar quando a loja bloqueia robôs (comum no TikTok Shop e na Shein): aí o admin completa à mão.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  return (html.match(re) || html.match(re2) || [])[1];
}

function decodificar(s) {
  return s
    ?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

export function lerPrevia(html) {
  const titulo = decodificar(meta(html, 'og:title') || (html.match(/<title>([^<]+)<\/title>/i) || [])[1]);
  const imagem = decodificar(meta(html, 'og:image'));
  let preco = meta(html, 'product:price:amount') || meta(html, 'og:price:amount');
  if (!preco) {
    const ld = html.match(/"price"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?/);
    preco = ld?.[1];
  }
  return {
    titulo: titulo || null,
    imagem: imagem || null,
    precoPor: preco ? Number(String(preco).replace(',', '.')) : null,
  };
}

const ML = /(^|\.)(mercadolivre\.com\.br|mercadolibre\.com|mercadolivre\.com|meli\.la|mlb\.am)$/i;
const BLOQUEIO_ML = /account-verification|suspicious-traffic/i;
let avisouBloqueioMl = false;

/** Mercado Livre manda robô anônimo para uma página de "verificação de conta" (sem foto/título/preço).
 *  Com os cookies da conta de afiliado conectada o acesso volta ao normal. */
function cabecalhosPara(url) {
  const h = { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9', Accept: 'text/html,application/xhtml+xml' };
  try {
    if (ML.test(new URL(url).hostname) && config.mercadolivre?.cookies) {
      const ck = normalizarCookies(config.mercadolivre.cookies);
      if (ck) h.Cookie = ck;
    }
  } catch {
    /* url inválida: segue sem cookie */
  }
  return h;
}

export async function buscarPrevia(url, { timeoutMs = 12000 } = {}) {
  try {
    const resp = await fetch(url, { headers: cabecalhosPara(url), redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    const final = resp.url || url;
    if (BLOQUEIO_ML.test(final)) {
      if (!avisouBloqueioMl) {
        avisouBloqueioMl = true;
        console.warn('[previa] Mercado Livre bloqueou a leitura da página (verificação de conta). Atualize os cookies em Minhas lojas; sem isso a foto sai pequena.');
      }
      return { urlFinal: url, bloqueada: true };
    }
    if (!resp.ok) return { urlFinal: final };
    const html = await resp.text();
    return { ...lerPrevia(html), urlFinal: final };
  } catch {
    return { urlFinal: url };
  }
}

/** Segue redirecionamentos de links curtos e devolve a URL final. */
export async function urlFinal(url) {
  try {
    const resp = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
    return resp.url || url;
  } catch {
    return url;
  }
}
