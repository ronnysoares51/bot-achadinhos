import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pasta = `/tmp/achadinhos-teste-painel-${process.pid}`;
fs.rmSync(pasta, { recursive: true, force: true });
process.env.PASTA_DADOS = pasta;
process.env.PAINEL_SENHA = 'senha-de-teste';
process.env.PAINEL_PORTA = String(30000 + (process.pid % 20000));
process.env.TELEGRAM_BOT_TOKEN = '';

const { iniciarPainelWeb } = await import('../src/painel.js');
const servidor = iniciarPainelWeb();
await new Promise((r) => setTimeout(r, 200));
const base = `http://127.0.0.1:${process.env.PAINEL_PORTA}`;
after(() => servidor.close());

test('sem login mostra a tela de senha', async () => {
  const html = await (await fetch(base)).text();
  assert.match(html, /Senha do painel/);
  assert.doesNotMatch(html, /Configurações/);
});

test('senha errada é recusada', async () => {
  const r = await fetch(`${base}/login`, { method: 'POST', body: 'senha=errada', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  assert.equal(r.status, 401);
});

test('senha certa entra e mostra status e configurações', async () => {
  const r = await fetch(`${base}/login`, { method: 'POST', body: 'senha=senha-de-teste', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  assert.equal(r.status, 303);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const html = await (await fetch(base, { headers: { cookie } })).text();
  assert.match(html, /Configurações/);
  assert.match(html, /Falta o token/);
  assert.match(html, /Primeiros passos/);
  assert.match(html, /TELEGRAM_BOT_TOKEN/);
});

test('cookie falso não entra', async () => {
  const html = await (await fetch(base, { headers: { cookie: 'sessao=abc' } })).text();
  assert.match(html, /Senha do painel/);
});

test('mensagem na URL é escapada (sem injeção de HTML)', async () => {
  const r = await fetch(`${base}/login`, { method: 'POST', body: 'senha=senha-de-teste', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const html = await (await fetch(`${base}/?msg=${encodeURIComponent('<script>alert(1)</script>')}`, { headers: { cookie } })).text();
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)/);
});

async function entrar() {
  const r = await fetch(`${base}/login`, { method: 'POST', body: 'senha=senha-de-teste', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  return r.headers.get('set-cookie').split(';')[0];
}

test('cria, lista, desliga e exclui automação pelo painel', async () => {
  const cookie = await entrar();
  const form = await (await fetch(`${base}/automacao`, { headers: { cookie } })).text();
  assert.match(form, /Para onde/);
  assert.match(form, /O que/);
  assert.match(form, /Quando/);
  assert.match(form, /Como/);

  const corpo = new URLSearchParams();
  corpo.append('nome', 'Casa & Cozinha');
  corpo.append('ativa', 'false');
  corpo.append('ativa', 'true');
  corpo.append('telegram', '-1001\n@outro');
  corpo.append('whatsapp_extra', '123@g.us');
  for (const f of ['manual', 'shopee']) corpo.append('fontes', f);
  for (const l of ['shopee', 'mercadolivre']) corpo.append('lojas', l);
  for (const d of ['1', '2', '3']) corpo.append('dias', d);
  corpo.append('intervaloMin', '10');
  corpo.append('maxDia', '20');
  corpo.append('horaInicio', '9');
  corpo.append('horaFim', '21');
  corpo.append('shopee_palavras', 'panela, airfryer');
  corpo.append('formato', 'texto');
  const r = await fetch(`${base}/automacao`, { method: 'POST', body: corpo.toString(), headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  assert.equal(r.status, 303);

  const { listarAutomacoes } = await import('../src/automacoes.js');
  const [a] = listarAutomacoes();
  assert.equal(a.nome, 'Casa & Cozinha');
  assert.equal(a.ativa, true);
  assert.deepEqual(a.destinos.telegram, ['-1001', '@outro']);
  assert.deepEqual(a.destinos.whatsapp, ['123@g.us']);
  assert.deepEqual(a.fontes, ['manual', 'shopee']);
  assert.deepEqual(a.lojas, ['shopee', 'mercadolivre']);
  assert.deepEqual(a.dias, [1, 2, 3]);
  assert.equal(a.intervaloMin, 10);
  assert.deepEqual(a.buscaShopee.palavras, ['panela', 'airfryer']);
  assert.equal(a.formato, 'texto');
  assert.equal(a.modelo, '', 'sem modelo próprio = segue o padrão');

  const home = await (await fetch(base, { headers: { cookie } })).text();
  assert.match(home, /Casa &amp; Cozinha/);
  assert.match(home, /1 a cada 10 min/);

  const acao = (acao) => fetch(`${base}/automacao/acao`, { method: 'POST', body: `id=${a.id}&acao=${acao}`, headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  await acao('alternar');
  assert.equal(listarAutomacoes()[0].ativa, false);
  await acao('excluir');
  assert.equal(listarAutomacoes().length, 0);
});

test('rotas de automação exigem login', async () => {
  const r = await fetch(`${base}/automacao/acao`, { method: 'POST', body: 'id=x&acao=excluir', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.match(await r.text(), /Senha do painel/);
});

test('Minhas lojas: salva e aplica na hora (segredo vazio mantém o anterior)', async () => {
  const cookie = await entrar();
  const post = (corpo) => fetch(`${base}/lojas`, { method: 'POST', body: corpo, headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  await post('ML_ETIQUETA=minhatag&ML_COOKIES=' + encodeURIComponent('Cookie: a=1; b=2') + '&SHOPEE_APP_ID=999&SHOPEE_SECRET=seg');
  const { config } = await import('../src/config.js');
  assert.equal(config.mercadolivre.etiqueta, 'minhatag');
  assert.equal(config.mercadolivre.cookies, 'a=1; b=2');
  assert.equal(config.shopee.appId, '999');
  await post('ML_ETIQUETA=minhatag&ML_COOKIES=&SHOPEE_SECRET=');
  assert.equal(config.mercadolivre.cookies, 'a=1; b=2', 'cookies mantidos');
  assert.equal(config.shopee.secret, 'seg', 'secret mantido');
  const html = await (await fetch(`${base}/lojas`, { headers: { cookie } })).text();
  assert.match(html, /Conectada/);
  assert.doesNotMatch(html, /a=1; b=2/, 'cookies nunca aparecem na tela');
});

test('Clone: salva grupos escolhidos e vale na hora', async () => {
  const cookie = await entrar();
  await fetch(`${base}/clone`, { method: 'POST', body: 'grupos=111%40g.us&grupos=222%40g.us&automatico=false&automatico=true&maxHora=30', headers: { cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, redirect: 'manual' });
  const { config } = await import('../src/config.js');
  assert.deepEqual(config.clone.grupos, ['111@g.us', '222@g.us']);
  assert.equal(config.clone.automatico, true);
  assert.equal(config.clone.maxHora, 30);
  const html = await (await fetch(`${base}/clone`, { headers: { cookie } })).text();
  assert.match(html, /Grupos para clonar/);
});
