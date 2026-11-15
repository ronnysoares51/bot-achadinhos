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
iniciarPainelWeb();
await new Promise((r) => setTimeout(r, 200));
const base = `http://127.0.0.1:${process.env.PAINEL_PORTA}`;
after(() => setImmediate(() => process.exit(0)));

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
  assert.match(html, /falta o token/);
  assert.match(html, /TELEGRAM_BOT_TOKEN/);
});

test('cookie falso não entra', async () => {
  const html = await (await fetch(base, { headers: { cookie: 'sessao=abc' } })).text();
  assert.match(html, /Senha do painel/);
});
