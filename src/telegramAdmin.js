import { config } from './config.js';
import { chamar, enviar } from './destinos/telegram.js';
import { listarGrupos, statusWhatsApp } from './destinos/whatsapp.js';
import { montarOferta } from './oferta.js';
import { formatarTelegram } from './formatar.js';
import { adicionar, listar, remover, proxima, jaPostada } from './fila.js';
import { publicar, diaLocal } from './publicar.js';
import { registrarPostManual } from './agendador.js';
import { NOMES } from './lojas/index.js';
import { listarAutomacoes, enviadosHoje } from './automacoes.js';
import { processarMensagem } from './clone.js';
import { registrarChatTelegram } from './telegramChats.js';

// Painel no privado do Telegram: o admin cola o link, vê a prévia e decide (postar, fila ou descartar).
const pendentes = new Map();
let offset = 0;

const ehAdmin = (id) => config.telegram.admins.includes(String(id));
const responder = (chatId, texto, extra = {}) => chamar('sendMessage', { chat_id: chatId, text: texto, parse_mode: 'HTML', ...extra });

export function avisarAdmins(texto) {
  for (const id of config.telegram.admins) responder(id, texto).catch(() => {});
}

const AJUDA = `<b>Bot de Achadinhos</b>

Cole um link de produto do <b>Mercado Livre, Shopee, Shein ou TikTok Shop</b>. Linhas opcionais:
<code>titulo: Fone Bluetooth X
de: 199,90
por: 89,90
cupom: ACHADO10
obs: Frete grátis
foto: https://link-da-imagem.jpg</code>

Comandos:
/fila – ofertas aguardando
/postar – posta a próxima da fila agora
/remover ID – tira da fila
/grupos – grupos do WhatsApp (nome e ID)
/status – situação do bot`;

/** Mensagem de grupo/canal do Telegram: guarda o chat na lista e clona se ele estiver marcado. */
async function clonarDoTelegram(msg) {
  registrarChatTelegram(msg.chat);
  const id = String(msg.chat.id);
  if (!config.clone.gruposTelegram.includes(id)) return false;
  const texto = msg.text || msg.caption || '';
  const links = (msg.entities || msg.caption_entities || []).filter((e) => e.type === 'text_link').map((e) => e.url);
  const nomeGrupo = msg.chat.title || id;
  const r = await processarMensagem({ texto: [texto, ...links].join('\n'), nomeGrupo, grupo: id }, { aprovar: enviarParaAprovacao, avisar: avisarAdmins }).catch((e) => ({ ok: false, motivo: e.message }));
  if (r.ok) console.log(`[clone] Telegram ${nomeGrupo}: oferta enviada para ${r.destino}`);
  return true;
}

async function tratarMensagem(msg) {
  const chatId = msg.chat.id;
  if (msg.chat.type !== 'private' && (await clonarDoTelegram(msg))) return;
  if (!ehAdmin(msg.from?.id)) {
    if (msg.chat.type === 'private') await responder(chatId, `Seu ID é <code>${msg.from?.id}</code>. Coloque-o em TELEGRAM_ADMINS para usar o bot.`);
    return;
  }
  const texto = (msg.text || msg.caption || '').trim();
  const [cmd, ...args] = texto.split(/\s+/);

  if (cmd === '/start' || cmd === '/ajuda') return responder(chatId, AJUDA);

  if (cmd === '/fila') {
    const fila = listar();
    if (!fila.length) return responder(chatId, 'Fila vazia.');
    const linhas = fila.slice(0, 30).map((o, i) => `${i + 1}. <code>${o.id}</code> ${NOMES[o.loja]} – ${String(o.titulo).slice(0, 60)}`);
    return responder(chatId, `<b>Fila (${fila.length})</b>\n${linhas.join('\n')}`);
  }

  if (cmd === '/remover') return responder(chatId, remover(args[0]) ? 'Removida.' : 'ID não encontrado.');

  if (cmd === '/postar') {
    const o = proxima();
    if (!o) return responder(chatId, 'Fila vazia.');
    return postarAgora(chatId, o);
  }

  if (cmd === '/grupos') {
    try {
      const grupos = await listarGrupos();
      const linhas = grupos.map((g) => `• ${g.nome}\n  <code>${g.id}</code>`);
      return responder(chatId, `<b>Grupos do WhatsApp</b>\n${linhas.join('\n') || 'nenhum'}\n\nCopie os IDs para WHATSAPP_GRUPOS.`);
    } catch (e) {
      return responder(chatId, `⚠️ ${e.message}`);
    }
  }

  if (cmd === '/status') {
    const wa = statusWhatsApp();
    const dia = diaLocal(new Date(), config.agendador.fusoHorario);
    const auts = listarAutomacoes();
    const linhas = auts.map((a) => `${a.ativa ? '🟢' : '⚪'} <b>${a.nome.replace(/[<>&]/g, '')}</b>: ${enviadosHoje(a, dia)}/${a.maxDia} hoje, a cada ${a.intervaloMin} min, ${a.horaInicio}h–${a.horaFim}h · ${a.destinos.telegram.length} canal(is) · ${a.destinos.whatsapp.length} grupo(s)`);
    return responder(
      chatId,
      `<b>Status</b>\nWhatsApp: ${wa.ativo ? (wa.conectado ? 'conectado' : 'desconectado') : 'desligado'}\nFila: ${listar().length}\n\n<b>Automações</b>\n${linhas.join('\n') || 'Nenhuma. Crie no painel web.'}`,
    );
  }

  if (!/https?:\/\//i.test(texto)) return responder(chatId, 'Mande um link de produto ou /ajuda.');

  await chamar('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
  try {
    const oferta = await montarOferta(texto);
    await enviarPrevia(chatId, oferta);
  } catch (e) {
    await responder(chatId, `⚠️ ${e.message}`);
  }
}

/** Mostra a prévia com os botões Postar agora / Pôr na fila / Descartar. */
async function enviarPrevia(chatId, oferta, cabecalho = '') {
  const id = Math.random().toString(36).slice(2, 10);
  pendentes.set(id, oferta);
  setTimeout(() => pendentes.delete(id), 6 * 3600_000);
  const aviso = jaPostada(oferta.chave) ? '\n\n⚠️ <i>Essa oferta já foi postada nos últimos 7 dias.</i>' : '';
  const faltando = !oferta.precoPor ? '\n\n✏️ <i>Não achei o preço: reenvie com a linha "por: 99,90".</i>' : '';
  await enviar(chatId, {
    legenda: `${cabecalho}${formatarTelegram(oferta)}\n\n🔗 ${oferta.link}${aviso}${faltando}`,
    imagem: oferta.imagem,
    teclado: {
      inline_keyboard: [
        [{ text: '✅ Postar agora', callback_data: `agora:${id}` }, { text: '🕒 Pôr na fila', callback_data: `fila:${id}` }],
        [{ text: '🗑 Descartar', callback_data: `descartar:${id}` }],
      ],
    },
  });
}

/** Clone de ofertas no modo manual: cada admin recebe a prévia para aprovar. */
export async function enviarParaAprovacao(oferta, origem) {
  const cab = `🧲 <b>Oferta clonada</b> de <i>${String(origem).replace(/[<>&]/g, '')}</i> (já com o seu link)\n\n`;
  for (const id of config.telegram.admins) await enviarPrevia(id, oferta, cab).catch((e) => console.error('[telegram] aprovação:', e.message));
}

async function postarAgora(chatId, oferta) {
  await responder(chatId, '⏳ Postando...');
  registrarPostManual();
  const res = await publicar(oferta, config.agendador.fusoHorario);
  const ok = res.filter((r) => r.ok).length;
  const erros = res.filter((r) => !r.ok).map((r) => `• ${r.destino}: ${r.erro}`);
  return responder(chatId, `✅ Postado em ${ok} destino(s).${erros.length ? `\n\nFalhas:\n${erros.join('\n')}` : ''}${res.length ? '' : '\n\nNenhum destino configurado (TELEGRAM_CANAIS / WHATSAPP_GRUPOS).'}`);
}

async function tratarBotao(q) {
  const chatId = q.message?.chat.id;
  await chamar('answerCallbackQuery', { callback_query_id: q.id }).catch(() => {});
  if (!ehAdmin(q.from.id)) return;
  const [acao, id] = String(q.data).split(':');
  const oferta = pendentes.get(id);
  if (!oferta) return responder(chatId, 'Essa prévia expirou. Mande o link de novo.');
  pendentes.delete(id);
  await chamar('editMessageReplyMarkup', { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
  if (acao === 'descartar') return responder(chatId, '🗑 Descartada.');
  if (acao === 'fila') {
    const item = adicionar({ fonte: 'manual', ...oferta });
    return responder(chatId, item ? `🕒 Na fila (posição ${listar().length}).` : 'Essa oferta já está na fila.');
  }
  if (acao === 'agora') return postarAgora(chatId, { ...oferta, id: `manual-${id}` });
}

export async function iniciarPainelTelegram() {
  if (!config.telegram.token) throw new Error('Preencha TELEGRAM_BOT_TOKEN.');
  const eu = await chamar('getMe', {});
  console.log(`[telegram] Painel ativo em @${eu.username}. Mande /start no privado.`);
  await chamar('setMyCommands', {
    commands: [
      { command: 'ajuda', description: 'Como usar' },
      { command: 'fila', description: 'Ofertas na fila' },
      { command: 'postar', description: 'Postar a próxima agora' },
      { command: 'grupos', description: 'Grupos do WhatsApp' },
      { command: 'status', description: 'Situação do bot' },
    ],
  }).catch(() => {});

  for (;;) {
    try {
      const updates = await chamar('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'channel_post', 'my_chat_member', 'callback_query'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message) tratarMensagem(u.message).catch((e) => console.error('[telegram]', e.message));
        if (u.channel_post) clonarDoTelegram(u.channel_post).catch((e) => console.error('[telegram] clone:', e.message));
        if (u.my_chat_member) registrarChatTelegram(u.my_chat_member.chat, { saiu: ['left', 'kicked'].includes(u.my_chat_member.new_chat_member?.status) });
        if (u.callback_query) tratarBotao(u.callback_query).catch((e) => console.error('[telegram]', e.message));
      }
    } catch (e) {
      console.error('[telegram] getUpdates:', e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
