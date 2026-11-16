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
