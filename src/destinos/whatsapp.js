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
  if (lista.includes(jid)) {
    if (!nomesGrupos.has(jid)) sock.groupMetadata(jid).then((m) => nomesGrupos.set(jid, m.subject)).catch(() => {});
    return true;
  }
  if (!jid.endsWith('@g.us')) return false;
  if (!nomesGrupos.has(jid)) {
    const meta = await sock.groupMetadata(jid).catch(() => null);
    nomesGrupos.set(jid, meta?.subject || '');
  }
  return lista.includes(nomesGrupos.get(jid));
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Cópia das mensagens enviadas: quando um celular do grupo não consegue abrir a mensagem,
// ele pede reenvio e o WhatsApp chama getMessage. Sem isso a mensagem fica em
// "Aguardando mensagem" para os membros, mesmo com o envio dando certo.
const enviadas = new Map();
const MAX_ENVIADAS = 1000;
function guardarEnviada(msg) {
  if (!msg?.key?.id || !msg.message) return;
  enviadas.set(msg.key.id, { message: msg.message, jid: msg.key.remoteJid, quando: Date.now(), status: 1 });
  while (enviadas.size > MAX_ENVIADAS) enviadas.delete(enviadas.keys().next().value);
}
const NOMES_STATUS = { 0: 'erro', 1: 'pendente', 2: 'enviada ao servidor', 3: 'entregue', 4: 'lida', 5: 'reproduzida' };
/** Situação de entrega de uma mensagem enviada pelo bot (pelo id). */
export function statusEnvio(id) {
  const e = enviadas.get(id);
  return e ? { status: e.status, texto: NOMES_STATUS[e.status] || String(e.status) } : null;
}
let ultimoErro = null;
let tentativas = 0;

export const statusWhatsApp = () => ({ ativo: config.whatsapp.ativo, conectado, temQr: Boolean(ultimoQr), erro: ultimoErro, tentativas });

// Versão do WhatsApp Web conhecida como aceita (jul/2026). Usada quando a busca automática
// devolve uma versão mais antiga ou falha: versões velhas são recusadas pelo WhatsApp.
const VERSAO_MINIMA = [2, 3000, 1044015310];
const maior = (a, b) => {
  for (let i = 0; i < 3; i++) if ((a?.[i] || 0) !== (b?.[i] || 0)) return (a?.[i] || 0) > (b?.[i] || 0) ? a : b;
  return a;
};

async function versaoWhatsApp(baileys) {
  let v = VERSAO_MINIMA;
  for (const f of ['fetchLatestWaWebVersion', 'fetchLatestBaileysVersion']) {
    if (typeof baileys[f] !== 'function') continue;
    const r = await baileys[f]().catch(() => null);
    if (Array.isArray(r?.version)) v = maior(r.version, v);
  }
  return v;
}

function explicarErro(codigo) {
  if (codigo === 405) return 'O WhatsApp recusou a conexão (405). Tentando de novo...';
  if (codigo === 401) return 'Sessão desconectada no celular. Gerando um QR novo...';
  if (codigo === 403) return 'O WhatsApp bloqueou este número (403).';
  if (codigo === 408) return 'Tempo esgotado ao conectar. Tentando de novo...';
  if (codigo === 515) return 'Reiniciando a conexão (normal depois de escanear o QR)...';
  return `Conexão caiu${codigo ? ` (código ${codigo})` : ''}. Tentando de novo...`;
}

/** Inicia a conexão sem nunca derrubar o resto do bot (painel e Telegram continuam no ar). */
export async function iniciarWhatsApp(opcoes = {}) {
  if (!config.whatsapp.ativo) return;
  try {
    await conectar(opcoes);
  } catch (e) {
    ultimoErro = `Não foi possível iniciar o WhatsApp: ${e.message}`;
    tentativas += 1;
    console.error('[whatsapp]', ultimoErro);
    setTimeout(() => iniciarWhatsApp(opcoes), Math.min(120_000, 10_000 * tentativas));
  }
}

async function conectar(opcoes) {
  const { aoReceberQr, aoReceberMensagem } = opcoes;
  let baileys;
  try {
    baileys = await import('baileys');
  } catch {
    baileys = await import('@whiskeysockets/baileys');
  }
  const makeWASocket = baileys.default?.default || baileys.default || baileys.makeWASocket;
  const { useMultiFileAuthState, DisconnectReason, Browsers } = baileys;
  const QRCode = (await import('qrcode')).default;

  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.pastaSessao);
  const version = await versaoWhatsApp(baileys);
  // Identificação como app de macOS: o WhatsApp passou a recusar clientes "WEB" (erro 405).
  const browser = Browsers?.macOS ? Browsers.macOS('Desktop') : ['Mac OS', 'Desktop', '14.4.1'];
  console.log(`[whatsapp] Conectando (versão ${version.join('.')})...`);

  let logger;
  try {
    logger = (await import('pino')).default({ level: 'warn' });
  } catch {
    logger = undefined;
  }
  sock = makeWASocket({
    auth: state, version, browser, logger, syncFullHistory: false, markOnlineOnConnect: false,
    getMessage: async (key) => enviadas.get(key.id)?.message,
    cachedGroupMetadata: async (jid) => metaGrupos.get(jid)?.meta,
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.update', (atualizacoes) => {
    for (const { key, update } of atualizacoes) {
      const e = key?.fromMe && enviadas.get(key.id);
      if (!e || update?.status == null) continue;
      e.status = Math.max(e.status, update.status);
      if (update.status === 0) console.error(`[whatsapp] O WhatsApp recusou a mensagem ${key.id} em ${key.remoteJid}.`);
    }
  });
  sock.ev.on('groups.update', (lista) => lista.forEach((g) => metaGrupos.delete(g.id)));
  sock.ev.on('group-participants.update', ({ id }) => metaGrupos.delete(id));

  // Clone de ofertas: mensagens dos grupos monitorados vão para o callback.
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify' || !aoReceberMensagem || !config.clone.grupos.length) return;
    for (const m of messages) {
      try {
        const jid = m.key?.remoteJid;
        if (!jid || m.key.fromMe || !(await monitorado(jid))) continue;
        const msg = baileys.normalizeMessageContent(m.message) || {};
        const texto = msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption;
        if (!texto) continue;
        const previa = msg.extendedTextMessage?.jpegThumbnail;
        const baixarFoto = (msg.imageMessage || previa?.length) && (async () => {
          if (!msg.imageMessage) {
            console.log('[clone] Capturada imagem da previa do link.');
            return Buffer.from(previa).toString('base64');
          }
          const limite = 5 * 1024 * 1024;
          if (Number(msg.imageMessage.fileLength) > limite) return null;
          const stream = await baileys.downloadContentFromMessage(msg.imageMessage, 'image');
          const partes = [];
          let tamanho = 0;
          for await (const parte of stream) {
            tamanho += parte.length;
            if (tamanho > limite) return null;
            partes.push(parte);
          }
          return tamanho ? Buffer.concat(partes, tamanho).toString('base64') : null;
        });
        await aoReceberMensagem({ grupo: jid, nomeGrupo: nomesGrupos.get(jid) || jid, texto, baixarFoto });
      } catch (e) {
        console.error('[whatsapp] monitor:', e.message);
      }
    }
  });
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      ultimoQr = qr;
      ultimoErro = null;
      console.log('[whatsapp] QR gerado: escaneie pelo painel web (WhatsApp > Aparelhos conectados).');
      const png = path.join(config.pastaDados, 'whatsapp-qr.png');
      fs.mkdirSync(config.pastaDados, { recursive: true });
      await QRCode.toFile(png, qr, { width: 360, margin: 2 }).catch(() => {});
      aoReceberQr?.(png);
    }
    if (connection === 'open') {
      conectado = true;
      ultimoQr = null;
      ultimoErro = null;
      tentativas = 0;
      console.log('[whatsapp] Conectado.');
    }
    if (connection === 'close') {
      conectado = false;
      const codigo = lastDisconnect?.error?.output?.statusCode;
      ultimoErro = explicarErro(codigo);
      tentativas += 1;
      console.log(`[whatsapp] Conexão fechada (código ${codigo ?? '?'}: ${lastDisconnect?.error?.message || 'sem detalhe'}).`);
      if (codigo === DisconnectReason?.loggedOut || codigo === 401) {
        // Sessão encerrada no celular: apaga a sessão e gera um QR novo.
        fs.rmSync(config.whatsapp.pastaSessao, { recursive: true, force: true });
      }
      if (codigo === 403) return;
      const espera = Math.min(60_000, 3000 * Math.max(1, tentativas));
      setTimeout(() => iniciarWhatsApp(opcoes), codigo === 515 ? 1000 : espera);
    }
  });
}

/** Desconecta o número e apaga a sessão (o próximo início pede QR novo). */
export async function desconectarWhatsApp() {
  try {
    await sock?.logout();
  } catch {
    /* já desconectado */
  }
  fs.rmSync(config.whatsapp.pastaSessao, { recursive: true, force: true });
  fs.rmSync(path.join(config.pastaDados, 'whatsapp-qr.png'), { force: true });
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
  // A fila pode conter ofertas anteriores à captura das fotos originais.
  // Resolve a prévia antes de enviar: o envio via API não espera a interface do celular.
  if (comImagem && !oferta.fotoOriginal && !oferta.imagem && oferta.link) {
    const { buscarPrevia } = await import('../lojas/previa.js');
    const { produtoShopee, shopeeConfigurada } = await import('../lojas/shopee.js');
    const previa = await buscarPrevia(oferta.link);
    if (previa.imagem) oferta.imagem = previa.imagem;
    if (!oferta.imagem && oferta.loja === 'shopee' && shopeeConfigurada()) {
      const produto = await produtoShopee(previa.urlFinal || oferta.link).catch(() => null);
      if (produto?.imagem) oferta.imagem = produto.imagem;
    }
    if (!oferta.imagem) {
      const baileys = await import('baileys').catch(() => import('@whiskeysockets/baileys'));
      const info = await baileys.getUrlInfo(previa.urlFinal || oferta.link, {
        thumbnailWidth: 640,
        fetchOpts: { timeout: 12000 },
      }).catch(() => null);
      if (info?.originalThumbnailUrl) oferta.imagem = info.originalThumbnailUrl;
      else if (info?.jpegThumbnail?.length) oferta.fotoOriginal = Buffer.from(info.jpegThumbnail).toString('base64');
    }
    console.log('[whatsapp] Recuperacao da imagem antes do envio:', Boolean(oferta.fotoOriginal || oferta.imagem));
  }
  const resultados = [];
  const destinos = await resolverDestinos(grupos);
  const cartao = comImagem ? await montarCartao(oferta, texto) : null;
  for (const [i, jid] of destinos.entries()) {
    try {
      await conferirPermissao(jid);
      let r;
      if (cartao) {
        r = await sock.sendMessage(jid, cartao).catch((e) => {
          console.error(`[whatsapp] cartao falhou em ${jid} (${e.message}); tentando imagem com legenda.`);
          return null;
        });
      }
      if (!r && comImagem && (oferta.fotoOriginal || oferta.imagem)) {
        const image = oferta.fotoOriginal ? Buffer.from(oferta.fotoOriginal, 'base64') : { url: oferta.imagem };
        r = await sock.sendMessage(jid, { image, caption: texto }).catch((e) => {
          console.error(`[whatsapp] imagem falhou em ${jid} (${e.message}); enviando só o texto.`);
          return null;
        });
      }
      if (!r) r = await sock.sendMessage(jid, { text: texto });
      guardarEnviada(r);
      console.log('[whatsapp] Tipo enviado:', r?.message?.imageMessage ? 'imagem' : r?.message?.extendedTextMessage?.thumbnailDirectPath ? 'cartao (foto grande)' : 'texto');
      console.log(`[whatsapp] enviada para ${nomesGrupos.get(jid) || jid} (id ${r?.key?.id}).`);
      resultados.push({ destino: `whatsapp:${jid}`, ok: true, id: r?.key?.id });
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

/**
 * Cartao de link do WhatsApp: foto grande na largura toda da bolha e o texto embaixo
 * (o formato "imagem + legenda" encolhe a bolha quando a foto e pequena).
 * Desligue com WHATSAPP_CARTAO=false para voltar ao formato antigo.
 */
async function montarCartao(oferta, texto) {
  if (process.env.WHATSAPP_CARTAO === 'false' || !oferta.link) return null;
  try {
    const baileys = await import('baileys').catch(() => import('@whiskeysockets/baileys'));
    let foto = oferta.fotoOriginal ? Buffer.from(oferta.fotoOriginal, 'base64') : null;
    if (!foto && oferta.imagem) {
      const r = await fetch(oferta.imagem, { signal: AbortSignal.timeout(12000) });
      if (r.ok) foto = Buffer.from(await r.arrayBuffer());
    }
    if (!foto) return null;
    const { imageMessage } = await baileys.prepareWAMessageMedia(
      { image: foto },
      { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link' },
    );
    if (!imageMessage) return null;
    const link = oferta.link;
    return {
      text: texto.includes(link) ? texto : `${texto}\n\n${link}`,
      linkPreview: {
        'canonical-url': link,
        'matched-text': link,
        title: '',
        description: '',
        jpegThumbnail: imageMessage.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
        highQualityThumbnail: imageMessage,
      },
    };
  } catch (e) {
    console.error('[whatsapp] nao foi possivel montar o cartao:', e.message);
    return null;
  }
}

const metaGrupos = new Map();
async function metadados(jid) {
  const c = metaGrupos.get(jid);
  if (c && Date.now() - c.quando < 10 * 60_000) return c.meta;
  const meta = await sock.groupMetadata(jid);
  metaGrupos.set(jid, { meta, quando: Date.now() });
  nomesGrupos.set(jid, meta.subject);
  return meta;
}

/** Erro claro quando o bot não está no grupo ou o grupo só deixa administradores enviarem. */
async function conferirPermissao(jid) {
  if (!jid.endsWith('@g.us')) return;
  let meta;
  try {
    meta = await metadados(jid);
  } catch {
    throw new Error('o número do bot não está neste grupo (ou o ID está errado)');
  }
  const meus = [sock.user?.id, sock.user?.lid].filter(Boolean).map((j) => j.split(':')[0].split('@')[0]);
  const eu = meta.participants.find((p) => [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean).some((j) => meus.includes(String(j).split(':')[0].split('@')[0])));
  if (!eu) throw new Error(`o número do bot não participa mais do grupo "${meta.subject}"`);
  if (meta.announce && !eu.admin) throw new Error(`no grupo "${meta.subject}" só administradores enviam: torne o número do bot administrador`);
}

/** Manda uma mensagem de teste e espera alguns segundos para ver se o WhatsApp entregou. */
export async function testarEnvio(jid) {
  if (!sock || !conectado) throw new Error('WhatsApp não conectado.');
  await conferirPermissao(jid);
  const r = await sock.sendMessage(jid, { text: '✅ Teste do Bot de Achadinhos: se você está vendo esta mensagem, o envio para este grupo funciona.' });
  guardarEnviada(r);
  for (let i = 0; i < 8 && (enviadas.get(r.key.id)?.status ?? 1) < 3; i++) await esperar(1000);
  return { grupo: nomesGrupos.get(jid) || jid, ...statusEnvio(r.key.id) };
}

/** Extrai o código de um link de convite (chat.whatsapp.com/XXXX) ou devolve null. */
export function codigoConvite(link) {
  const m = String(link || '').trim().match(/(?:chat\.whatsapp\.com\/(?:invite\/)?)?([A-Za-z0-9]{18,32})\/?$/);
  return m ? m[1] : null;
}

/** O número do bot entra no grupo pelo link de convite. Devolve { id, nome }. */
export async function entrarPorConvite(link) {
  if (!sock || !conectado) throw new Error('WhatsApp não conectado.');
  const codigo = codigoConvite(link);
  if (!codigo) throw new Error('Link de convite inválido. Ele tem o formato https://chat.whatsapp.com/XXXXXXXX');
  let info = null;
  try {
    info = await sock.groupGetInviteInfo(codigo);
  } catch {
    throw new Error('O WhatsApp não reconheceu esse convite (link expirado ou revogado).');
  }
  let id = info?.id;
  try {
    id = (await sock.groupAcceptInvite(codigo)) || id;
  } catch (e) {
    // já participante: segue com o ID do convite
    if (!id) throw new Error(`Não consegui entrar no grupo: ${e.message}`);
  }
  if (id && !id.endsWith('@g.us')) id = `${id}@g.us`;
  cacheGrupos.quando = 0;
  if (id) nomesGrupos.set(id, info?.subject || id);
  return { id, nome: info?.subject || id, aprovacao: Boolean(info?.joinApprovalMode) };
}

/** Nome do grupo, se já conhecido (sem chamar o WhatsApp) — */
export function nomeGrupoEmCache(jid) {
  return nomesGrupos.get(jid) || cacheGrupos.lista.find((g) => g.id === jid)?.nome || jid;
}
