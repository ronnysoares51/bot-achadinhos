// Visual do painel web (HTML + CSS sem dependências externas).

import { VARIAVEIS as VARIAVEIS_UI } from './formatar.js';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Ícones no estilo Lucide (traço 2px), inline para não depender de CDN.
const P = {
  sacola: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  lista: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  grafico: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
  loja: '<path d="m2 7 4.4-4.4A2 2 0 0 1 7.8 2h8.4a2 2 0 0 1 1.4.6L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M2 7h20"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  cadeado: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  salvar: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  seta: '<path d="m6 9 6 6 6-6"/>',
  ima: '<path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/>',
  texto: '<path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>',
  envio: '<path d="M12 2v20"/><path d="m17 7-5-5-5 5"/>',
  lixo: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  alerta: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

export const CAMPOS = [
  { titulo: 'Telegram', icone: 'send', desc: 'É o painel de comando do bot: você cola os links no privado dele.', campos: [
    { k: 'TELEGRAM_BOT_TOKEN', rot: 'Token do bot', ajuda: 'Crie o bot no @BotFather e cole o token aqui.', tipo: 'segredo' },
    { k: 'TELEGRAM_ADMINS', rot: 'IDs dos admins', ajuda: 'Mande /start ao seu bot: ele responde com o seu ID.' },
    { k: 'TELEGRAM_CANAIS', rot: 'Canais de destino', ajuda: 'Ex.: @meucanal. O bot precisa ser administrador do canal.' },
  ] },
  { titulo: 'WhatsApp', icone: 'msg', desc: 'Conexão não oficial: use um número só para o bot.', campos: [
    { k: 'WHATSAPP_ATIVO', rot: 'Postar no WhatsApp', tipo: 'switch' },
    { k: 'WHATSAPP_GRUPOS', rot: 'IDs dos grupos', ajuda: 'Mande /grupos ao bot no Telegram para ver os IDs.' },
    { k: 'WHATSAPP_PAUSA_MIN', rot: 'Pausa mínima entre grupos', ajuda: 'Em segundos.', tipo: 'numero' },
    { k: 'WHATSAPP_PAUSA_MAX', rot: 'Pausa máxima entre grupos', ajuda: 'Em segundos.', tipo: 'numero' },
  ] },
  { titulo: 'Clone de ofertas', icone: 'ima', desc: 'Acompanha grupos de ofertas de outras pessoas e traz as promoções já com o SEU link (Shopee e Mercado Livre).', campos: [
    { k: 'WHATSAPP_MONITORAR', rot: 'Grupos monitorados', ajuda: 'IDs (ou nomes exatos) dos grupos de outras pessoas. O número do bot precisa estar neles. Use /grupos no Telegram.' },
    { k: 'CLONE_AUTOMATICO', rot: 'Colocar na fila sem me perguntar', tipo: 'switch', ajuda: 'Desligado: cada oferta chega no seu Telegram para você aprovar.' },
    { k: 'CLONE_MAX_HORA', rot: 'Máximo de ofertas clonadas por hora', tipo: 'numero' },
  ] },
  { titulo: 'Modelo da mensagem', icone: 'texto', desc: 'O texto de cada post. Use as variáveis; linhas com variável vazia somem sozinhas.', campos: [
    { k: 'MODELO_MENSAGEM', rot: 'Modelo', tipo: 'modelo' },
  ] },
  { titulo: 'Shopee', icone: 'loja', desc: 'Gera o link de afiliado sozinho pela API oficial.', campos: [
    { k: 'SHOPEE_APP_ID', rot: 'App ID', ajuda: 'Programa de afiliados → Open API.' },
    { k: 'SHOPEE_SECRET', rot: 'Secret', tipo: 'segredo' },
    { k: 'SHOPEE_SUB_ID', rot: 'Sub ID dos links', ajuda: 'Aparece no relatório de vendas da Shopee.' },
  ] },
  { titulo: 'Mercado Livre e Shein', icone: 'sacola', desc: 'No ML, links meli.la funcionam sem configurar nada. Shein e TikTok Shop: cole o seu link de afiliado.', campos: [
    { k: 'ML_MATT_WORD', rot: 'Mercado Livre: matt_word', ajuda: 'Sua etiqueta de afiliado (opcional).' },
    { k: 'ML_MATT_TOOL', rot: 'Mercado Livre: matt_tool', ajuda: 'Opcional, junto com o matt_word.' },
    { k: 'SHEIN_PARAMETROS', rot: 'Shein: parâmetros extras', ajuda: 'Opcional. Ex.: url_from=SEU_ID' },
  ] },
  { titulo: 'Agendamento', icone: 'relogio', desc: 'Quando e quanto a fila é postada.', campos: [
    { k: 'POST_INTERVALO_MIN', rot: 'Intervalo entre posts', ajuda: 'Em minutos.', tipo: 'numero' },
    { k: 'POST_MAX_DIA', rot: 'Máximo de posts por dia', tipo: 'numero' },
    { k: 'POST_HORA_INICIO', rot: 'Começa às', ajuda: 'Hora (0–23).', tipo: 'numero' },
    { k: 'POST_HORA_FIM', rot: 'Termina às', ajuda: 'Hora (0–23).', tipo: 'numero' },
  ] },
  { titulo: 'Busca automática na Shopee', icone: 'busca', desc: 'Procura ofertas sozinho e coloca na fila.', campos: [
    { k: 'AUTO_SHOPEE', rot: 'Busca automática ligada', tipo: 'switch' },
    { k: 'AUTO_SHOPEE_PALAVRAS', rot: 'Palavras-chave', ajuda: 'Separadas por vírgula. Ex.: fone bluetooth, air fryer' },
    { k: 'AUTO_SHOPEE_DESCONTO_MIN', rot: 'Desconto mínimo (%)', tipo: 'numero' },
    { k: 'AUTO_SHOPEE_NOTA_MIN', rot: 'Nota mínima', ajuda: 'De 0 a 5.', tipo: 'numero' },
    { k: 'AUTO_SHOPEE_INTERVALO_H', rot: 'Buscar a cada (horas)', tipo: 'numero' },
  ] },
];
export const CHAVES = new Set(CAMPOS.flatMap((g) => g.campos.map((c) => c.k)));
export const SECRETOS = new Set(CAMPOS.flatMap((g) => g.campos.filter((c) => c.tipo === 'segredo').map((c) => c.k)));

const CSS = `
:root{--bg:#f6f5f3;--surface:#fff;--surface-2:#fbfaf8;--border:#e7e4df;--text:#1c1917;--muted:#5f5a54;
--primary:#c2410c;--primary-hover:#9a3412;--primary-soft:#fff1e8;--ok:#15803d;--ok-soft:#e9f7ee;--bad:#b91c1c;--bad-soft:#fdecec;
--warn:#a16207;--warn-soft:#fef6e1;--on-primary:#fff;--shadow:0 1px 2px rgba(28,25,23,.05),0 4px 16px rgba(28,25,23,.05);--r:14px;
--font:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
@media (prefers-color-scheme:dark){:root{--bg:#141210;--surface:#1d1a17;--surface-2:#24201c;--border:#332e29;--text:#f5f2ee;--muted:#b3aca4;
--primary:#fb7a3c;--primary-hover:#ff9a66;--primary-soft:#3a2216;--ok:#4ade80;--ok-soft:#14301f;--bad:#f87171;--bad-soft:#3a1a1a;
--warn:#fbbf24;--warn-soft:#3a2e12;--shadow:0 1px 2px rgba(0,0,0,.3),0 4px 16px rgba(0,0,0,.25);--on-primary:#1c1917}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:var(--font);font-size:16px;line-height:1.5;background:var(--bg);color:var(--text)}
.ic{width:20px;height:20px;flex:none}
a{color:var(--primary)}
:focus-visible{outline:3px solid var(--primary);outline-offset:2px;border-radius:6px}
.topo{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.topo .in{max-width:1080px;margin:0 auto;padding:12px 20px;display:flex;align-items:center;gap:12px}
.marca{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;letter-spacing:-.01em}
.logo{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#ea580c,#c2410c)}
.lojas{display:flex;gap:6px;margin-left:auto;flex-wrap:wrap}
.sair{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:10px;color:var(--muted);text-decoration:none;font-size:14px;font-weight:500}
.sair:hover{background:var(--surface);color:var(--text)}
main{max-width:1080px;margin:0 auto;padding:28px 20px 80px}
h1{font-size:28px;line-height:1.2;margin:0;letter-spacing:-.02em}
h2{font-size:18px;line-height:1.3;margin:0}
.sub{color:var(--muted);margin:4px 0 0}
.secao{margin-top:32px}
.secao>.cab{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.grade{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(185px,1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--shadow)}
.stat{padding:18px;display:flex;gap:14px;align-items:flex-start}
.stat .bolha{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary)}
.stat .k{font-size:13px;color:var(--muted);font-weight:500}
.stat .v{font-size:22px;font-weight:700;letter-spacing:-.01em;line-height:1.25;margin-top:2px}
.pill{white-space:nowrap;display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:13px;font-weight:600}
.pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.pill.ok{background:var(--ok-soft);color:var(--ok)}.pill.bad{background:var(--bad-soft);color:var(--bad)}.pill.off{background:var(--surface-2);color:var(--muted)}
.barra{height:6px;border-radius:9px;background:var(--surface-2);overflow:hidden;margin-top:10px;border:1px solid var(--border)}
.barra i{display:block;height:100%;background:var(--primary);border-radius:9px;transition:width .4s ease-out}
.aviso{display:flex;gap:12px;padding:14px 16px;border-radius:12px;background:var(--warn-soft);color:var(--text);border:1px solid color-mix(in srgb,var(--warn) 30%,transparent);margin-top:20px}
.aviso .ic{color:var(--warn);margin-top:2px}
.aviso.ok{background:var(--ok-soft);border-color:color-mix(in srgb,var(--ok) 30%,transparent)}.aviso.ok .ic{color:var(--ok)}
.passos{padding:6px 0}
.passo{display:flex;gap:14px;align-items:flex-start;padding:14px 18px;border-top:1px solid var(--border)}
.passo:first-child{border-top:0}
.num{width:28px;height:28px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:13px;font-weight:700;border:2px solid var(--border);color:var(--muted)}
.num .ic{width:16px;height:16px}
.passo.feito .num{background:var(--ok);border-color:var(--ok);color:#fff}
.passo.feito .t{color:var(--muted);text-decoration:line-through}
.passo .t{font-weight:600}.passo .d{font-size:14px;color:var(--muted)}
.qrbox{display:grid;grid-template-columns:auto 1fr;gap:24px;padding:22px;align-items:center}
.qrbox img{width:220px;height:220px;border-radius:12px;background:#fff;padding:10px;image-rendering:pixelated;border:1px solid var(--border)}
@media (max-width:640px){.qrbox{grid-template-columns:1fr;justify-items:center;text-align:center}}
.fila{list-style:none;margin:0;padding:0}
.fila li{display:flex;align-items:center;gap:12px;padding:12px 18px;border-top:1px solid var(--border)}
.fila li:first-child{border-top:0}
.fila .tit{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fila .preco{font-weight:700;font-variant-numeric:tabular-nums}
.vazio{padding:32px 18px;text-align:center;color:var(--muted)}
.vazio .ic{width:32px;height:32px;margin-bottom:6px;color:var(--border)}
.tag{display:inline-flex;align-items:center;padding:3px 9px;border-radius:7px;font-size:12px;font-weight:700;white-space:nowrap}
.tag.mercadolivre{background:#ffe600;color:#2d3277}.tag.shopee{background:#ee4d2d;color:#fff}
.tag.shein{background:#111;color:#fff;border:1px solid #444}.tag.tiktokshop{background:#111;color:#fff;box-shadow:inset 2px 0 0 #25f4ee,inset -2px 0 0 #fe2c55}
details.grupo{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--shadow);margin-bottom:12px}
details.grupo>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px 18px;min-height:64px}
details.grupo>summary::-webkit-details-marker{display:none}
details.grupo>summary .bolha{width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);flex:none}
details.grupo>summary .txt{flex:1}details.grupo>summary .d{font-size:14px;color:var(--muted)}
details.grupo>summary .seta{transition:transform .2s ease-out;color:var(--muted)}
details.grupo[open]>summary .seta{transform:rotate(180deg)}
.campos{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));padding:4px 18px 20px;border-top:1px solid var(--border);padding-top:18px}
label.l{display:block;font-size:14px;font-weight:600;margin-bottom:6px}
.ajuda{display:block;font-size:13px;color:var(--muted);margin-top:5px}
input.in,textarea.in{width:100%;min-height:44px;padding:10px 12px;font:inherit;font-size:15px;color:var(--text);background:var(--surface-2);border:1px solid var(--border);border-radius:10px;transition:border-color .15s,box-shadow .15s}
input.in:hover{border-color:color-mix(in srgb,var(--muted) 45%,var(--border))}
input.in:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 22%,transparent)}
.switch{display:flex;align-items:center;gap:12px;min-height:44px;cursor:pointer;font-weight:600;font-size:14px}
.switch input{appearance:none;width:46px;height:26px;border-radius:99px;background:var(--border);position:relative;cursor:pointer;transition:background .2s;flex:none;margin:0}
.switch input::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s ease-out}
.switch input:checked{background:var(--primary)}.switch input:checked::after{transform:translateX(20px)}
.ja{font-size:12px;font-weight:600;color:var(--ok);background:var(--ok-soft);padding:1px 8px;border-radius:99px;margin-left:6px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border:0;border-radius:12px;font:inherit;font-weight:700;font-size:15px;color:var(--on-primary);background:var(--primary);cursor:pointer;transition:background .15s,transform .1s}
.btn:hover{background:var(--primary-hover)}.btn:active{transform:translateY(1px)}
.btn[disabled]{opacity:.65;cursor:progress}
.salvar{position:sticky;bottom:16px;display:flex;justify-content:flex-end;margin-top:8px}
.salvar .btn{box-shadow:0 8px 24px color-mix(in srgb,var(--primary) 35%,transparent)}
.login{min-height:100vh;display:grid;place-items:center;padding:20px}
.login .card{width:100%;max-width:400px;padding:32px}
.login .logo{width:52px;height:52px;border-radius:14px;margin-bottom:18px}
.login .logo .ic{width:26px;height:26px}
.login .btn{width:100%;margin-top:18px}
.erro{display:flex;gap:8px;align-items:center;color:var(--bad);background:var(--bad-soft);padding:10px 12px;border-radius:10px;font-size:14px;margin-top:14px}
.rodape{margin-top:40px;text-align:center;font-size:13px;color:var(--muted)}
@media (max-width:640px){.salvar{bottom:0;margin:8px -14px 0;padding:12px 14px calc(12px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 92%,transparent);backdrop-filter:blur(8px);border-top:1px solid var(--border)}.salvar .btn{width:100%;box-shadow:none}h1{font-size:23px}.lojas{display:none}.topo .in{padding:10px 14px}main{padding:20px 14px 80px}}
textarea.in{min-height:260px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;line-height:1.55}
.modelo{grid-column:1/-1;display:grid;gap:16px;grid-template-columns:1fr 1fr}
@media (max-width:860px){.modelo{grid-template-columns:1fr}}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
.chip{min-height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:13px;cursor:pointer}
.chip:hover{border-color:var(--primary);color:var(--primary)}
.zap{background:#0b141a;border-radius:14px;padding:16px;min-height:260px}
.bolhazap{background:#005c4b;color:#e9edef;border-radius:10px 10px 2px 10px;padding:10px 12px;font-size:14.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;max-width:420px;margin-left:auto}
.bolhazap a{color:#53bdeb}
.acoes{display:flex;gap:6px;flex:none}
.mini{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:40px;padding:0 10px;border-radius:9px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:13px;font-weight:600;cursor:pointer;gap:6px}
.mini:hover{border-color:var(--primary);color:var(--primary)}
.mini.perigo:hover{border-color:var(--bad);color:var(--bad)}
.mini .ic{width:16px;height:16px}
.quando{font-size:13px;color:var(--muted);white-space:nowrap;font-variant-numeric:tabular-nums}
.origem{font-size:12px;color:var(--muted)}
@media (max-width:640px){.fila li{flex-wrap:wrap}.fila .tit{flex-basis:100%;order:3;white-space:normal}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;

const LOJAS = '<span class="tag mercadolivre">Mercado Livre</span><span class="tag shopee">Shopee</span><span class="tag shein">Shein</span><span class="tag tiktokshop">TikTok Shop</span>';

function pagina(titulo, corpo) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><meta name="color-scheme" content="light dark">
<title>${esc(titulo)} · Bot de Achadinhos</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#c2410c"/><g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(4 4) scale(.67)">' + P.sacola + '</g></svg>')}">
<style>${CSS}</style></head><body>${corpo}</body></html>`;
}

export function telaLogin(erro) {
  return pagina('Entrar', `<div class="login"><div class="card">
  <div class="logo">${ic('sacola')}</div>
  <h1>Bot de Achadinhos</h1>
  <p class="sub">Entre para ver o status, a fila e as configurações.</p>
  <form method="post" action="/login" style="margin-top:22px" onsubmit="this.querySelector('button').disabled=true">
    <label class="l" for="senha">Senha do painel</label>
    <input class="in" type="password" id="senha" name="senha" autocomplete="current-password" autofocus required>
    ${erro ? `<div class="erro" role="alert">${ic('alerta')}${esc(erro)}</div>` : ''}
    <button class="btn">${ic('cadeado')}Entrar</button>
  </form></div></div>`);
}

const brl = (n) => (n ? Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '');

function campoModelo(c, valor) {
  const chips = Object.keys(VARIAVEIS_UI).map((k) => `<button type="button" class="chip" data-var="${k}" title="${esc(VARIAVEIS_UI[k])}">{${k}}</button>`).join('');
  return `<div class="modelo"><div><label class="l" for="${c.k}">Texto do post</label>
    <textarea class="in" id="${c.k}" name="${c.k}" spellcheck="false">${esc(valor)}</textarea>
    <span class="ajuda">*negrito* · _itálico_ · ~riscado~ · clique para inserir:</span><div class="chips">${chips}</div></div>
    <div><span class="l">Prévia no WhatsApp</span><div class="zap"><div class="bolhazap" id="previa"></div></div>
    <span class="ajuda">No Telegram o link vai no botão "Comprar agora".</span></div></div>
  <script>(()=>{const ta=document.getElementById('${c.k}'),pv=document.getElementById('previa');
  const ex={titulo:'Fone Bluetooth TWS com Cancelamento de Ruído',loja:'Shopee',preco:'R$ 59,90',preco_antigo:'R$ 119,90',desconto:'50%',economia:'R$ 60,00',cupom:'ACHADO10',obs:'Frete grátis',nota:'4,8',vendidos:'10 mil+',link:'https://s.shopee.com.br/abc123'};
  const e=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  function render(){const out=[];for(const l of ta.value.split('\\n')){const vs=[...l.matchAll(/\\{(\\w+)\\}/g)].map(m=>m[1]).filter(k=>k in ex);if(vs.some(k=>!ex[k]))continue;out.push(l.replace(/\\{(\\w+)\\}/g,(m,k)=>k in ex?ex[k]:m));}
  let h=e(out.join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim());
  h=h.replace(/(^|[\\s(])\\*([^*\\n]+)\\*/gm,'$1<b>$2</b>').replace(/(^|[\\s(])_([^_\\n]+)_/gm,'$1<i>$2</i>').replace(/(^|[\\s(])~([^~\\n]+)~/gm,'$1<s>$2</s>').replace(/(https?:\\/\\/\\S+)/g,'<a>$1</a>');
  pv.innerHTML=h||'<i>(vazio)</i>';}
  ta.addEventListener('input',render);
  document.querySelectorAll('.chip').forEach(b=>b.addEventListener('click',()=>{const t='{'+b.dataset.var+'}',a=ta.selectionStart,z=ta.selectionEnd;ta.setRangeText(t,a,z,'end');ta.focus();render();}));
  render();})();</script>`;
}

function campoHtml(c, valor, preenchido) {
  if (c.tipo === 'modelo') return campoModelo(c, valor);
  if (c.tipo === 'switch') {
    const on = String(valor) === 'true';
    return `<div><input type="hidden" name="${c.k}" value="false">
      <label class="switch"><input type="checkbox" name="${c.k}" value="true" ${on ? 'checked' : ''}>${esc(c.rot)}</label></div>`;
  }
  const tipo = c.tipo === 'segredo' ? 'password' : c.tipo === 'numero' ? 'number' : 'text';
  const extra = c.tipo === 'segredo' ? 'autocomplete="new-password"' : c.tipo === 'numero' ? 'inputmode="decimal" step="any"' : 'autocomplete="off"';
  const ph = c.tipo === 'segredo' && preenchido ? 'placeholder="•••••••• (deixe vazio para manter)"' : '';
  return `<div><label class="l" for="${c.k}">${esc(c.rot)}${c.tipo === 'segredo' && preenchido ? '<span class="ja">salvo</span>' : ''}</label>
    <input class="in" id="${c.k}" name="${c.k}" type="${tipo}" ${extra} ${ph} value="${esc(valor)}">
    ${c.ajuda ? `<span class="ajuda">${esc(c.ajuda)}</span>` : ''}</div>`;
}

/**
 * d = { telegram:{ok}, whatsapp:{ativo,conectado}, temQr, fila:[], postsHoje, maxDia, horaInicio, horaFim,
 *       intervalo, valor(k), preenchido(k), msg, passos:[{t,d,feito}] }
 */
export function telaInicio(d) {
  const tg = d.telegram.ok ? '<span class="pill ok">Conectado</span>' : '<span class="pill bad">Falta o token</span>';
  const wa = !d.whatsapp.ativo ? '<span class="pill off">Desligado</span>' : d.whatsapp.conectado ? '<span class="pill ok">Conectado</span>' : '<span class="pill bad">Desconectado</span>';
  const pct = Math.min(100, Math.round((d.postsHoje / Math.max(1, d.maxDia)) * 100));
  const feitos = d.passos.filter((p) => p.feito).length;
  const abertoInicial = d.telegram.ok ? '' : 'open';

  return pagina('Painel', `
<header class="topo"><div class="in">
  <div class="marca"><div class="logo">${ic('sacola')}</div>Bot de Achadinhos</div>
  <div class="lojas">${LOJAS}</div>
  <a class="sair" href="/sair">${ic('sair')}Sair</a>
</div></header>
<main>
  <h1>Painel</h1>
  <p class="sub">Ofertas com o seu link de afiliado no WhatsApp e no Telegram.</p>
  ${d.msg ? `<div class="aviso ok" role="status">${ic('check')}<div>${esc(d.msg)}</div></div>` : ''}

  <section class="secao" aria-label="Status">
    <div class="grade">
      <div class="card stat"><div class="bolha">${ic('send')}</div><div><div class="k">Telegram</div><div class="v">${tg}</div></div></div>
      <div class="card stat"><div class="bolha">${ic('msg')}</div><div><div class="k">WhatsApp</div><div class="v">${wa}</div></div></div>
      <div class="card stat"><div class="bolha">${ic('lista')}</div><div><div class="k">Na fila</div><div class="v">${d.fila.length}</div></div></div>
      ${d.cloneAtivo ? `<div class="card stat"><div class="bolha">${ic('ima')}</div><div><div class="k">Clonadas hoje</div><div class="v">${d.clonesHoje}</div></div></div>` : ''}
      <div class="card stat"><div class="bolha">${ic('grafico')}</div><div style="flex:1"><div class="k">Posts hoje</div>
        <div class="v">${d.postsHoje}<span style="color:var(--muted);font-weight:500;font-size:16px"> / ${d.maxDia}</span></div>
        <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div></div>
    </div>
  </section>

  ${d.temQr ? `<section class="secao"><div class="card qrbox">
    <img src="/qr.png?t=${Date.now()}" alt="QR code para conectar o WhatsApp" width="220" height="220">
    <div><h2>${ic('qr')} Conecte o WhatsApp</h2>
      <p class="sub">No celular do bot: <b>WhatsApp → Aparelhos conectados → Conectar aparelho</b> e aponte a câmera para o código.</p>
      <p class="sub" style="font-size:14px">A página atualiza sozinha a cada 20 segundos.</p></div>
    <script>setTimeout(()=>location.reload(),20000)</script></div></section>` : ''}

  ${feitos < d.passos.length ? `<section class="secao">
    <div class="cab"><h2>Primeiros passos</h2><span class="pill off">${feitos} de ${d.passos.length}</span></div>
    <div class="card passos">${d.passos.map((p, i) => `<div class="passo ${p.feito ? 'feito' : ''}">
      <div class="num">${p.feito ? ic('check', '') : i + 1}</div><div><div class="t">${esc(p.t)}</div><div class="d">${esc(p.d)}</div></div></div>`).join('')}</div>
  </section>` : ''}

  <section class="secao">
    <div class="cab"><h2>Fila de ofertas</h2><span class="sub" style="margin:0;font-size:14px">${ic('relogio')} ${d.horaInicio}h–${d.horaFim}h, a cada ${d.intervalo} min</span></div>
    <div class="card">${d.fila.length ? `<ul class="fila">${d.fila.slice(0, 30).map((o) => `<li>
      <span class="tag ${esc(o.loja)}">${esc(d.nomes[o.loja] || o.loja)}</span>
      <span class="tit">${esc(o.titulo)}${o.origem ? `<br><span class="origem">🧲 clonada de ${esc(o.origem)}</span>` : ''}</span>${o.precoPor ? `<span class="preco">${brl(o.precoPor)}</span>` : ''}
      <form method="post" action="/fila" class="acoes" onsubmit="this.querySelectorAll('button').forEach(b=>b.disabled=true)">
        <input type="hidden" name="id" value="${esc(o.id)}">
        <button class="mini" name="acao" value="postar" title="Postar agora">${ic('envio')}<span>Postar</span></button>
        <button class="mini perigo" name="acao" value="remover" aria-label="Remover da fila" title="Remover">${ic('lixo')}</button>
      </form></li>`).join('')}</ul>`
      : `<div class="vazio">${ic('lista')}<div>A fila está vazia.</div><div style="font-size:14px">Cole links de produtos no privado do bot no Telegram${d.cloneAtivo ? ' ou espere o clone de ofertas' : ''}.</div></div>`}</div>
  </section>

  <section class="secao">
    <div class="cab"><h2>Meus envios</h2><span class="sub" style="margin:0;font-size:14px">últimos ${Math.min(20, d.enviados.length)}</span></div>
    <div class="card">${d.enviados.length ? `<ul class="fila">${d.enviados.slice(0, 20).map((e) => `<li>
      <span class="tag ${esc(e.loja)}">${esc(d.nomes[e.loja] || e.loja)}</span>
      <span class="tit"><a href="${esc(e.link)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${esc(e.titulo)}</a></span>
      ${e.precoPor ? `<span class="preco">${brl(e.precoPor)}</span>` : ''}
      <span class="quando" title="${esc(e.quando)}">${esc(d.hora(e.quando))} · ${e.destinos} destino(s)${e.falhas ? ` · <span style="color:var(--bad)">${e.falhas} falha(s)</span>` : ''}</span></li>`).join('')}</ul>`
      : `<div class="vazio">${ic('envio')}<div>Nada enviado ainda.</div></div>`}</div>
  </section>

  <section class="secao">
    <div class="cab"><h2>Configurações</h2></div>
    <form method="post" action="/config" onsubmit="const b=this.querySelector('.salvar .btn');b.disabled=true;b.lastChild.textContent=' Salvando...'">
      ${CAMPOS.map((g, i) => `<details class="grupo" ${i === 0 ? abertoInicial : ''}>
        <summary><div class="bolha">${ic(g.icone)}</div><div class="txt"><h2>${esc(g.titulo)}</h2><div class="d">${esc(g.desc)}</div></div>${ic('seta', 'seta')}</summary>
        <div class="campos">${g.campos.map((c) => campoHtml(c, d.valor(c.k), d.preenchido(c.k))).join('')}</div>
      </details>`).join('')}
      <div class="salvar"><button class="btn">${ic('salvar')}<span> Salvar e reiniciar o bot</span></button></div>
    </form>
  </section>
  <p class="rodape">Bot de Achadinhos · Mercado Livre · Shopee · Shein · TikTok Shop</p>
</main>`);
}

export function telaSalvo() {
  return pagina('Salvando', `<div class="login"><div class="card" style="text-align:center">
  <div class="logo" style="margin:0 auto 18px">${ic('check')}</div>
  <h1>Configurações salvas</h1><p class="sub">O bot está reiniciando com os novos valores. Você volta ao painel em instantes.</p>
  <script>setTimeout(()=>location.href="/?msg="+encodeURIComponent("Configurações salvas. O bot foi reiniciado."),6000)</script>
  </div></div>`);
}
