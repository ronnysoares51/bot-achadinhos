import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PASTA_DADOS = `/tmp/achadinhos-teste-clone-${process.pid}`;
process.env.ML_MATT_WORD = 'minhaetiqueta';
process.env.ML_MATT_TOOL = '999';

const { aplicarModelo, whatsParaHtml, MODELO_PADRAO } = await import('../src/formatar.js');
const { extrairDeMensagem } = await import('../src/oferta.js');
const { linkClonavel } = await import('../src/clone.js');

const o = { loja: 'mercadolivre', titulo: 'Air Fryer 4L', precoDe: 400, precoPor: 299.9, desconto: 25, link: 'https://x.y/z' };

test('modelo troca variáveis e some com linhas vazias', () => {
  const t = aplicarModelo('🔥 *{titulo}*\n~De {preco_antigo}~\nPor {preco}\nCupom: {cupom}\n\n👉 {link}', o);
  assert.match(t, /\*Air Fryer 4L\*/);
  assert.match(t, /~De R\$\s?400,00~/);
  assert.match(t, /Por R\$\s?299,90/);
  assert.doesNotMatch(t, /Cupom/); // sem cupom: a linha sai
  assert.match(t, /👉 https:\/\/x\.y\/z$/);
});

test('modelo padrão funciona com oferta mínima', () => {
  const t = aplicarModelo(MODELO_PADRAO, { loja: 'shein', titulo: 'Vestido', link: 'https://l' });
  assert.match(t, /Vestido/);
  assert.match(t, /Shein/);
  assert.doesNotMatch(t, /\{|undefined|null/);
});

test('modelo sem link (Telegram)', () => {
  assert.doesNotMatch(aplicarModelo('{titulo}\n{link}', o, { semLink: true }), /x\.y/);
});

test('marcação do WhatsApp vira HTML do Telegram, com escape', () => {
  assert.equal(whatsParaHtml('*Oi <b>* _ita_ ~ris~'), '<b>Oi &lt;b&gt;</b> <i>ita</i> <s>ris</s>');
});

test('extrai título, preços e cupom de mensagem de concorrente', () => {
  const msg = `🔥🔥 *OFERTA RELÂMPAGO* 🔥🔥
*Fone Bluetooth JBL Tune 520BT Original*
De ~R$ 349,90~
Por apenas *R$ 199,00* 😱
Cupom: JBL20
👉 https://meli.la/2Xyz`;
  const r = extrairDeMensagem(msg);
  assert.equal(r.titulo, 'Fone Bluetooth JBL Tune 520BT Original');
  assert.equal(r.precoDe, 349.9);
  assert.equal(r.precoPor, 199);
  assert.equal(r.cupom, 'JBL20');
});

test('clone recusa Shein/TikTok (link continuaria sendo do outro afiliado)', async () => {
  assert.ok(!(await linkClonavel('https://vt.tiktok.com/abc')).link);
  assert.ok(!(await linkClonavel('https://br.shein.com/p-1.html')).link);
});

test('clone de ML resolve o meli.la e só aceita página de produto', async () => {
  const ok = await linkClonavel('https://meli.la/abc', { resolver: async () => 'https://produto.mercadolivre.com.br/MLB-123-fone?matt_word=outro' });
  assert.equal(ok.loja, 'mercadolivre');
  const vazio = await linkClonavel('https://meli.la/abc', { resolver: async () => 'https://www.mercadolivre.com.br/social/fulano', social: async () => null });
  assert.ok(!vazio.link);
  const social = await linkClonavel('https://meli.la/abc', {
    resolver: async () => 'https://www.mercadolivre.com.br/social/fulano?matt_word=fulano&ref=xyz',
    social: async () => 'https://www.mercadolivre.com.br/caixa-de-som/p/MLB70102902',
  });
  assert.equal(social.link, 'https://www.mercadolivre.com.br/caixa-de-som/p/MLB70102902');
});

test('perfil social do ML: acha o produto em destaque no HTML', async () => {
  const { produtoDoHtmlSocial } = await import('../src/lojas/mlLinkbuilder.js');
  const html = '<script>{"polycards":[{"unique_id":"a","metadata":{"id":"MLB4717225295","product_id":"MLB70102902","url":"www.mercadolivre.com.br\\u002Fcaixa-de-som-sabala\\u002Fp\\u002FMLB70102902","url_fragments":"#x"}}]},{"polycards":[{"metadata":{"id":"MLB1"}}]}</script>';
  assert.equal(produtoDoHtmlSocial(html), 'https://www.mercadolivre.com.br/caixa-de-som-sabala/p/MLB70102902');
  assert.equal(produtoDoHtmlSocial('{"polycards":[{"metadata":{"id":"MLB55","product_id":"MLB99"}}]}'), 'https://www.mercadolivre.com.br/p/MLB99');
  assert.equal(produtoDoHtmlSocial('{"polycards":[{"metadata":{"id":"MLB55"}}]}'), 'https://produto.mercadolivre.com.br/MLB-55');
  assert.equal(produtoDoHtmlSocial('<html>perfil vazio</html>'), null);
});

test('clone de Shopee exige credenciais da API', async () => {
  assert.match((await linkClonavel('https://s.shopee.com.br/x')).motivo, /credenciais/);
});
