import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

process.env.PASTA_DADOS = `/tmp/achadinhos-teste-oferta-${process.pid}`;

const { lerPreco, lerMensagemAdmin, converterLink } = await import('../src/oferta.js');
const { formatarWhatsApp, formatarTelegram } = await import('../src/formatar.js');
const fila = await import('../src/fila.js');
const { escolherOfertas } = await import('../src/agendador.js');

test('lê preços em formato brasileiro', () => {
  assert.equal(lerPreco('R$ 1.299,90'), 1299.9);
  assert.equal(lerPreco('89,9'), 89.9);
  assert.equal(lerPreco('49.90'), 49.9);
  assert.equal(lerPreco(''), null);
  assert.equal(lerPreco('grátis'), null);
});

test('lê a mensagem do admin com campos opcionais', () => {
  const m = lerMensagemAdmin('https://vt.tiktok.com/ZSabc/\ntitulo: Garrafa Térmica\nde: 99,90\npor: 39,90\ncupom: TIK10');
  assert.equal(m.link, 'https://vt.tiktok.com/ZSabc/');
  assert.equal(m.titulo, 'Garrafa Térmica');
  assert.equal(m.precoDe, 99.9);
  assert.equal(m.precoPor, 39.9);
  assert.equal(m.cupom, 'TIK10');
});

test('TikTok Shop e Shein mantêm o link de afiliado colado', async () => {
  assert.deepEqual(await converterLink('https://vt.tiktok.com/ZSabc/'), { loja: 'tiktokshop', link: 'https://vt.tiktok.com/ZSabc/', urlProduto: 'https://vt.tiktok.com/ZSabc/' });
  assert.equal((await converterLink('https://br.shein.com/p-1.html')).loja, 'shein');
  await assert.rejects(converterLink('https://amazon.com.br/x'), /Loja não reconhecida/);
});

const oferta = { loja: 'shopee', titulo: 'Fone <Bluetooth>', precoDe: 100, precoPor: 49.9, desconto: 50, cupom: 'ACHADO', link: 'https://s.shopee.com.br/x' };

test('formata para WhatsApp', () => {
  const t = formatarWhatsApp(oferta);
  assert.match(t, /\*Fone <Bluetooth>\*/);
  assert.match(t, /~De R\$\s?100,00~/);
  assert.match(t, /Por R\$\s?49,90/);
  assert.match(t, /50% OFF/);
  assert.match(t, /Cupom: \*ACHADO\*/);
  assert.match(t, /https:\/\/s\.shopee\.com\.br\/x/);
});

test('formata para Telegram escapando HTML', () => {
  const t = formatarTelegram(oferta);
  assert.match(t, /Fone &lt;Bluetooth&gt;/);
  assert.match(t, /<b>ACHADO<\/b>/);
  assert.doesNotMatch(t, /s\.shopee\.com\.br/); // no Telegram o link vai no botão
});

test('fila: adiciona, evita duplicada, marca postada e conta o dia', () => {
  fs.rmSync(process.env.PASTA_DADOS, { recursive: true, force: true });
  const item = fila.adicionar({ ...oferta, chave: 'shopee:1' });
  assert.ok(item.id);
  assert.equal(fila.adicionar({ ...oferta, chave: 'shopee:1' }), null);
  assert.equal(fila.listar().length, 1);
  fila.marcarPostada(item, '2026-11-14');
  assert.equal(fila.listar().length, 0);
  assert.equal(fila.jaPostada('shopee:1'), true);
  assert.equal(fila.postsHoje('2026-11-14'), 1);
  assert.equal(fila.postsHoje('2026-11-15'), 0);
});

test('busca automática filtra por desconto e nota', () => {
  const r = escolherOfertas(
    [
      { link: 'a', desconto: 50, nota: 4.9, comissao: 0.1 },
      { link: 'b', desconto: 10, nota: 4.9 },
      { link: 'c', desconto: 60, nota: 3.0 },
      { link: 'd', desconto: 40, nota: 4.7, comissao: 0.2 },
    ],
    { descontoMin: 30, notaMin: 4.5 },
  );
  assert.deepEqual(r.map((o) => o.link), ['d', 'a']);
});

test('clone: frase de chamada em maiúsculas não vira o título do produto', async () => {
  const { extrairDeMensagem } = await import('../src/oferta.js');
  const msg = '🚨🔥\nACHADINHO IMPERDÍVEL!\n\n😍 OLHA O PRECINHO QUE APARECEU\n\n💥 OLHA ESSA OPORTUNIDADE!\n\n❌ De: R$ 145,00\n✅ AGORA POR APENAS R$ 137,84\n\nCreme Facial Medicube Collagen\nhttps://meli.la/abc';
  const r = extrairDeMensagem(msg);
  if (r.titulo !== 'Creme Facial Medicube Collagen') throw new Error(`título errado: ${r.titulo}`);
});

test('clone: prefere o nome do produto à chamada em maiúsculas', async () => {
  const { extrairDeMensagem } = await import('../src/oferta.js');
  const r = extrairDeMensagem('FAROL AMARELADO E FRACO FICA NO PASSADO\n\nKit Polidor de Farol Automotivo 3M\nR$ 49,90\nhttps://meli.la/x');
  if (r.titulo !== 'Kit Polidor de Farol Automotivo 3M') throw new Error(`título errado: ${r.titulo}`);
});

test('clone: limite por hora é de cada grupo (um grupo cheio não bloqueia os outros)', async () => {
  const { dentroDoLimite } = await import('../src/clone.js');
  if (!dentroDoLimite('grupoB@g.us', Date.now(), 1)) throw new Error('grupo novo deveria estar liberado');
});

test('automação: categoria também vem do texto original do clone', async () => {
  const { aceita, normalizar } = await import('../src/automacoes.js');
  const a = normalizar({ fontes: ['clone'], categorias: ['automotivo'] });
  const o = { fonte: 'clone', loja: 'shopee', titulo: 'ISSO AQUI QUE É DETALHAMENTO DE VERDADE!', textoOrigem: 'Cera para carro com brilho', chave: 'k1' };
  if (!aceita(o, a).ok) throw new Error('deveria aceitar pela categoria do texto');
});
