import { NOMES } from './lojas/index.js';

const brl = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const EMOJI = { mercadolivre: '🟡', shopee: '🟠', shein: '⚫', tiktokshop: '🎵' };

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function limparTitulo(t) {
  return String(t).replace(/\s+/g, ' ').trim().slice(0, 140);
}

/** Texto para WhatsApp (*negrito*, ~riscado~). */
export function formatarWhatsApp(o) {
  const l = [];
  l.push(`🔥 *${limparTitulo(o.titulo)}*`);
  l.push('');
  if (o.precoDe && o.precoPor && o.precoDe > o.precoPor) l.push(`~De ${brl(o.precoDe)}~`);
  if (o.precoPor) l.push(`💰 *Por ${brl(o.precoPor)}*${o.desconto ? `  (-${o.desconto}%)` : ''}`);
  if (o.cupom) l.push(`🎟️ Cupom: *${o.cupom}*`);
  if (o.obs) l.push(`ℹ️ ${o.obs}`);
  l.push('');
  l.push(`${EMOJI[o.loja] || '🛒'} ${NOMES[o.loja] || 'Loja'}`);
  l.push(`👉 ${o.link}`);
  l.push('');
  l.push('_Preço sujeito a alteração._');
  return l.join('\n');
}

/** Legenda em HTML para Telegram. */
export function formatarTelegram(o) {
  const l = [];
  l.push(`🔥 <b>${escHtml(limparTitulo(o.titulo))}</b>`);
  l.push('');
  if (o.precoDe && o.precoPor && o.precoDe > o.precoPor) l.push(`<s>De ${brl(o.precoDe)}</s>`);
  if (o.precoPor) l.push(`💰 <b>Por ${brl(o.precoPor)}</b>${o.desconto ? `  (-${o.desconto}%)` : ''}`);
  if (o.cupom) l.push(`🎟️ Cupom: <code>${escHtml(o.cupom)}</code>`);
  if (o.obs) l.push(`ℹ️ ${escHtml(o.obs)}`);
  l.push('');
  l.push(`${EMOJI[o.loja] || '🛒'} ${NOMES[o.loja] || 'Loja'}`);
  l.push('');
  l.push('<i>Preço sujeito a alteração.</i>');
  return l.join('\n');
}
