import { config } from '../config.js';

const api = (metodo) => `https://api.telegram.org/bot${config.telegram.token}/${metodo}`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chama a Bot API com nova tentativa em 429 (limite) e erros 5xx. */
export async function chamar(metodo, corpo, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    const resp = await fetch(api(metodo), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const json = await resp.json().catch(() => ({}));
    if (json.ok) return json.result;
    if (resp.status === 429 || resp.status >= 500) {
      await esperar(((json.parameters?.retry_after ?? 2) + 1) * 1000);
      continue;
    }
    throw new Error(`Telegram ${metodo}: ${json.description || resp.status}`);
  }
  throw new Error(`Telegram ${metodo}: muitas tentativas`);
}

export function botaoComprar(link) {
  return { inline_keyboard: [[{ text: '🛒 Comprar agora', url: link }]] };
}

/** Envia foto + legenda (ou só texto, se não houver foto ou a foto falhar). */
export async function enviar(chatId, { legenda, imagem, teclado }) {
  const extra = { parse_mode: 'HTML', reply_markup: teclado };
  if (imagem) {
    try {
      return await chamar('sendPhoto', { chat_id: chatId, photo: imagem, caption: legenda, ...extra });
    } catch {
      /* cai para texto */
    }
  }
  return chamar('sendMessage', { chat_id: chatId, text: legenda, disable_web_page_preview: false, ...extra });
}

export async function publicarNosCanais(oferta, legenda, canais = config.telegram.canais, { comImagem = true } = {}) {
  const resultados = [];
  for (const canal of canais) {
    try {
      await enviar(canal, { legenda, imagem: comImagem ? oferta.imagem : null, teclado: botaoComprar(oferta.link) });
      resultados.push({ destino: `telegram:${canal}`, ok: true });
    } catch (e) {
      resultados.push({ destino: `telegram:${canal}`, ok: false, erro: e.message });
    }
  }
  return resultados;
}
