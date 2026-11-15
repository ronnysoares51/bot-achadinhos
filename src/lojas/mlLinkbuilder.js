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

const DOMINIO_ML = /(^|\.)mercadoli[vb]re\.com(\.br)?$|(^|\.)mercadopago\.com(\.br)?$/i;

/**
 * Aceita os cookies em qualquer formato comum:
 * - arquivo cookies.txt (formato Netscape) da extensão "Get cookies.txt LOCALLY";
 * - JSON (Cookie-Editor, Get cookies.txt LOCALLY em JSON, EditThisCookie);
 * - cabeçalho "Cookie: a=1; b=2".
 * Nos formatos com domínio, fica só o que é do Mercado Livre (dominio = regex).
 */
export function normalizarCookies(texto, dominio = DOMINIO_ML) {
  const t = String(texto || '').replace(/^﻿/, '').trim();
  if (!t) return '';
  const juntar = (lista) => {
    const vistos = new Map();
    for (const c of lista) if (c.name && (!c.domain || dominio.test(String(c.domain).replace(/^\./, '')))) vistos.set(c.name, c.value ?? '');
    return [...vistos].map(([n, v]) => `${n}=${v}`).join('; ');
  };

  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const lista = JSON.parse(t);
      const arr = Array.isArray(lista) ? lista : lista.cookies || [];
      return juntar(arr.map((c) => ({ name: c.name, value: c.value, domain: c.domain })));
    } catch {
      return t;
    }
  }

  // Netscape cookies.txt: domínio, subdomínios, caminho, seguro, validade, nome, valor (separados por TAB)
  const linhas = t.split(/\r?\n/);
  if (linhas.some((l) => l.split('\t').length >= 7)) {
    const cookies = [];
    for (const linha of linhas) {
      const l = linha.startsWith('#HttpOnly_') ? linha.slice('#HttpOnly_'.length) : linha;
      if (!l.trim() || l.startsWith('#')) continue;
      const p = l.split('\t');
      if (p.length < 7) continue;
      cookies.push({ domain: p[0], name: p[5], value: p.slice(6).join('\t').trim() });
    }
    return juntar(cookies);
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
  if (!etiqueta && !cookies) throw new Error('Mercado Livre não conectado: preencha a etiqueta e envie o cookies.txt em Minhas lojas.');
  if (!etiqueta) throw new Error('Falta a etiqueta de afiliado do Mercado Livre (aparece em "Etiqueta em uso" no gerador de links).');
  if (!cookies) throw new Error('Faltam os cookies do Mercado Livre: envie o cookies.txt em Minhas lojas.');
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
  const naoProduto = (res.json.urls || []).find((u) => /type must be/i.test(u?.message || ''));
  if (naoProduto) {
    const e = new Error(`O link ${naoProduto.origin_url} não é de um produto (o Mercado Livre só gera meli.la para páginas de produto).`);
    e.naoProduto = true;
    throw e;
  }
  if (links.length !== urls.length || links.some((l) => !/^https:\/\/meli\.la\//.test(l))) {
    throw new Error(`Gerador do Mercado Livre não devolveu meli.la (resposta: ${JSON.stringify(res.json).slice(0, 160)}).`);
  }
  return links;
}

export async function gerarMeliLaUm(url, opcoes) {
  const [link] = await gerarMeliLa([url], opcoes);
  return link;
}

/** Pega um link de produto qualquer da página de ofertas (usado no teste de conexão). */
export async function linkDeProdutoParaTeste() {
  try {
    const r = await fetch(`${BASE}/ofertas`, { headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'pt-BR' } });
    const html = await r.text();
    const m = html.match(/https:\/\/(?:www|produto)\.mercadoli[vb]re\.com\.br\/[^"'\s<>]*MLB-?\d{6,}[^"'\s<>]*/i);
    if (m) return m[0].replace(/\\u002F/g, '/').split('#')[0];
  } catch {
    /* sem rede ou bloqueado */
  }
  return null;
}

/**
 * Link de outro afiliado (meli.la) abre o "perfil social" dele, com o produto recomendado em destaque.
 * O produto vem nos dados da página (primeira lista "polycards"): devolve a URL da página do produto.
 */
export function produtoDoHtmlSocial(html) {
  const i = String(html || '').indexOf('"polycards":[{');
  if (i < 0) return null;
  const card = html.slice(i, i + 6000);
  const des = (s) => s.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  const url = card.match(/"metadata":\{[^]*?"url":"([^"]+)"/);
  if (url) {
    const u = des(url[1]).split('?')[0].split('#')[0];
    const completa = /^https?:\/\//.test(u) ? u : `https://${u.replace(/^\/+/, '')}`;
    if (/MLB-?\d+/.test(completa)) return completa;
  }
  const produto = card.match(/"product_id":"(MLB\d+)"/);
  if (produto) return `${BASE}/p/${produto[1]}`;
  const item = card.match(/"id":"MLB(\d+)"/);
  if (item) return `https://produto.mercadolivre.com.br/MLB-${item[1]}`;
  return null;
}

/** Abre a página social e devolve a URL do produto em destaque (ou null). */
export async function produtoDaPaginaSocial(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'pt-BR,pt;q=0.9' }, signal: AbortSignal.timeout(15000) });
    return produtoDoHtmlSocial(await r.text());
  } catch {
    return null;
  }
}
