import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * WhatsApp via Baileys (conexão como "aparelho conectado", igual ao WhatsApp Web).
 * ATENÇÃO: não é uma API oficial. O WhatsApp pode restringir ou banir o número.
 * Use um número só para isso, poucos posts por dia e pausas entre os grupos.
 */
let sock = null;
let conectado = false;
let ultimoQr = null;
const nomesGrupos = new Map();

/** O grupo está na lista de monitorados (por ID ou pelo nome exato)? */
async function monitorado(jid) {
  const lista = config.clone.grupos;
  if (lista.includes(jid)) return true;
  if (!jid.endsWith('@g.us')) return false;
  if (!nomesGrupos.has(jid)) {
    const meta = await sock.groupMetadata(jid).catch(() => null);
    nomesGrupos.set(jid, meta?.subject || '');
  }
  return lista.includes(nomesGrupos.get(jid));
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export const statusWhatsApp = () => ({ ativo: config.whatsapp.ativo, conectado, temQr: Boolean(ultimoQr) });

export async function iniciarWhatsApp(opcoes = {}) {
  const { aoReceberQr, aoReceberMensagem } = opcoes;
  if (!config.whatsapp.ativo) return;
  const baileys = await import('@whiskeysockets/baileys');
  const makeWASocket = baileys.default;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
  const QRCode = (await import('qrcode')).default;

  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.pastaSessao);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  sock = makeWASocket({ auth: state, version, browser: ['Bot Achadinhos', 'Chrome', '1.0'], syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);

  // Clone de ofertas: mensagens dos grupos monitorados vão para o callback.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !aoReceberMensagem || !config.clone.grupos.length) return;
    for (const m of messages) {
      try {
        const jid = m.key?.remoteJid;
        if (!jid || m.key.fromMe || !(await monitorado(jid))) continue;
        const msg = m.message || {};
        const texto = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption;
        if (texto) await aoReceberMensagem({ grupo: jid, nomeGrupo: nomesGrupos.get(jid) || jid, texto });
      } catch (e) {
        console.error('[whatsapp] monitor:', e.message);
      }
    }
  });
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      ultimoQr = qr;
      console.log('[whatsapp] Escaneie o QR (WhatsApp > Aparelhos conectados):');
      console.log(await QRCode.toString(qr, { type: 'terminal', small: true }));
      const png = path.join(config.pastaDados, 'whatsapp-qr.png');
      fs.mkdirSync(config.pastaDados, { recursive: true });
      await QRCode.toFile(png, qr).catch(() => {});
      aoReceberQr?.(png);
    }
    if (connection === 'open') {
      conectado = true;
      ultimoQr = null;
      console.log('[whatsapp] Conectado.');
    }
    if (connection === 'close') {
      conectado = false;
      const codigo = lastDisconnect?.error?.output?.statusCode;
      if (codigo === DisconnectReason.loggedOut) {
        console.log('[whatsapp] Sessão encerrada no celular. Apague a pasta da sessão e conecte de novo.');
      } else {
        console.log('[whatsapp] Conexão caiu, reconectando em 5s...');
        setTimeout(() => iniciarWhatsApp(opcoes), 5000);
      }
    }
  });
}

let cacheGrupos = { quando: 0, lista: [] };

/** Lista os grupos em que o número está (nome + ID). Guarda por 5 minutos. */
export async function listarGrupos({ usarCache = false } = {}) {
  if (!sock || !conectado) throw new Error('WhatsApp não conectado.');
  if (usarCache && Date.now() - cacheGrupos.quando < 5 * 60_000) return cacheGrupos.lista;
  const grupos = await sock.groupFetchAllParticipating();
  const lista = Object.values(grupos).map((g) => ({ id: g.id, nome: g.subject })).sort((a, b) => a.nome.localeCompare(b.nome));
  cacheGrupos = { quando: Date.now(), lista };
  return lista;
}

async function resolverDestinos(desejados = config.whatsapp.grupos) {
  if (!desejados.length) return [];
  const ids = desejados.filter((g) => g.endsWith('@g.us') || g.endsWith('@newsletter'));
  const nomes = desejados.filter((g) => !ids.includes(g));
  if (!nomes.length) return ids;
  const todos = await listarGrupos();
  return [...ids, ...todos.filter((g) => nomes.includes(g.nome)).map((g) => g.id)];
}

export async function publicarNosGrupos(oferta, texto, grupos = config.whatsapp.grupos, { comImagem = true } = {}) {
  if (!grupos.length) return [];
  if (!config.whatsapp.ativo) return [{ destino: 'whatsapp', ok: false, erro: 'WhatsApp desligado nas configurações' }];
  if (!sock || !conectado) return [{ destino: 'whatsapp', ok: false, erro: 'não conectado' }];
  const resultados = [];
  const destinos = await resolverDestinos(grupos);
  for (const [i, jid] of destinos.entries()) {
    try {
      if (comImagem && oferta.imagem) await sock.sendMessage(jid, { image: { url: oferta.imagem }, caption: texto });
      else await sock.sendMessage(jid, { text: texto });
      resultados.push({ destino: `whatsapp:${jid}`, ok: true });
    } catch (e) {
      resultados.push({ destino: `whatsapp:${jid}`, ok: false, erro: e.message });
    }
    if (i < destinos.length - 1) {
      const { pausaMin, pausaMax } = config.whatsapp;
      await esperar((pausaMin + Math.random() * Math.max(0, pausaMax - pausaMin)) * 1000);
    }
  }
  return resultados;
}
