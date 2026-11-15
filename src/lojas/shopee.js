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

async function graphql(query) {
  if (!shopeeConfigurada()) throw new Error('Credenciais da Shopee (SHOPEE_APP_ID e SHOPEE_SECRET) não preenchidas.');
  const { appId, secret, apiUrl } = config.shopee;
  // A Open API da Shopee não aceita variáveis GraphQL: os valores vão escritos na query.
  const payload = JSON.stringify({ query });
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
    const e = json.errors?.[0];
    throw new Error(`Shopee API: ${e?.message || resp.status}${e?.extensions?.code ? ` (código ${e.extensions.code})` : ''}`);
  }
  return json.data;
}

/** Gera o link curto de afiliado (s.shopee.com.br/...) a partir de qualquer link da Shopee. */
export async function gerarLinkShopee(url) {
  const data = await graphql(
    `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(url)}, subIds: [${JSON.stringify(config.shopee.subId)}] }) { shortLink } }`,
  );
  const link = data?.generateShortLink?.shortLink;
  if (!link) throw new Error('A Shopee não devolveu o link de afiliado.');
  return link;
}

const CAMPOS = 'itemId shopId productName priceMin priceMax priceDiscountRate commissionRate sales ratingStar imageUrl productLink offerLink';

/** Busca ofertas por palavra-chave. sortType 2 = mais vendidos. */
export async function buscarOfertasShopee(palavra, { limite = 20, sortType = 2 } = {}) {
  const data = await graphql(
    `{ productOfferV2(keyword: ${JSON.stringify(palavra)}, sortType: ${Number(sortType)}, page: 1, limit: ${Number(limite)}) { nodes { ${CAMPOS} } } }`,
  );
  return (data?.productOfferV2?.nodes || []).map(nodeParaOferta);
}

/** Dados de um produto específico a partir da URL (shopId/itemId). */
export async function produtoShopee(url) {
  const ids = idsDaUrl(url);
  if (!ids) return null;
  const data = await graphql(`{ productOfferV2(shopId: ${Number(ids.shopId)}, itemId: ${Number(ids.itemId)}) { nodes { ${CAMPOS} } } }`);
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
