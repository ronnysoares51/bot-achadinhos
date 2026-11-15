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
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export const statusWhatsApp = () => ({ ativo: config.whatsapp.ativo, conectado, temQr: Boolean(ultimoQr) });

export async function iniciarWhatsApp({ aoReceberQr } = {}) {
  if (!config.whatsapp.ativo) return;
  const baileys = await import('@whiskeysockets/baileys');
  const makeWASocket = baileys.default;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
  const QRCode = (await import('qrcode')).default;

  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.pastaSessao);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  sock = makeWASocket({ auth: state, version, browser: ['Bot Achadinhos', 'Chrome', '1.0'], syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);
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
        setTimeout(() => iniciarWhatsApp({ aoReceberQr }), 5000);
      }
    }
  });
}

/** Lista os grupos em que o número está (nome + ID). */
export async function listarGrupos() {
  if (!sock || !conectado) throw new Error('WhatsApp não conectado.');
  const grupos = await sock.groupFetchAllParticipating();
  return Object.values(grupos).map((g) => ({ id: g.id, nome: g.subject }));
}

async function resolverDestinos() {
  const desejados = config.whatsapp.grupos;
  if (!desejados.length) return [];
  const ids = desejados.filter((g) => g.endsWith('@g.us') || g.endsWith('@newsletter'));
  const nomes = desejados.filter((g) => !ids.includes(g));
  if (!nomes.length) return ids;
  const todos = await listarGrupos();
  return [...ids, ...todos.filter((g) => nomes.includes(g.nome)).map((g) => g.id)];
}

export async function publicarNosGrupos(oferta, texto) {
  if (!config.whatsapp.ativo) return [];
  if (!sock || !conectado) return [{ destino: 'whatsapp', ok: false, erro: 'não conectado' }];
  const resultados = [];
  const destinos = await resolverDestinos();
  for (const [i, jid] of destinos.entries()) {
    try {
      if (oferta.imagem) await sock.sendMessage(jid, { image: { url: oferta.imagem }, caption: texto });
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
