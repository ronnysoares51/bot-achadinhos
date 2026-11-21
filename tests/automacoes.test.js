import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pasta = `/tmp/achadinhos-teste-aut-${process.pid}`;
fs.rmSync(pasta, { recursive: true, force: true });
process.env.PASTA_DADOS = pasta;

const aut = await import('../src/automacoes.js');
const fila = await import('../src/fila.js');
const { horaLocal, diaSemanaLocal, diaLocal } = await import('../src/publicar.js');

const base = (extra = {}) => aut.normalizar({ nome: 'Teste', destinos: { telegram: ['@canal'] }, fontes: ['manual', 'clone'], dias: [0, 1, 2, 3, 4, 5, 6], ...extra });
const oferta = (extra = {}) => ({ loja: 'shopee', titulo: 'Fone Bluetooth Sem Fio', precoPor: 59.9, desconto: 40, chave: 'k1', fonte: 'manual', ...extra });

test('filtros: loja, preço, desconto, palavras e fonte', () => {
  assert.ok(aut.aceita(oferta(), base()).ok);
  assert.equal(aut.aceita(oferta(), base({ lojas: ['mercadolivre'] })).motivo, 'loja fora do filtro');
  assert.equal(aut.aceita(oferta(), base({ precoMax: 50 })).motivo, 'preço acima do máximo');
  assert.equal(aut.aceita(oferta(), base({ precoMin: 100 })).motivo, 'preço abaixo do mínimo');
  assert.equal(aut.aceita(oferta(), base({ descontoMin: 50 })).motivo, 'desconto abaixo do mínimo');
  assert.ok(aut.aceita(oferta(), base({ incluir: ['bluetooth'] })).ok);
  assert.ok(aut.aceita(oferta({ titulo: 'Fone ÁUDIO' }), base({ incluir: ['audio'] })).ok, 'ignora acentos');
  assert.equal(aut.aceita(oferta(), base({ incluir: ['air fryer'] })).motivo, 'sem palavra obrigatória');
  assert.equal(aut.aceita(oferta(), base({ excluir: ['fio'] })).motivo, 'tem palavra proibida');
  assert.match(aut.aceita(oferta({ fonte: 'shopee' }), base()).motivo, /fonte shopee/);
  assert.equal(aut.aceita(oferta({ automacao: 'outra' }), base()).motivo, 'de outra automação');
});

test('ritmo: dias, horário, limite diário e intervalo', () => {
  const agora = new Date('2026-11-16T15:00:00Z'); // segunda, 12h em SP
  const m = { agora, dia: diaLocal(agora), hora: horaLocal(agora), diaSemana: diaSemanaLocal(agora) };
  assert.equal(m.hora, 12);
  assert.equal(m.diaSemana, 1);
  assert.equal(aut.podePostar(base(), m), true);
  assert.equal(aut.podePostar(base({ dias: [0, 6] }), m), false, 'só fim de semana');
  assert.equal(aut.podePostar(base({ horaInicio: 13 }), m), false);
  assert.equal(aut.podePostar(base({ ativa: false }), m), false);
  assert.equal(aut.podePostar(base({ destinos: {} }), m), false, 'sem destino');
  const recente = base({ intervaloMin: 30 });
  recente.estado.ultimoEnvio = agora.getTime() - 10 * 60_000;
  assert.equal(aut.podePostar(recente, m), false);
  const cheia = base({ maxDia: 2 });
  Object.assign(cheia.estado, { dia: m.dia, enviadosDia: 2 });
  assert.equal(aut.podePostar(cheia, m), false);
});

test('CRUD, registro de envio e não repetir', () => {
  const a = aut.salvarAutomacao({ nome: 'Ofertas Tech', destinos: { telegram: '@tech' }, fontes: ['manual'] });
  assert.equal(aut.listarAutomacoes().length, 1);
  aut.registrarEnvio(a.id, 'k1', '2026-11-16');
  const depois = aut.obterAutomacao(a.id);
  assert.equal(depois.estado.enviadosDia, 1);
  assert.equal(aut.aceita(oferta(), depois).motivo, 'já enviada');
  // editar mantém o estado
  aut.salvarAutomacao({ ...depois, nome: 'Tech 2' });
  assert.equal(aut.obterAutomacao(a.id).estado.enviadas[0], 'k1');
  assert.equal(aut.alternarAutomacao(a.id).ativa, false);
  assert.ok(aut.excluirAutomacao(a.id));
  assert.equal(aut.listarAutomacoes().length, 0);
});

test('fila compartilhada: só sai quando todas as automações interessadas enviaram', () => {
  fs.rmSync(`${pasta}/fila.json`, { force: true });
  const a1 = base({ id: 'a1' });
  const a2 = base({ id: 'a2' });
  fila.adicionar(oferta({ chave: 'x' }));
  a1.estado.enviadas.push('x');
  fila.limparFila([a1, a2], aut.aceita);
  assert.equal(fila.listar().length, 1, 'a2 ainda não enviou');
  a2.estado.enviadas.push('x');
  fila.limparFila([a1, a2], aut.aceita);
  assert.equal(fila.listar().length, 0);
});

test('fila: oferta vencida (48 h) sai', () => {
  fs.rmSync(`${pasta}/fila.json`, { force: true });
  fila.adicionar(oferta({ chave: 'velha', criadaEm: new Date(Date.now() - 49 * 3600_000).toISOString() }));
  fila.limparFila([], aut.aceita);
  assert.equal(fila.listar().length, 0);
});

test('migração: configuração antiga vira a automação "Principal"', () => {
  fs.rmSync(`${pasta}/automacoes.json`, { force: true });
  const cfg = {
    telegram: { canais: ['-1001'] },
    whatsapp: { grupos: [] },
    autoShopee: { ativo: true, palavras: ['fone'], descontoMin: 30, notaMin: 4.5, intervaloHoras: 3 },
    agendador: { intervaloMin: 45, horaInicio: 8, horaFim: 22, maxPorDia: 8 },
  };
  const a = aut.migrarConfiguracaoAntiga(cfg);
  assert.equal(a.nome, 'Principal');
  assert.deepEqual(a.destinos.telegram, ['-1001']);
  assert.deepEqual(a.fontes, ['manual', 'clone', 'shopee']);
  assert.equal(aut.migrarConfiguracaoAntiga(cfg), null, 'só migra uma vez');
});

test('Categorias: classifica pelo título e a automação filtra', async () => {
  const { categoriasDe, buscaDasCategorias } = await import('../src/categorias.js');
  const { normalizar, aceita } = await import('../src/automacoes.js');
  assert.deepEqual(categoriasDe('Apple iPhone 15 128GB'), ['iphone', 'celulares']);
  assert.deepEqual(categoriasDe('Tapete Sala Grande'), ['casa']);
  assert.ok(buscaDasCategorias(['pet']).includes('racao'));
  const a = normalizar({ fontes: ['manual', 'clone'], categorias: ['modaFeminina', 'infantil'], origens: ['g1@g.us'] });
  assert.equal(aceita({ titulo: 'Vestido Feminino Midi', loja: 'shopee', chave: 'x1' }, a).ok, true);
  assert.equal(aceita({ titulo: 'Air Fryer 4L', loja: 'shopee', chave: 'x2' }, a).motivo, 'fora das categorias');
  assert.equal(aceita({ titulo: 'Body Bebê Menina', fonte: 'clone', origemId: 'g2@g.us', chave: 'x3' }, a).motivo, 'clone de outro grupo');
  assert.equal(aceita({ titulo: 'Body Bebê Menina', fonte: 'clone', origemId: 'g1@g.us', chave: 'x4' }, a).ok, true);
});

test('clone por automação: cada uma clona só dos grupos dela; grupo sem dono vai para quem não marcou grupos', async () => {
  const { automacoesDoGrupo } = await import('../src/clone.js');
  const principal = base({ id: 'p', nome: 'Principal', origens: [] });
  const ronny = base({ id: 'r', nome: 'Ronny', origens: ['carro@g.us'] });
  const pausada = base({ id: 'z', nome: 'Pausada', origens: ['moda@g.us'], ativa: false });
  const todas = [principal, ronny, pausada];
  assert.deepEqual(automacoesDoGrupo('carro@g.us', 'Carro', todas).map((a) => a.id), ['r']);
  assert.deepEqual(automacoesDoGrupo('beleza@g.us', 'Beleza', todas).map((a) => a.id), ['p']);
  assert.deepEqual(automacoesDoGrupo('moda@g.us', 'Moda', todas).map((a) => a.id), [], 'grupo de automação pausada não vai para a Principal');
});

test('clone próprio da automação posta mesmo fora das categorias; o de outra não', () => {
  const ronny = base({ id: 'r', origens: ['carro@g.us'], categorias: ['iphone'] });
  const propria = oferta({ fonte: 'clone', automacao: 'r', origemId: 'carro@g.us', titulo: 'FAROL AMARELADO FICA NO PASSADO' });
  assert.ok(aut.aceita(propria, ronny).ok);
  assert.equal(aut.aceita({ ...propria, automacao: 'p' }, ronny).motivo, 'de outra automação');
});

test('fila: a mesma oferta entra uma vez para cada automação', () => {
  const o = oferta({ chave: 'dup-1', fonte: 'clone' });
  assert.ok(fila.adicionar({ ...o, automacao: 'p' }));
  assert.ok(fila.adicionar({ ...o, automacao: 'r' }));
  assert.equal(fila.adicionar({ ...o, automacao: 'r' }), null);
});
