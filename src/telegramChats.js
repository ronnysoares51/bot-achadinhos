import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

/** Grupos e canais do Telegram onde o bot está (vistos pelas atualizações), para escolher no clone. */
const arquivo = () => path.join(config.pastaDados, 'telegram-chats.json');

export function listarChatsTelegram() {
  try {
    return JSON.parse(fs.readFileSync(arquivo(), 'utf8'));
  } catch {
    return [];
  }
}

export function registrarChatTelegram(chat, { saiu = false } = {}) {
  if (!chat || chat.type === 'private') return;
  const id = String(chat.id);
  const lista = listarChatsTelegram().filter((c) => c.id !== id);
  if (!saiu) lista.push({ id, nome: chat.title || chat.username || id, tipo: chat.type === 'channel' ? 'canal' : 'grupo' });
  lista.sort((a, b) => a.nome.localeCompare(b.nome));
  const atual = JSON.stringify(listarChatsTelegram());
  if (atual === JSON.stringify(lista)) return;
  fs.mkdirSync(config.pastaDados, { recursive: true });
  fs.writeFileSync(arquivo(), JSON.stringify(lista, null, 2));
}
