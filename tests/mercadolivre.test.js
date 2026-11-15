import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PASTA_DADOS = `/tmp/achadinhos-teste-ml-${process.pid}`;
process.env.ML_ETIQUETA = 'minhatag';
process.env.ML_COOKIES = 'ssid=abc; orguseridp=123';

const ml = await import('../src/lojas/mlLinkbuilder.js');
const { converterLink } = await import('../src/oferta.js');

function servidorFalso(respostas) {
  const chamadas = [];
  globalThis.fetch = async (url, op = {}) => {
    chamadas.push({ url: String(url), metodo: op.method || 'GET', headers: op.headers || {}, body: op.body });
    const r = respostas.shift();
    return { status: r.status, url: String(url), ok: r.status < 400, headers: { get: () => null }, text: async () => (typeof r.corpo === 'string' ? r.corpo : JSON.stringify(r.corpo)), json: async () => r.corpo };
  };
  return chamadas;
}

test('cookies: aceita cabeçalho e JSON exportado por extensão', () => {
  assert.equal(ml.normalizarCookies('Cookie: a=1; b=2'), 'a=1; b=2');
  assert.equal(ml.normalizarCookies('[{"name":"a","value":"1"},{"name":"b","value":"2"}]'), 'a=1; b=2');
  assert.equal(ml.normalizarCookies(''), '');
});

test('gera meli.la com etiqueta e cookies da conta', async () => {
  const chamadas = servidorFalso([{ status: 200, corpo: { urls: [{ short_url: 'https://meli.la/XyZ' }] } }]);
  assert.equal(await ml.gerarMeliLaUm('https://produto.mercadolivre.com.br/MLB-1'), 'https://meli.la/XyZ');
  const c = chamadas[0];
  assert.match(c.url, /affiliates\/createLink/);
  assert.equal(c.headers.cookie, 'ssid=abc; orguseridp=123');
  assert.deepEqual(JSON.parse(c.body), { urls: ['https://produto.mercadolivre.com.br/MLB-1'], tag: 'minhatag' });
});

test('se pedir token CSRF, busca na página do Linkbuilder e tenta de novo', async () => {
  const chamadas = servidorFalso([
    { status: 403, corpo: { message: 'forbidden' } },
    { status: 200, corpo: '<script>window.__x={"csrfToken":"TOKEN123456789"}</script>' },
    { status: 200, corpo: { urls: [{ short_url: 'https://meli.la/AAA' }] } },
  ]);
  assert.equal(await ml.gerarMeliLaUm('https://produto.mercadolivre.com.br/MLB-2'), 'https://meli.la/AAA');
  assert.equal(chamadas[2].headers['x-csrf-token'], 'TOKEN123456789');
});

test('sessão expirada vira erro claro (não posta link sem comissão)', async () => {
  servidorFalso([{ status: 401, corpo: {} }, { status: 302, corpo: '' }]);
  await assert.rejects(ml.gerarMeliLaUm('https://produto.mercadolivre.com.br/MLB-3'), /expirada/);
});

test('link de produto do ML vira meli.la da sua conta; meli.la colado por você fica igual', async () => {
  servidorFalso([{ status: 200, corpo: { urls: [{ short_url: 'https://meli.la/MEU' }] } }]);
  const r = await converterLink('https://produto.mercadolivre.com.br/MLB-9-fone?matt_word=outro');
  assert.equal(r.link, 'https://meli.la/MEU');
  assert.equal((await converterLink('https://meli.la/JaEhMeu')).link, 'https://meli.la/JaEhMeu');
});

test('cookies.txt (Netscape) da extensão Get cookies.txt LOCALLY: fica só o que é do Mercado Livre', () => {
  const txt = [
    '# Netscape HTTP Cookie File',
    '# https://curl.haxx.se/rfc/cookie_spec.html',
    '.mercadolivre.com.br\tTRUE\t/\tTRUE\t1830000000\tssid\tABC123',
    '#HttpOnly_.mercadolivre.com.br\tTRUE\t/\tTRUE\t1830000000\torguseridp\t999',
    'www.mercadolivre.com.br\tFALSE\t/\tFALSE\t0\t_csrf\txyz',
    '.google.com\tTRUE\t/\tTRUE\t1830000000\tNID\tnao-pode',
    '',
  ].join('\n');
  assert.equal(ml.normalizarCookies(txt), 'ssid=ABC123; orguseridp=999; _csrf=xyz');
});

test('JSON com domínio: filtra Mercado Livre', () => {
  const json = JSON.stringify([
    { domain: '.mercadolivre.com.br', name: 'ssid', value: '1' },
    { domain: '.facebook.com', name: 'c_user', value: 'x' },
  ]);
  assert.equal(ml.normalizarCookies(json), 'ssid=1');
});
