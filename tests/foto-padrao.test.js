import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PASTA_DADOS = `/tmp/achadinhos-teste-foto-${process.pid}`;

const { garantirFoto, TAMANHO_BOM } = await import('../src/imagem.js');
const { aplicarModelo, MODELO_PADRAO } = await import('../src/formatar.js');

const grande = { base64: Buffer.alloc(TAMANHO_BOM + 1000, 1).toString('base64'), bytes: TAMANHO_BOM + 1000 };
const pequena = Buffer.alloc(3000, 2).toString('base64');

test('miniatura da prévia é trocada pela foto grande da oferta', async () => {
  const o = { imagem: 'https://x/foto.jpg', fotoOriginal: pequena, link: 'https://l' };
  await garantirFoto(o, { baixar: async () => grande, previa: async () => ({}) });
  assert.equal(o.fotoOriginal, grande.base64);
});

test('sem imagem na oferta, pega a foto da página do produto', async () => {
  const o = { link: 'https://l' };
  await garantirFoto(o, { baixar: async (u) => (u === 'https://x/og.jpg' ? grande : null), previa: async () => ({ imagem: 'https://x/og.jpg' }) });
  assert.equal(o.fotoOriginal, grande.base64);
});

test('mantém a miniatura se não achar nada melhor e não lança erro', async () => {
  const o = { fotoOriginal: pequena, link: 'https://l' };
  await garantirFoto(o, { baixar: async () => null, previa: async () => ({}) });
  assert.equal(o.fotoOriginal, pequena);
});

test('modelo padrão: mostra o preço mesmo sem desconto', () => {
  const t = aplicarModelo(MODELO_PADRAO, { loja: 'shopee', titulo: 'Fone', precoPor: 49.9, link: 'https://l' });
  assert.match(t, /Por R\$\s?49,90/);
  assert.doesNotMatch(t, /Confira o preço/);
});

test('modelo padrão: sem preço avisa para conferir no link', () => {
  const t = aplicarModelo(MODELO_PADRAO, { loja: 'tiktokshop', titulo: 'Garrafa', link: 'https://l' });
  assert.match(t, /Confira o preço atual no link/);
  assert.match(t, /https:\/\/l/);
});

test('modelo padrão: nota e vendidos aparecem separados', () => {
  const t = aplicarModelo(MODELO_PADRAO, { loja: 'shopee', titulo: 'Fone', precoPor: 10, nota: 4.8, link: 'https://l' });
  assert.match(t, /Nota 4,8/);
  assert.doesNotMatch(t, /vendidos/);
});

// ------------------------------------------------------------------ Mercado Livre

const { fotosGrandesMl, codigoMl } = await import('../src/imagem.js');
const { fotoGrandeDaPrevia } = await import('../src/destinos/whatsapp.js');

test('ML: miniatura do mlstatic vira a foto grande, em JPG', () => {
  const urls = fotosGrandesMl('https://http2.mlstatic.com/D_Q_NP_689232-MLB74221357183_012024-R.webp');
  assert.equal(urls[0], 'https://http2.mlstatic.com/D_NQ_NP_2X_689232-MLB74221357183_012024-F.jpg');
  assert.equal(urls[1], 'https://http2.mlstatic.com/D_NQ_NP_689232-MLB74221357183_012024-O.jpg');
  assert.deepEqual(fotosGrandesMl('https://x/foto.jpg'), []);
});

test('ML: acha o código do anúncio e do catálogo no link', () => {
  assert.deepEqual(codigoMl('https://produto.mercadolivre.com.br/MLB-3456789012-fone-bluetooth-_JM'), { tipo: 'items', id: 'MLB3456789012' });
  assert.deepEqual(codigoMl('https://www.mercadolivre.com.br/fone/p/MLB19876543?pdp_filters=item_id%3AMLB3456789012'), { tipo: 'products', id: 'MLB19876543' });
  assert.equal(codigoMl('https://meli.la/2AbCdEf'), null);
});

test('ML clonado com só a miniatura da prévia: troca pela foto grande da API do ML', async () => {
  const o = { loja: 'mercadolivre', fotoOriginal: pequena, link: 'https://meli.la/xyz', urlProduto: 'https://produto.mercadolivre.com.br/MLB-3456789012-fone' };
  const pedidas = [];
  await garantirFoto(o, {
    baixar: async (u) => {
      pedidas.push(u);
      return u.includes('2X_') ? grande : null;
    },
    previa: async () => ({}),
    apiMl: async (link) => (link.includes('MLB-3456789012') ? ['https://http2.mlstatic.com/D_123-MLB3456789012_112026-O.jpg'] : []),
  });
  assert.equal(o.fotoOriginal, grande.base64);
  assert.equal(pedidas[0], 'https://http2.mlstatic.com/D_NQ_NP_2X_123-MLB3456789012_112026-F.jpg');
});

test('ML: imagem pequena da oferta é trocada pela versão grande do mesmo arquivo', async () => {
  const o = { loja: 'mercadolivre', imagem: 'https://http2.mlstatic.com/D_123-MLB1_112026-I.jpg', link: 'https://l' };
  await garantirFoto(o, { baixar: async (u) => (u.endsWith('-F.jpg') ? grande : null), previa: async () => ({}), apiMl: async () => [] });
  assert.equal(o.fotoOriginal, grande.base64);
});

test('prévia de link do WhatsApp: acha a foto grande guardada no servidor', () => {
  const chave = new Uint8Array(32).fill(7);
  assert.deepEqual(fotoGrandeDaPrevia({ thumbnailDirectPath: '/o1/v/t62/abc', mediaKey: chave }), { directPath: '/o1/v/t62/abc', mediaKey: chave, url: undefined });
  assert.equal(fotoGrandeDaPrevia({ jpegThumbnail: new Uint8Array(10) }), null);
});
