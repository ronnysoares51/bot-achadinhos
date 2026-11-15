import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Shopee Affiliate Open API (GraphQL).
 * Assinatura = SHA256(AppId + Timestamp + Payload + Secret) em hexadecimal.
 * Cabeçalho: Authorization: SHA256 Credential=<AppId>, Timestamp=<unix>, Signature=<hash>
 */
export function assinar(appId, timestamp, payload, secret) {
  return crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`, 'utf8').digest('hex');
}

export function shopeeConfigurada() {
  return Boolean(config.shopee.appId && config.shopee.secret);
}

async function graphql(query, variables = {}) {
  if (!shopeeConfigurada()) throw new Error('Credenciais da Shopee (SHOPEE_APP_ID e SHOPEE_SECRET) não preenchidas.');
  const { appId, secret, apiUrl } = config.shopee;
  const payload = JSON.stringify({ query, variables });
  const ts = Math.floor(Date.now() / 1000);
  const resp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${assinar(appId, ts, payload, secret)}`,
    },
    body: payload,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || json.errors?.length) {
    throw new Error(`Shopee API: ${json.errors?.[0]?.message || resp.status}`);
  }
  return json.data;
}

/** Gera o link curto de afiliado (s.shopee.com.br/...) a partir de qualquer link da Shopee. */
export async function gerarLinkShopee(url) {
  const data = await graphql(
    'mutation($url: String!, $subIds: [String]) { generateShortLink(input: { originUrl: $url, subIds: $subIds }) { shortLink } }',
    { url, subIds: [config.shopee.subId] },
  );
  const link = data?.generateShortLink?.shortLink;
  if (!link) throw new Error('A Shopee não devolveu o link de afiliado.');
  return link;
}

const CAMPOS = 'itemId shopId productName priceMin priceMax priceDiscountRate imageUrl offerLink productLink commissionRate ratingStar sales shopName';

/** Busca ofertas por palavra-chave. sortType 2 = mais vendidos. */
export async function buscarOfertasShopee(palavra, { limite = 20, sortType = 2 } = {}) {
  const data = await graphql(
    `query($kw: String, $sort: Int, $limit: Int) { productOfferV2(keyword: $kw, sortType: $sort, page: 1, limit: $limit) { nodes { ${CAMPOS} } } }`,
    { kw: palavra, sort: sortType, limit: limite },
  );
  return (data?.productOfferV2?.nodes || []).map(nodeParaOferta);
}

/** Dados de um produto específico a partir da URL (shopId/itemId). */
export async function produtoShopee(url) {
  const ids = idsDaUrl(url);
  if (!ids) return null;
  const data = await graphql(
    `query($shop: Int64, $item: Int64) { productOfferV2(shopId: $shop, itemId: $item) { nodes { ${CAMPOS} } } }`,
    { shop: ids.shopId, item: ids.itemId },
  );
  const node = data?.productOfferV2?.nodes?.[0];
  return node ? nodeParaOferta(node) : null;
}

export function idsDaUrl(url) {
  const m = String(url).match(/i\.(\d+)\.(\d+)/) || String(url).match(/product\/(\d+)\/(\d+)/);
  return m ? { shopId: Number(m[1]), itemId: Number(m[2]) } : null;
}

export function nodeParaOferta(n) {
  const por = Number(n.priceMin) || null;
  const desconto = Number(n.priceDiscountRate) || 0;
  const de = por && desconto > 0 ? Math.round((por / (1 - desconto / 100)) * 100) / 100 : null;
  return {
    loja: 'shopee',
    titulo: n.productName,
    precoPor: por,
    precoDe: de,
    desconto,
    imagem: n.imageUrl,
    link: n.offerLink,
    linkOriginal: n.productLink,
    nota: Number(n.ratingStar) || null,
    vendas: Number(n.sales) || null,
    comissao: Number(n.commissionRate) || null,
    chave: `shopee:${n.itemId}`,
  };
}
