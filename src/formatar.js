import { NOMES } from './lojas/index.js';

// Modelo da mensagem: texto livre com variáveis entre chaves, no formato do WhatsApp
// (*negrito*, _itálico_, ~riscado~). Linha com variável vazia some sozinha.
export const VARIAVEIS = {
  titulo: 'Nome do produto',
  loja: 'Nome da loja',
  preco: 'Preço atual (R$ 49,90)',
  preco_antigo: 'Preço antigo (R$ 99,90)',
  desconto: 'Desconto (50%)',
  economia: 'Quanto economiza (R$ 50,00)',
  cupom: 'Código do cupom',
  obs: 'Observação (ex.: frete grátis)',
  nota: 'Nota de avaliação (4,8)',
  vendidos: 'Quantidade vendida',
  link: 'Seu link de afiliado',
};

export const MODELO_PADRAO = `🔥 *{titulo}*

~De {preco_antigo}~
💰 *Por {preco}* ({desconto} OFF)
🎟️ Cupom: *{cupom}*
⭐ {nota} · {vendidos} vendidos
ℹ️ {obs}

🛒 {loja}
👉 {link}

_Preço sujeito a alteração._`;

const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function limparTitulo(t) {
  return String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
}

/** Valores de cada variável para uma oferta ('' quando não existe). */
export function valores(o) {
  const temDe = o.precoDe && o.precoPor && o.precoDe > o.precoPor;
  const vendidos = Number(o.vendas) || 0;
  return {
    titulo: limparTitulo(o.titulo),
    loja: NOMES[o.loja] || '',
    preco: o.precoPor ? brl(o.precoPor) : '',
    preco_antigo: temDe ? brl(o.precoDe) : '',
    desconto: o.desconto ? `${o.desconto}%` : '',
    economia: temDe ? brl(o.precoDe - o.precoPor) : '',
    cupom: o.cupom || '',
    obs: o.obs || '',
    nota: o.nota ? Number(o.nota).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '',
    vendidos: vendidos ? (vendidos >= 1000 ? `${Math.floor(vendidos / 1000)} mil+` : String(vendidos)) : '',
    link: o.link || '',
  };
}

/**
 * Aplica o modelo: troca {variavel} pelo valor e remove as linhas com alguma variável vazia.
 * Linhas em branco seguidas viram uma só.
 */
export function aplicarModelo(modelo, o, { semLink = false } = {}) {
  const v = valores(o);
  const linhas = [];
  for (const linha of String(modelo || MODELO_PADRAO).split('\n')) {
    const vars = [...linha.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => k in v);
    if (semLink && vars.includes('link')) continue;
    if (vars.some((k) => !v[k])) continue;
    linhas.push(linha.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m)));
  }
  return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Converte a marcação do WhatsApp (*negrito* _itálico_ ~riscado~) em HTML do Telegram. */
export function whatsParaHtml(texto) {
  return escHtml(texto)
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:]|$)/gm, '$1<b>$2</b>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:]|$)/gm, '$1<i>$2</i>')
    .replace(/(^|[\s(])~([^~\n]+)~(?=[\s).,!?:]|$)/gm, '$1<s>$2</s>');
}

/** Texto para WhatsApp. */
export function formatarWhatsApp(o, modelo = process.env.MODELO_MENSAGEM) {
  return aplicarModelo(modelo, o);
}

/** Legenda em HTML para Telegram (o link vai no botão "Comprar agora"). */
export function formatarTelegram(o, modelo = process.env.MODELO_MENSAGEM) {
  return whatsParaHtml(aplicarModelo(modelo, o, { semLink: true }));
}
