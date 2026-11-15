import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ML_MATT_WORD = 'minhaetiqueta';
process.env.ML_MATT_TOOL = '12345678';
process.env.SHEIN_PARAMETROS = 'url_from=meuid';
process.env.PASTA_DADOS = `/tmp/achadinhos-teste-${process.pid}`;

const { detectarLoja, extrairLinks } = await import('../src/lojas/index.js');
const { linkMercadoLivre, linkShein, linkTikTokShop, limparUrl } = await import('../src/lojas/outras.js');
const { assinar, idsDaUrl, nodeParaOferta } = await import('../src/lojas/shopee.js');
const { lerPrevia } = await import('../src/lojas/previa.js');

test('detecta as 4 lojas', () => {
  assert.equal(detectarLoja('https://produto.mercadolivre.com.br/MLB-123-fone'), 'mercadolivre');
  assert.equal(detectarLoja('https://meli.la/2AbCdE'), 'mercadolivre');
  assert.equal(detectarLoja('https://shopee.com.br/Fone-i.111.222'), 'shopee');
  assert.equal(detectarLoja('https://s.shopee.com.br/abc'), 'shopee');
  assert.equal(detectarLoja('https://br.shein.com/Vestido-p-1234.html'), 'shein');
  assert.equal(detectarLoja('https://onelink.shein.com/xyz'), 'shein');
  assert.equal(detectarLoja('https://vt.tiktok.com/ZSabc/'), 'tiktokshop');
  assert.equal(detectarLoja('https://www.tiktok.com/view/product/1729'), 'tiktokshop');
  assert.equal(detectarLoja('https://amazon.com.br/x'), null);
  assert.equal(detectarLoja('não é link'), null);
});

test('não confunde domínio parecido', () => {
  assert.equal(detectarLoja('https://shopee.com.br.golpe.xyz/a'), null);
  assert.equal(detectarLoja('https://fakeshein.com/a'), null);
});

test('extrai links de um texto', () => {
  assert.deepEqual(extrairLinks('olha https://meli.la/abc. e https://vt.tiktok.com/x!'), ['https://meli.la/abc', 'https://vt.tiktok.com/x']);
});

test('Mercado Livre: meli.la fica igual, link comum ganha matt_word/matt_tool e perde rastreio alheio', () => {
  assert.equal(linkMercadoLivre('https://meli.la/2AbCdE'), 'https://meli.la/2AbCdE');
  const u = new URL(linkMercadoLivre('https://produto.mercadolivre.com.br/MLB-1?matt_word=outro&utm_source=x&cor=azul'));
  assert.equal(u.searchParams.get('matt_word'), 'minhaetiqueta');
  assert.equal(u.searchParams.get('matt_tool'), '12345678');
  assert.equal(u.searchParams.get('utm_source'), null);
  assert.equal(u.searchParams.get('cor'), 'azul');
});

test('Shein acrescenta parâmetros configurados; TikTok mantém o link', () => {
  assert.equal(new URL(linkShein('https://br.shein.com/p-1.html')).searchParams.get('url_from'), 'meuid');
  assert.equal(linkTikTokShop('https://vt.tiktok.com/ZSabc/'), 'https://vt.tiktok.com/ZSabc/');
});

test('limparUrl remove parâmetros de afiliado de terceiros', () => {
  assert.equal(limparUrl('https://shopee.com.br/a-i.1.2?sp_atk=x&smtt=y&tamanho=M'), 'https://shopee.com.br/a-i.1.2?tamanho=M');
});

test('assinatura da Shopee = sha256(appId+ts+payload+secret)', () => {
  // valor calculado à parte: echo -n '1231700000000{"q":1}segredo' | sha256sum
  assert.equal(assinar('123', 1700000000, '{"q":1}', 'segredo'), 'c3a2c1943fb2fb053195e61c2cc6983211ec44a9de0a313afffecf8384a89066');
});

test('ids da URL da Shopee', () => {
  assert.deepEqual(idsDaUrl('https://shopee.com.br/Fone-Bluetooth-i.334455.998877?x=1'), { shopId: 334455, itemId: 998877 });
  assert.deepEqual(idsDaUrl('https://shopee.com.br/product/10/20'), { shopId: 10, itemId: 20 });
  assert.equal(idsDaUrl('https://shopee.com.br/'), null);
});

test('converte nó da API da Shopee em oferta com preço "de"', () => {
  const o = nodeParaOferta({ itemId: 9, productName: 'Fone', priceMin: '50', priceDiscountRate: 50, offerLink: 'https://s.shopee.com.br/x', ratingStar: '4.8', commissionRate: '0.1' });
  assert.equal(o.precoPor, 50);
  assert.equal(o.precoDe, 100);
  assert.equal(o.chave, 'shopee:9');
});

test('prévia lê og:title, og:image e preço', () => {
  const html = `<html><head><meta property="og:title" content="Tênis &amp; Meia"><meta content="https://img/x.jpg" property="og:image">
  <meta property="product:price:amount" content="129.90"></head></html>`;
  assert.deepEqual(lerPrevia(html), { titulo: 'Tênis & Meia', imagem: 'https://img/x.jpg', precoPor: 129.9 });
  assert.equal(lerPrevia('<script>{"price": "49,90"}</script>').precoPor, 49.9);
});

test('Shopee: query sem variáveis GraphQL e com valores escapados', async () => {
  process.env.SHOPEE_APP_ID = '123';
  process.env.SHOPEE_SECRET = 's';
  const { config } = await import('../src/config.js');
  config.shopee.appId = '123';
  config.shopee.secret = 's';
  const corpos = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, op) => {
    corpos.push(JSON.parse(op.body));
    return { ok: true, json: async () => ({ data: { productOfferV2: { nodes: [] }, generateShortLink: { shortLink: 'https://s.shopee.com.br/ok' } } }) };
  };
  try {
    const { buscarOfertasShopee, gerarLinkShopee } = await import('../src/lojas/shopee.js');
    await buscarOfertasShopee('fone "bluetooth"');
    assert.equal(await gerarLinkShopee('https://shopee.com.br/a-i.1.2'), 'https://s.shopee.com.br/ok');
  } finally {
    globalThis.fetch = original;
  }
  for (const c of corpos) assert.deepEqual(Object.keys(c), ['query']);
  assert.match(corpos[0].query, /keyword: "fone \\"bluetooth\\""/);
  assert.doesNotMatch(corpos[0].query, /shopName/);
});
