import { config } from '../config.js';

// Parâmetros de rastreio de terceiros: removidos para não carregar a comissão de outro afiliado.
const RASTREIO = /^(utm_|af_|aff_|matt_|mmp_|sp_atk$|xptdk$|smtt$|ref$|forceInApp$)/;

export function limparUrl(url) {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (RASTREIO.test(k)) u.searchParams.delete(k);
  return u.toString();
}

/**
 * Mercado Livre não tem API pública de afiliados.
 * - Link meli.la (gerado no Linkbuilder do painel de afiliados) é usado como está: é o jeito mais seguro.
 * - Link comum de produto recebe matt_word/matt_tool (confira no painel se as vendas estão sendo creditadas).
 */
export function linkMercadoLivre(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  if (host === 'meli.la') return url;
  const { mattWord, mattTool } = config.mercadolivre;
  if (!mattWord || !mattTool) {
    throw new Error('Mercado Livre: cole um link meli.la do Linkbuilder ou preencha ML_MATT_WORD e ML_MATT_TOOL.');
  }
  const u = new URL(limparUrl(url));
  u.searchParams.set('matt_word', mattWord);
  u.searchParams.set('matt_tool', mattTool);
  return u.toString();
}

/**
 * Shein não tem API aberta de afiliados no Brasil: o link de afiliado sai do app/portal da Shein.
 * O link colado é mantido; se SHEIN_PARAMETROS estiver preenchido, os parâmetros são acrescentados.
 */
export function linkShein(url) {
  if (!config.shein.parametros) return url;
  const u = new URL(url);
  for (const [k, v] of new URLSearchParams(config.shein.parametros)) u.searchParams.set(k, v);
  return u.toString();
}

/**
 * TikTok Shop: o link de afiliado é gerado no app (Afiliado > Produtos > Compartilhar) e não pode ser
 * criado por API pública no Brasil. O link colado é mantido como está.
 */
export function linkTikTokShop(url) {
  return url;
}
