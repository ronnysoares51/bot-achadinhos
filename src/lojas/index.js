// Identifica a loja pelo domínio do link.
const REGRAS = [
  ['mercadolivre', /(^|\.)(mercadolivre\.com\.br|mercadolibre\.com|mercadolivre\.com|meli\.la|mlb\.am)$/],
  ['shopee', /(^|\.)(shopee\.com\.br|shope\.ee|shp\.ee)$/],
  ['shein', /(^|\.)(shein\.com|shein\.com\.br|sheinbr\.com|onelink\.shein\.com|api-shein\.shein\.com)$/],
  ['tiktokshop', /(^|\.)(tiktok\.com|tiktokshop\.com|vt\.tiktok\.com|vm\.tiktok\.com)$/],
];

export const NOMES = {
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
  shein: 'Shein',
  tiktokshop: 'TikTok Shop',
};

export function detectarLoja(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [loja, re] of REGRAS) if (re.test(host)) return loja;
  return null;
}

/** Extrai todos os links http(s) de um texto. */
export function extrairLinks(texto) {
  return (String(texto).match(/https?:\/\/[^\s<>"')]+/gi) || []).map((l) => l.replace(/[.,;!?]+$/, ''));
}
