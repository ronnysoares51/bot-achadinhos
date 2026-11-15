import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config, ARQUIVO_CONFIG, lerConfigSalva } from './config.js';
import { statusWhatsApp, listarGrupos, desconectarWhatsApp } from './destinos/whatsapp.js';
import { listarAutomacoes, obterAutomacao, salvarAutomacao, excluirAutomacao, alternarAutomacao, normalizar } from './automacoes.js';
import { listar, postsHoje, listarEnviados, clonesHoje, remover } from './fila.js';
import { publicar } from './publicar.js';
import { MODELO_PADRAO } from './formatar.js';
import { diaLocal } from './publicar.js';
import { NOMES } from './lojas/index.js';
import { CHAVES, SECRETOS, telaLogin, telaInicio, telaSalvo, telaAutomacao, telaLojas, telaClone } from './painelVisual.js';
import { gerarMeliLaUm, normalizarCookies } from './lojas/mlLinkbuilder.js';

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

function lerForm(req) {
  return new Promise((ok, erro) => {
    let d = '';
    req.on('data', (c) => {
      d += c;
      if (d.length > 2e5) req.destroy();
    });
    req.on('end', () => ok(new URLSearchParams(d)));
    req.on('error', erro);
  });
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

const CHAVES_LOJAS = ['ML_ETIQUETA', 'ML_COOKIES', 'ML_MATT_TOOL', 'SHOPEE_APP_ID', 'SHOPEE_SECRET', 'SHOPEE_SUB_ID', 'SHEIN_PARAMETROS'];
const SECRETOS_LOJAS = new Set(['ML_COOKIES', 'SHOPEE_SECRET']);

function dadosLojas(msg, teste) {
  return {
    msg,
    teste,
    lojas: {
      ml: { etiqueta: config.mercadolivre.etiqueta, temCookies: Boolean(config.mercadolivre.cookies), mattTool: config.mercadolivre.mattTool },
      shopee: { appId: config.shopee.appId, temSecret: Boolean(config.shopee.secret), subId: config.shopee.subId },
      shein: { parametros: config.shein.parametros },
    },
  };
}

/** Salva as lojas no config.json e já aplica na hora (não precisa reiniciar). */
function salvarLojas(f) {
  const atual = lerConfigSalva();
  for (const k of CHAVES_LOJAS) {
    if (!f.has(k)) continue;
    let v = String(f.get(k) || '').replace(/\r\n/g, '\n').trim();
    if (SECRETOS_LOJAS.has(k) && !v) continue; // segredo em branco = manter
    if (k === 'ML_COOKIES') v = normalizarCookies(v);
    atual[k] = v;
    process.env[k] = v;
  }
  fs.mkdirSync(path.dirname(ARQUIVO_CONFIG), { recursive: true });
  fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(atual, null, 2), { mode: 0o600 });
  const e = process.env;
  Object.assign(config.mercadolivre, { etiqueta: e.ML_ETIQUETA || '', cookies: e.ML_COOKIES || '', mattWord: e.ML_ETIQUETA || e.ML_MATT_WORD || '', mattTool: e.ML_MATT_TOOL || '' });
  Object.assign(config.shopee, { appId: e.SHOPEE_APP_ID || '', secret: e.SHOPEE_SECRET || '', subId: e.SHOPEE_SUB_ID || 'achadinhos' });
  config.shein.parametros = e.SHEIN_PARAMETROS || '';
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
    postsHoje: listarAutomacoes().reduce((t, a) => t + (a.estado.dia === dia ? a.estado.enviadosDia : 0), 0),
    maxDia: listarAutomacoes().filter((a) => a.ativa).reduce((t, a) => t + a.maxDia, 0) || config.agendador.maxPorDia,
    horaInicio: config.agendador.horaInicio,
    horaFim: config.agendador.horaFim,
    intervalo: config.agendador.intervaloMin,
    valor: (k) => (SECRETOS.has(k) ? '' : salvo[k] ?? process.env[k] ?? (k === 'MODELO_MENSAGEM' ? MODELO_PADRAO : '')),
    enviados: listarEnviados(),
    automacoes: listarAutomacoes(),
    diaHoje: diaLocal(new Date(), config.agendador.fusoHorario),
    cloneAtivo: config.clone.grupos.length > 0,
    clone: { grupos: config.clone.grupos.length, automatico: config.clone.automatico },
    clonesHoje: clonesHoje(),
    hora: (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: config.agendador.fusoHorario, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    preenchido: (k) => Boolean(salvo[k] || process.env[k]),
    passos: [
      { t: 'Token do Telegram', d: 'Crie o bot no @BotFather e cole o token em Configurações → Telegram.', feito: Boolean(config.telegram.token) },
      { t: 'Seu ID de admin', d: 'Mande /start ao bot no Telegram e cole o ID que ele responder.', feito: config.telegram.admins.length > 0 },
      { t: 'Primeira automação', d: 'Em Automações → Nova automação: escolha o canal/grupos, as ofertas e o ritmo.', feito: listarAutomacoes().some((a) => a.destinos.telegram.length || a.destinos.whatsapp.length) },
      { t: 'Minhas lojas', d: 'Conecte o Mercado Livre e a Shopee no botão "Minhas lojas", no topo do painel.', feito: temShopee || Boolean(config.mercadolivre.etiqueta && config.mercadolivre.cookies) },
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

      if (url.pathname === '/clone' && req.method === 'GET') {
        const wa = statusWhatsApp();
        const grupos = wa.conectado ? await listarGrupos().catch(() => null) : null;
        return enviar(200, telaClone({ grupos, selecionados: config.clone.grupos, automatico: config.clone.automatico, maxHora: config.clone.maxHora, waAtivo: wa.ativo, msg: url.searchParams.get('msg') }));
      }

      if (url.pathname === '/clone' && req.method === 'POST') {
        const f = await lerForm(req);
        const grupos = [...f.getAll('grupos'), ...String(f.get('extras') || '').split(',')].map((g) => g.trim()).filter(Boolean);
        const automatico = f.getAll('automatico').includes('true');
        const maxHora = Math.max(1, Math.min(120, Number(f.get('maxHora')) || 10));
        const atual = lerConfigSalva();
        Object.assign(atual, { WHATSAPP_MONITORAR: grupos.join(','), CLONE_AUTOMATICO: String(automatico), CLONE_MAX_HORA: String(maxHora) });
        fs.mkdirSync(path.dirname(ARQUIVO_CONFIG), { recursive: true });
        fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(atual, null, 2), { mode: 0o600 });
        Object.assign(config.clone, { grupos, automatico, maxHora }); // vale na hora, sem reiniciar
        return enviar(303, '', { Location: '/clone?msg=' + encodeURIComponent(`Salvo: ${grupos.length} grupo(s) monitorado(s).`) });
      }

      if (url.pathname === '/lojas' && req.method === 'GET') return enviar(200, telaLojas(dadosLojas(url.searchParams.get('msg'))));

      if (url.pathname === '/lojas' && req.method === 'POST') {
        salvarLojas(await lerForm(req));
        return enviar(303, '', { Location: '/lojas?msg=' + encodeURIComponent('Lojas salvas. Já estão valendo para os próximos links.') });
      }

      if (url.pathname === '/lojas/testar-ml' && req.method === 'POST') {
        salvarLojas(await lerForm(req));
        let teste;
        try {
          const link = await gerarMeliLaUm('https://www.mercadolivre.com.br/ofertas');
          teste = { ok: true, texto: `Funcionou! O Mercado Livre gerou ${link} na sua conta. A partir de agora todo link do ML sai com a sua comissão.` };
        } catch (e) {
          teste = { ok: false, texto: `Não deu certo: ${e.message}` };
        }
        return enviar(200, telaLojas(dadosLojas(null, teste)));
      }

      if (url.pathname === '/whatsapp/ligar' && req.method === 'POST') {
        const atual = lerConfigSalva();
        atual.WHATSAPP_ATIVO = 'true';
        fs.mkdirSync(path.dirname(ARQUIVO_CONFIG), { recursive: true });
        fs.writeFileSync(ARQUIVO_CONFIG, JSON.stringify(atual, null, 2), { mode: 0o600 });
        enviar(200, telaSalvo());
        setTimeout(() => process.exit(0), 800);
        return;
      }

      if (url.pathname === '/whatsapp/desconectar' && req.method === 'POST') {
        await desconectarWhatsApp();
        enviar(200, telaSalvo());
        setTimeout(() => process.exit(0), 800);
        return;
      }

      if (url.pathname === '/automacao' && req.method === 'GET') {
        const id = url.searchParams.get('id');
        const existente = id ? obterAutomacao(id) : null;
        if (id && !existente) return enviar(303, '', { Location: '/?msg=' + encodeURIComponent('Automação não encontrada.') });
        const wa = statusWhatsApp();
        const gruposWa = wa.conectado ? await listarGrupos({ usarCache: true }).catch(() => null) : null;
        const a = existente || normalizar({ nome: '', fontes: ['manual', 'clone'], dias: [0, 1, 2, 3, 4, 5, 6] });
        return enviar(200, telaAutomacao({ a, nova: !existente, gruposWa, waAtivo: wa.ativo, modeloPadrao: process.env.MODELO_MENSAGEM || MODELO_PADRAO }));
      }

      if (url.pathname === '/automacao' && req.method === 'POST') {
        const f = await lerForm(req);
        const anterior = f.get('id') ? obterAutomacao(f.get('id')) : null;
        const modeloPadrao = process.env.MODELO_MENSAGEM || MODELO_PADRAO;
        const modelo = (f.get('modelo') || '').replace(/\r\n/g, '\n').trim();
        const lojas = f.getAll('lojas');
        const a = salvarAutomacao({
          id: anterior?.id,
          nome: f.get('nome') || 'Automação',
          ativa: f.getAll('ativa').includes('true'),
          destinos: {
            telegram: f.get('telegram') || '',
            whatsapp: [...f.getAll('whatsapp'), ...(f.get('whatsapp_extra') || '').split(/[,\s]+/)].filter(Boolean),
          },
          fontes: f.getAll('fontes'),
          buscaShopee: { palavras: f.get('shopee_palavras'), descontoMin: f.get('shopee_desconto'), notaMin: f.get('shopee_nota'), intervaloHoras: f.get('shopee_intervalo'), porPalavra: f.get('shopee_por_palavra') },
          lojas: lojas.length === 4 ? [] : lojas,
          precoMin: f.get('precoMin'),
          precoMax: f.get('precoMax'),
          descontoMin: f.get('descontoMin'),
          incluir: f.get('incluir'),
          excluir: f.get('excluir'),
          intervaloMin: f.get('intervaloMin'),
          maxDia: f.get('maxDia'),
          horaInicio: f.get('horaInicio'),
          horaFim: f.get('horaFim'),
          dias: f.getAll('dias'),
          formato: f.get('formato'),
          modelo: modelo === modeloPadrao.trim() ? '' : modelo,
        });
        const aviso = !a.destinos.telegram.length && !a.destinos.whatsapp.length ? ' Atenção: ela ainda não tem nenhum destino.' : '';
        return enviar(303, '', { Location: '/?msg=' + encodeURIComponent(`Automação "${a.nome}" salva.${aviso}`) + '#automacoes' });
      }

      if (url.pathname === '/automacao/acao' && req.method === 'POST') {
        const { id, acao } = await lerCorpo(req);
        let msg = 'Automação não encontrada.';
        if (acao === 'excluir' && excluirAutomacao(id)) msg = 'Automação excluída.';
        if (acao === 'alternar') {
          const a = alternarAutomacao(id);
          if (a) msg = `Automação "${a.nome}" ${a.ativa ? 'ligada' : 'desligada'}.`;
        }
        return enviar(303, '', { Location: '/?msg=' + encodeURIComponent(msg) + '#automacoes' });
      }

      if (url.pathname === '/fila' && req.method === 'POST') {
        const { id, acao } = await lerCorpo(req);
        const oferta = listar().find((o) => o.id === id);
        let msg = 'Oferta não encontrada na fila.';
        if (oferta && acao === 'remover') msg = remover(id) ? 'Oferta removida da fila.' : msg;
        if (oferta && acao === 'postar') {
          const res = await publicar(oferta, config.agendador.fusoHorario);
          const ok = res.filter((r) => r.ok).length;
          msg = res.length ? `Postada em ${ok} de ${res.length} destino(s).` : 'Nenhum destino configurado (canal do Telegram ou grupos do WhatsApp).';
        }
        return enviar(303, '', { Location: `/?msg=${encodeURIComponent(msg)}` });
      }

      if (url.pathname === '/config' && req.method === 'POST') {
        const dados = await lerCorpo(req);
        const atual = lerConfigSalva();
        for (const [k, v] of Object.entries(dados)) {
          if (!CHAVES.has(k)) continue;
          const val = String(v).replace(/\r\n/g, '\n').trim();
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
