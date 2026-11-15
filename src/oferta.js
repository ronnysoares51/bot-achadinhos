import { detectarLoja, extrairLinks } from './lojas/index.js';
import { gerarLinkShopee, produtoShopee, shopeeConfigurada } from './lojas/shopee.js';
import { linkMercadoLivre, linkShein, linkTikTokShop, limparUrl } from './lojas/outras.js';
import { buscarPrevia, urlFinal } from './lojas/previa.js';

/** "R$ 1.299,90" -> 1299.9 */
export function lerPreco(txt) {
  if (txt === undefined || txt === null || txt === '') return null;
  let s = String(txt).replace(/[^\d.,]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Lê a mensagem do admin: o primeiro link é o produto e as linhas opcionais completam os dados.
 *   titulo: Fone Bluetooth X
 *   de: 199,90
 *   por: 89,90
 *   cupom: ACHADO10
 *   obs: Frete grátis
 */
export function lerMensagemAdmin(texto) {
  const [link] = extrairLinks(texto);
  const campos = {};
  for (const linha of String(texto).split('\n')) {
    const m = linha.match(/^\s*(titulo|título|de|por|cupom|obs|foto)\s*:\s*(.+)$/i);
    if (m) campos[m[1].toLowerCase().replace('título', 'titulo')] = m[2].trim();
  }
  return {
    link: link || null,
    titulo: campos.titulo || null,
    precoDe: lerPreco(campos.de),
    precoPor: lerPreco(campos.por),
    cupom: campos.cupom || null,
    obs: campos.obs || null,
    imagem: campos.foto || null,
  };
}

const ENCURTADOS = /^(s\.shopee\.com\.br|shope\.ee|shp\.ee|vt\.tiktok\.com|vm\.tiktok\.com|mercadolivre\.com|mlb\.am)$/;

/** Converte o link para o link de afiliado da loja certa. */
export async function converterLink(url) {
  let alvo = url;
  const host = new URL(url).hostname.replace(/^www\./, '');
  const loja = detectarLoja(url);
  if (!loja) throw new Error('Loja não reconhecida. Aceitas: Mercado Livre, Shopee, Shein e TikTok Shop.');

  // Link curto de outra pessoa (Shopee/ML) pode carregar o rastreio dela: expandimos antes.
  // TikTok Shop é mantido como está, porque o link curto do app já é o seu link de afiliado.
  if (ENCURTADOS.test(host) && loja !== 'tiktokshop') alvo = await urlFinal(url);

  switch (loja) {
    case 'shopee':
      return { loja, link: await gerarLinkShopee(limparUrl(alvo)), urlProduto: alvo };
    case 'mercadolivre':
      return { loja, link: linkMercadoLivre(host === 'meli.la' ? url : alvo), urlProduto: alvo };
    case 'shein':
      return { loja, link: linkShein(url), urlProduto: alvo };
    case 'tiktokshop':
      return { loja, link: linkTikTokShop(url), urlProduto: url };
    default:
      throw new Error('Loja não suportada.');
  }
}

/** Monta a oferta completa a partir da mensagem do admin. */
export async function montarOferta(texto) {
  const manual = lerMensagemAdmin(texto);
  if (!manual.link) throw new Error('Mande um link de produto.');
  const { loja, link, urlProduto } = await converterLink(manual.link);

  let auto = {};
  if (loja === 'shopee' && shopeeConfigurada()) {
    auto = (await produtoShopee(urlProduto).catch(() => null)) || {};
  }
  if (!auto.titulo) auto = { ...(await buscarPrevia(urlProduto)), ...auto };

  const precoPor = manual.precoPor ?? auto.precoPor ?? null;
  const precoDe = manual.precoDe ?? auto.precoDe ?? null;
  const desconto = precoDe && precoPor && precoDe > precoPor ? Math.round((1 - precoPor / precoDe) * 100) : null;

  return {
    loja,
    titulo: manual.titulo || auto.titulo || 'Achadinho imperdível',
    precoDe,
    precoPor,
    desconto,
    cupom: manual.cupom,
    obs: manual.obs,
    imagem: manual.imagem || auto.imagem || null,
    link,
    chave: auto.chave || `${loja}:${urlProduto.split('?')[0]}`,
    criadaEm: new Date().toISOString(),
  };
}
