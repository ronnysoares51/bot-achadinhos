import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pasta = `/tmp/achadinhos-teste-disparo-${process.pid}`;
fs.rmSync(pasta, { recursive: true, force: true });
process.env.PASTA_DADOS = pasta;
process.env.TELEGRAM_BOT_TOKEN = 'teste';

const enviados = [];
globalThis.fetch = async (url, op) => {
  const corpo = JSON.parse(op.body);
  enviados.push({ metodo: String(url).split('/').pop(), chat: corpo.chat_id, foto: Boolean(corpo.photo), texto: corpo.caption || corpo.text });
  return { ok: true, status: 200, json: async () => ({ ok: true, result: {} }) };
};

const aut = await import('../src/automacoes.js');
const fila = await import('../src/fila.js');
const { publicarNaAutomacao, publicar } = await import('../src/publicar.js');

test('cada automação manda só o que combina, para os próprios canais, com o próprio formato', async () => {
  const casa = aut.salvarAutomacao({ nome: 'Casa', destinos: { telegram: '-100casa' }, fontes: ['manual'], incluir: 'panela, air fryer', formato: 'texto', modelo: 'CASA: {titulo} {preco}' });
  const moda = aut.salvarAutomacao({ nome: 'Moda', destinos: { telegram: '-100moda' }, fontes: ['manual'], lojas: ['shein'] });
  fila.adicionar({ loja: 'shopee', titulo: 'Air Fryer 4L', precoPor: 299, chave: 'af', link: 'https://s.shopee.com.br/af', imagem: 'https://img/af.jpg' });
  fila.adicionar({ loja: 'shein', titulo: 'Vestido Floral', precoPor: 79.9, chave: 'vf', link: 'https://br.shein.com/vf', imagem: 'https://img/vf.jpg' });

  for (const a of aut.listarAutomacoes()) {
    const oferta = fila.listar().find((o) => aut.aceita(o, a).ok);
    await publicarNaAutomacao(oferta, a);
  }
  const paraCasa = enviados.find((e) => e.chat === '-100casa');
  const paraModa = enviados.find((e) => e.chat === '-100moda');
  assert.equal(paraCasa.metodo, 'sendMessage', 'formato só texto');
  assert.match(paraCasa.texto, /CASA: Air Fryer 4L R\$\s?299,00/);
  assert.equal(paraModa.metodo, 'sendPhoto');
  assert.match(paraModa.texto, /Vestido Floral/);
  assert.equal(enviados.length, 2, 'nenhuma oferta foi para o canal errado');

  // depois de enviadas, nenhuma automação repete
  for (const a of aut.listarAutomacoes()) assert.equal(fila.listar().find((o) => aut.aceita(o, a).ok), undefined);
  fila.limparFila(aut.listarAutomacoes(), aut.aceita);
  assert.equal(fila.listar().length, 0, 'fila limpa quando todas enviaram');
  assert.equal(aut.obterAutomacao(casa.id).estado.enviadosDia, 1);
  assert.equal(aut.obterAutomacao(moda.id).estado.total, 1);
});

test('postar agora manda para todas as automações ligadas, sem repetir canal', async () => {
  enviados.length = 0;
  aut.salvarAutomacao({ nome: 'Dupla', destinos: { telegram: '-100casa' }, fontes: ['manual'] });
  await publicar({ id: 'z', loja: 'shopee', titulo: 'Panela', precoPor: 50, chave: 'pn', link: 'https://s.shopee.com.br/pn' });
  const chats = enviados.map((e) => e.chat).sort();
  assert.deepEqual(chats, ['-100casa', '-100moda']);
});
