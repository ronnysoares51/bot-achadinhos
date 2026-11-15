import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config, ARQUIVO_CONFIG, lerConfigSalva } from './config.js';
import { statusWhatsApp } from './destinos/whatsapp.js';
import { listar, postsHoje } from './fila.js';
import { diaLocal } from './publicar.js';
import { NOMES } from './lojas/index.js';

// Painel web: status, QR do WhatsApp e configurações. Protegido por PAINEL_SENHA.

export const CAMPOS = [
  ['Telegram', [
    ['TELEGRAM_BOT_TOKEN', 'Token do bot (@BotFather)', true],
    ['TELEGRAM_ADMINS', 'IDs dos admins (mande /start ao bot para ver o seu)'],
    ['TELEGRAM_CANAIS', 'Canais de destino (ex.: @meucanal)'],
  ]],
  ['WhatsApp', [
    ['WHATSAPP_ATIVO', 'Ativo (true/false)'],
    ['WHATSAPP_GRUPOS', 'IDs dos grupos (use /grupos no Telegram)'],
    ['WHATSAPP_PAUSA_MIN', 'Pausa mínima entre grupos (s)'],
    ['WHATSAPP_PAUSA_MAX', 'Pausa máxima entre grupos (s)'],
  ]],
  ['Shopee', [
    ['SHOPEE_APP_ID', 'App ID da Open API'],
    ['SHOPEE_SECRET', 'Secret da Open API', true],
    ['SHOPEE_SUB_ID', 'Sub ID dos links'],
  ]],
  ['Mercado Livre e Shein', [
    ['ML_MATT_WORD', 'ML: matt_word (etiqueta)'],
    ['ML_MATT_TOOL', 'ML: matt_tool'],
    ['SHEIN_PARAMETROS', 'Shein: parâmetros extras (opcional)'],
  ]],
  ['Agendamento', [
    ['POST_INTERVALO_MIN', 'Intervalo entre posts (min)'],
    ['POST_HORA_INICIO', 'Hora de início'],
    ['POST_HORA_FIM', 'Hora de fim'],
    ['POST_MAX_DIA', 'Máximo de posts por dia'],
  ]],
  ['Busca automática na Shopee', [
    ['AUTO_SHOPEE', 'Ativa (true/false)'],
    ['AUTO_SHOPEE_PALAVRAS', 'Palavras-chave (separadas por vírgula)'],
    ['AUTO_SHOPEE_DESCONTO_MIN', 'Desconto mínimo (%)'],
    ['AUTO_SHOPEE_NOTA_MIN', 'Nota mínima'],
    ['AUTO_SHOPEE_INTERVALO_H', 'A cada quantas horas'],
  ]],
];
const CHAVES = new Set(CAMPOS.flatMap(([, c]) => c.map(([k]) => k)));
const SECRETOS = new Set(CAMPOS.flatMap(([, c]) => c.filter((x) => x[2]).map(([k]) => k)));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

const pagina = (titulo, corpo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><meta name="robots" content="noindex">
<style>
body{font-family:system-ui,sans-serif;background:#f6f5f2;color:#1d1d1b;margin:0}
main{max-width:760px;margin:0 auto;padding:24px 16px 60px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px}
.card{background:#fff;border:1px solid #e4e2dc;border-radius:10px;padding:16px;margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.k{font-size:12px;color:#6b6a65}.v{font-size:20px;font-weight:600}
label{display:block;font-size:13px;margin:10px 0 4px;color:#3a3935}
input{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #d6d3cb;border-radius:7px;font-size:14px}
button{background:#e8590c;color:#fff;border:0;border-radius:8px;padding:11px 18px;font-size:15px;cursor:pointer}
.ok{color:#2b8a3e}.ruim{color:#c92a2a}.aviso{background:#fff4e6;border-color:#ffd8a8}
table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 4px;border-top:1px solid #eee}
img.qr{width:260px;max-width:100%;image-rendering:pixelated}
</style></head><body><main>${corpo}</main></body></html>`;

function telaLogin(erro) {
  return pagina('Entrar', `<h1>🛍️ Bot de Achadinhos</h1><div class="card"><form method="post" action="/login">
  <label>Senha do painel</label><input type="password" name="senha" autofocus>
  ${erro ? `<p class="ruim">${erro}</p>` : ''}<p><button>Entrar</button></p></form></div>`);
}

function telaInicio(msg) {
  const wa = statusWhatsApp();
  const dia = diaLocal(new Date(), config.agendador.fusoHorario);
  const salvo = lerConfigSalva();
  const valor = (k) => (SECRETOS.has(k) ? '' : salvo[k] ?? process.env[k] ?? '');
  const temQr = wa.temQr && fs.existsSync(path.join(config.pastaDados, 'whatsapp-qr.png'));
  const fila = listar();

  const waTxt = !wa.ativo ? 'desligado' : wa.conectado ? '<span class="ok">conectado</span>' : '<span class="ruim">desconectado</span>';
  const tgTxt = config.telegram.token ? '<span class="ok">configurado</span>' : '<span class="ruim">falta o token</span>';

  return pagina('Bot de Achadinhos', `
  <h1>🛍️ Bot de Achadinhos</h1><div class="k">Mercado Livre · Shopee · Shein · TikTok Shop</div>
  ${msg ? `<div class="card aviso">${msg}</div>` : ''}
  <h2>Status</h2>
  <div class="grid">
    <div class="card"><div class="k">Telegram</div><div class="v">${tgTxt}</div></div>
    <div class="card"><div class="k">WhatsApp</div><div class="v">${waTxt}</div></div>
    <div class="card"><div class="k">Na fila</div><div class="v">${fila.length}</div></div>
    <div class="card"><div class="k">Posts hoje</div><div class="v">${postsHoje(dia)}/${config.agendador.maxPorDia}</div></div>
  </div>
  ${temQr ? `<div class="card"><b>Conecte o WhatsApp</b><p>No celular: WhatsApp → Aparelhos conectados → Conectar aparelho, e escaneie:</p>
    <img class="qr" src="/qr.png?t=${Date.now()}" alt="QR do WhatsApp"><p class="k">A página atualiza sozinha a cada 20 s.</p>
    <script>setTimeout(()=>location.reload(),20000)</script></div>` : ''}
  ${!config.telegram.token ? '<div class="card aviso">Comece preenchendo o <b>token do Telegram</b> abaixo e salvando. Depois mande /start ao bot no Telegram para descobrir seu ID de admin.</div>' : ''}
  <h2>Fila</h2><div class="card">${fila.length ? `<table>${fila.slice(0, 20).map((o) => `<tr><td>${esc(NOMES[o.loja])}</td><td>${esc(String(o.titulo).slice(0, 70))}</td></tr>`).join('')}</table>` : 'Vazia. Mande links ao bot no privado do Telegram.'}</div>
  <h2>Configurações</h2>
  <form method="post" action="/config">
  ${CAMPOS.map(([grupo, campos]) => `<div class="card"><b>${grupo}</b>${campos.map(([k, rot, sec]) => `
    <label for="${k}">${rot}${sec && (salvo[k] || process.env[k]) ? ' <span class="k">(já preenchido: deixe vazio para manter)</span>' : ''}</label>
    <input id="${k}" name="${k}" ${sec ? 'type="password" autocomplete="new-password"' : ''} value="${esc(valor(k))}">`).join('')}</div>`).join('')}
  <button>Salvar e reiniciar o bot</button></form>
  <p class="k" style="margin-top:24px"><a href="/sair">Sair</a></p>`);
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
        enviar(200, pagina('Salvo', '<div class="card">✅ Salvo. Reiniciando o bot... <script>setTimeout(()=>location.href="/",6000)</script></div>'));
        // O Docker (restart: unless-stopped) sobe o bot de novo com a configuração nova.
        setTimeout(() => process.exit(0), 800);
        return;
      }

      return enviar(200, telaInicio(url.searchParams.get('msg')));
    } catch (e) {
      console.error('[painel]', e);
      return enviar(500, 'Erro interno');
    }
  });
  servidor.listen(config.painel.porta, () => console.log(`[painel] Web em http://0.0.0.0:${config.painel.porta}`));
}
