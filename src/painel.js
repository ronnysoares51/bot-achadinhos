import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config, ARQUIVO_CONFIG, lerConfigSalva } from './config.js';
import { statusWhatsApp } from './destinos/whatsapp.js';
import { listar, postsHoje } from './fila.js';
import { diaLocal } from './publicar.js';
import { NOMES } from './lojas/index.js';
import { CHAVES, SECRETOS, telaLogin, telaInicio, telaSalvo } from './painelVisual.js';

export { CAMPOS } from './painelVisual.js';

// Painel web: status, QR do WhatsApp e configurações. Protegido por PAINEL_SENHA.

// Segredo de sessão guardado em disco: o login continua valendo depois que o bot reinicia.
let segredoSessao = null;
function segredo() {
  if (segredoSessao) return segredoSessao;
  const arq = path.join(config.pastaDados, 'sessao.key');
  try {
    segredoSessao = fs.readFileSync(arq);
  } catch {
    segredoSessao = crypto.randomBytes(32);
    fs.mkdirSync(config.pastaDados, { recursive: true });
    fs.writeFileSync(arq, segredoSessao, { mode: 0o600 });
  }
  return segredoSessao;
}
const tokenSessao = () => crypto.createHmac('sha256', segredo()).update(config.painel.senha).digest('hex');
const tentativas = new Map();

function iguais(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function logado(req) {
  const c = Object.fromEntries((req.headers.cookie || '').split(';').map((p) => p.trim().split('=')));
  return Boolean(c.sessao) && iguais(c.sessao, tokenSessao());
}

function lerCorpo(req) {
  return new Promise((ok, erro) => {
    let d = '';
    req.on('data', (c) => {
      d += c;
      if (d.length > 1e5) req.destroy();
    });
    req.on('end', () => ok(Object.fromEntries(new URLSearchParams(d))));
    req.on('error', erro);
  });
}

function dadosInicio(msg) {
  const wa = statusWhatsApp();
  const dia = diaLocal(new Date(), config.agendador.fusoHorario);
  const salvo = lerConfigSalva();
  const temQr = wa.temQr && fs.existsSync(path.join(config.pastaDados, 'whatsapp-qr.png'));
  const fila = listar();
  const temShopee = Boolean(config.shopee.appId && config.shopee.secret);
  return {
    msg,
    telegram: { ok: Boolean(config.telegram.token) },
    whatsapp: wa,
    temQr,
    fila,
    nomes: NOMES,
    postsHoje: postsHoje(dia),
    maxDia: config.agendador.maxPorDia,
    horaInicio: config.agendador.horaInicio,
    horaFim: config.agendador.horaFim,
    intervalo: config.agendador.intervaloMin,
    valor: (k) => (SECRETOS.has(k) ? '' : salvo[k] ?? process.env[k] ?? ''),
    preenchido: (k) => Boolean(salvo[k] || process.env[k]),
    passos: [
      { t: 'Token do Telegram', d: 'Crie o bot no @BotFather e cole o token em Configurações → Telegram.', feito: Boolean(config.telegram.token) },
      { t: 'Seu ID de admin', d: 'Mande /start ao bot no Telegram e cole o ID que ele responder.', feito: config.telegram.admins.length > 0 },
      { t: 'Canal de destino', d: 'Adicione o bot como admin do seu canal e informe o @ do canal.', feito: config.telegram.canais.length > 0 },
      { t: 'Credenciais da Shopee', d: 'App ID e Secret da Open API de afiliados (opcional para as outras lojas).', feito: temShopee },
      { t: 'WhatsApp', d: 'Ligue "Postar no WhatsApp", salve e escaneie o QR com o número do bot.', feito: wa.ativo && wa.conectado },
    ],
  };
}

/** Sem PAINEL_SENHA, cria uma senha aleatória na primeira vez e guarda em dados/painel-senha.txt. */
export function garantirSenha() {
  if (config.painel.senha) return;
  const arq = path.join(config.pastaDados, 'painel-senha.txt');
  try {
    config.painel.senha = fs.readFileSync(arq, 'utf8').trim();
  } catch {
    /* ainda não existe */
  }
  if (!config.painel.senha) {
    config.painel.senha = crypto.randomBytes(9).toString('base64url');
    fs.mkdirSync(config.pastaDados, { recursive: true });
    fs.writeFileSync(arq, config.painel.senha, { mode: 0o600 });
  }
  console.log(`[painel] Senha do painel: ${config.painel.senha}  (guardada em ${arq})`);
}

export function iniciarPainelWeb() {
  garantirSenha();
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const enviar = (codigo, html, extra = {}) => {
      res.writeHead(codigo, { 'Content-Type': 'text/html; charset=utf-8', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store', ...extra });
      res.end(html);
    };
    try {
      if (url.pathname === '/saude') return enviar(200, 'ok');

      if (url.pathname === '/login' && req.method === 'POST') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        const t = tentativas.get(ip) || { n: 0, ate: 0 };
        if (Date.now() < t.ate) return enviar(429, telaLogin('Muitas tentativas. Aguarde 5 minutos.'));
        const { senha } = await lerCorpo(req);
        if (!iguais(senha, config.painel.senha)) {
          t.n += 1;
          if (t.n >= 5) Object.assign(t, { n: 0, ate: Date.now() + 5 * 60_000 });
          tentativas.set(ip, t);
          return enviar(401, telaLogin('Senha incorreta.'));
        }
        tentativas.delete(ip);
        const https = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
        return enviar(303, '', { Location: '/', 'Set-Cookie': `sessao=${tokenSessao()}; HttpOnly; ${https ? 'Secure; ' : ''}SameSite=Strict; Path=/; Max-Age=2592000` });
      }

      if (!logado(req)) return enviar(200, telaLogin());

      if (url.pathname === '/sair') return enviar(303, '', { Location: '/', 'Set-Cookie': 'sessao=; Max-Age=0; Path=/' });

      if (url.pathname === '/qr.png') {
        const png = path.join(config.pastaDados, 'whatsapp-qr.png');
        if (!fs.existsSync(png)) return enviar(404, 'sem QR');
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
        return fs.createReadStream(png).pipe(res);
      }

      if (url.pathname === '/config' && req.method === 'POST') {
        const dados = await lerCorpo(req);
        const atual = lerConfigSalva();
        for (const [k, v] of Object.entries(dados)) {
          if (!CHAVES.has(k)) continue;
          const val = String(v).trim();
          if (SECRETOS.has(k) && !val) continue; // segredo em branco = manter
          atual[k] = val;
        }
        fs.mkdirSync(path.dirname(ARQUIVO_CONFIG), { recursive: true });
        fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(atual, null, 2), { mode: 0o600 });
        enviar(200, telaSalvo());
        // O Docker (restart: unless-stopped) sobe o bot de novo com a configuração nova.
        setTimeout(() => process.exit(0), 800);
        return;
      }

      return enviar(200, telaInicio(dadosInicio(url.searchParams.get('msg'))));
    } catch (e) {
      console.error('[painel]', e);
      return enviar(500, 'Erro interno');
    }
  });
  servidor.listen(config.painel.porta, () => console.log(`[painel] Web em http://0.0.0.0:${config.painel.porta}`));
  return servidor;
}
