import { config } from '../config.js';

/**
 * Mercado Livre conectado: gera links meli.la oficiais na conta do afiliado, pelo mesmo
 * gerador de links (Linkbuilder) do portal de afiliados, usando os cookies da conta e a etiqueta.
 * Não é uma API pública: se o Mercado Livre mudar ou a sessão expirar, o erro é repassado
 * (e o painel avisa) em vez de postar links que não contam comissão.
 */
const BASE = 'https://www.mercadolivre.com.br';
const CRIAR = `${BASE}/affiliate-program/api/v2/affiliates/createLink`;
const PAGINA = `${BASE}/afiliados/linkbuilder`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

export function mlConectado() {
  return Boolean(config.mercadolivre.etiqueta && config.mercadolivre.cookies);
}

/** Aceita o cabeçalho Cookie colado, ou o JSON exportado por extensões de cookies. */
export function normalizarCookies(texto) {
  const t = String(texto || '').trim();
  if (!t) return '';
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const lista = JSON.parse(t);
      const arr = Array.isArray(lista) ? lista : lista.cookies || [];
      return arr.filter((c) => c && c.name).map((c) => `${c.name}=${c.value}`).join('; ');
    } catch {
      return t;
    }
  }
  return t.replace(/^cookie:\s*/i, '').replace(/\s*\n\s*/g, '; ');
}

let csrfCache = null;

async function buscarCsrf(cookies) {
  const r = await fetch(PAGINA, { headers: { cookie: cookies, 'user-agent': UA, accept: 'text/html' }, redirect: 'manual' });
  if (r.status >= 300 && r.status < 400) throw sessaoExpirada();
  const html = await r.text();
  const m = html.match(/["']?csrf[-_]?token["']?\s*[:=]\s*["']([^"']{10,})["']/i) || html.match(/name=["']csrf-token["']\s+content=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function sessaoExpirada() {
  const e = new Error('Sessão do Mercado Livre expirada ou inválida: cole os cookies de novo em Minhas lojas.');
  e.sessao = true;
  return e;
}

/** Gera um meli.la para cada URL (mesma ordem). */
export async function gerarMeliLa(urls, { etiqueta = config.mercadolivre.etiqueta, cookies = config.mercadolivre.cookies } = {}) {
  if (!etiqueta || !cookies) throw new Error('Mercado Livre não conectado (Minhas lojas).');
  const ck = normalizarCookies(cookies);
  const tentar = async (csrf) => {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/plain, */*',
      cookie: ck,
      origin: BASE,
      referer: PAGINA,
      'user-agent': UA,
      'accept-language': 'pt-BR,pt;q=0.9',
    };
    if (csrf) headers['x-csrf-token'] = csrf;
    const r = await fetch(CRIAR, { method: 'POST', headers, body: JSON.stringify({ urls, tag: etiqueta }), redirect: 'manual' });
    const texto = await r.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      /* resposta não JSON */
    }
    return { status: r.status, json, texto };
  };

  let res = await tentar(csrfCache);
  if ([401, 403, 419].includes(res.status) || (res.status >= 300 && res.status < 400)) {
    csrfCache = await buscarCsrf(ck);
    res = await tentar(csrfCache);
  }
  if (res.status === 401 || (res.status >= 300 && res.status < 400)) throw sessaoExpirada();
  if (res.status >= 400 || !res.json) {
    throw new Error(`Gerador de links do Mercado Livre respondeu ${res.status}: ${(res.json?.message || res.texto || '').slice(0, 160)}`);
  }
  const links = (res.json.urls || []).map((u) => u?.short_url || '');
  if (links.length !== urls.length || links.some((l) => !/^https:\/\/meli\.la\//.test(l))) {
    throw new Error(`Gerador do Mercado Livre não devolveu meli.la (resposta: ${JSON.stringify(res.json).slice(0, 160)}).`);
  }
  return links;
}

export async function gerarMeliLaUm(url, opcoes) {
  const [link] = await gerarMeliLa([url], opcoes);
  return link;
}
