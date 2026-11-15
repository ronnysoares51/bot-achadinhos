// Visual do painel web (HTML + CSS sem dependências externas).

import { VARIAVEIS as VARIAVEIS_UI } from './formatar.js';
import { CATEGORIAS } from './categorias.js';

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
  raio: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  editar: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  pausa: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="m6 3 14 9-14 9V3z"/>',
  mais: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  voltar: '<path d="m15 18-6-6 6-6"/>',
  alerta: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

export const CAMPOS = [
  { titulo: 'Telegram', icone: 'send', desc: 'O bot de comando: você cola os links no privado dele. Os canais de destino ficam em cada automação.', campos: [
    { k: 'TELEGRAM_BOT_TOKEN', rot: 'Token do bot', ajuda: 'Crie o bot no @BotFather e cole o token aqui.', tipo: 'segredo' },
    { k: 'TELEGRAM_ADMINS', rot: 'IDs dos admins', ajuda: 'Mande /start ao seu bot: ele responde com o seu ID.' },
  ] },
  { titulo: 'WhatsApp', icone: 'msg', desc: 'Conexão do número do bot (não oficial: use um número só para isso). Os grupos de destino ficam em cada automação.', campos: [
    { k: 'WHATSAPP_ATIVO', rot: 'Postar no WhatsApp', tipo: 'switch' },
    { k: 'WHATSAPP_PAUSA_MIN', rot: 'Pausa mínima entre grupos', ajuda: 'Em segundos.', tipo: 'numero' },
    { k: 'WHATSAPP_PAUSA_MAX', rot: 'Pausa máxima entre grupos', ajuda: 'Em segundos.', tipo: 'numero' },
  ] },
  { titulo: 'Modelo padrão da mensagem', icone: 'texto', desc: 'Usado pelas automações que não têm modelo próprio. Linhas com variável vazia somem sozinhas.', campos: [
    { k: 'MODELO_MENSAGEM', rot: 'Modelo', tipo: 'modelo' },
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
label.l,span.l{display:block;font-size:14px;font-weight:600;margin-bottom:6px}
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

.auts{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.aut{padding:18px;display:flex;flex-direction:column;gap:12px}
.aut .topo2{display:flex;align-items:flex-start;gap:12px}
.aut h3{margin:0;font-size:17px;line-height:1.3;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.aut .linhas{display:grid;gap:6px;font-size:14px;color:var(--muted)}
.aut .linhas span{display:flex;gap:8px;align-items:center}
.aut .linhas .ic{width:16px;height:16px;color:var(--text);opacity:.7}
.aut .tags{display:flex;gap:6px;flex-wrap:wrap}
.aut .rodape2{display:flex;gap:8px;align-items:center;border-top:1px solid var(--border);padding-top:12px;margin-top:auto}
.aut .rodape2 .esq{flex:1;font-size:13px;color:var(--muted)}
.aut.off{opacity:.72}
.novo{display:grid;place-items:center;text-align:center;gap:8px;padding:28px;border:2px dashed var(--border);border-radius:var(--r);color:var(--muted);text-decoration:none;min-height:200px}
.novo:hover{border-color:var(--primary);color:var(--primary)}
.novo .ic{width:28px;height:28px}
a.btn{text-decoration:none}
.btn.sec{background:var(--surface);color:var(--text);border:1px solid var(--border)}
.btn.sec:hover{background:var(--surface-2)}
.passo-cab{display:flex;align-items:center;gap:14px;padding:18px;border-bottom:1px solid var(--border)}
.passo-cab .n{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:800;background:var(--primary);color:var(--on-primary);flex:none}
.passo-cab h2{font-size:18px}.passo-cab .d{font-size:14px;color:var(--muted)}
.corpo{padding:18px;display:grid;gap:18px}
.opcoes{display:flex;flex-wrap:wrap;gap:8px}
.opcao{position:relative}
.opcao input{position:absolute;opacity:0;pointer-events:none}
.opcao span{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);cursor:pointer;font-size:14px;font-weight:600;transition:all .15s}
.opcao input:checked+span{border-color:var(--primary);background:var(--primary-soft);color:var(--primary)}
.opcao input:focus-visible+span{outline:3px solid var(--primary);outline-offset:2px}
.grupos{display:grid;gap:6px;max-height:300px;overflow:auto;padding:4px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2)}
.grupos label{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 10px;border-radius:8px;cursor:pointer;font-size:14px}
.grupos label:hover{background:var(--surface)}
.grupos input{width:18px;height:18px;accent-color:var(--primary)}
.grupos .id{font-size:12px;color:var(--muted);margin-left:auto;font-family:ui-monospace,monospace}
.dupla{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.voltar{display:inline-flex;align-items:center;gap:4px;color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;min-height:44px}
.voltar:hover{color:var(--text)}
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
  <a class="sair" href="/lojas" style="margin-left:auto">${ic('loja')}Minhas lojas</a>
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
      <div class="card stat"><div class="bolha">${ic('raio')}</div><div><div class="k">Automações ligadas</div><div class="v">${d.automacoes.filter((a) => a.ativa).length}<span style="color:var(--muted);font-weight:500;font-size:16px"> / ${d.automacoes.length}</span></div></div></div>
      <div class="card stat"><div class="bolha">${ic('lista')}</div><div><div class="k">Na fila</div><div class="v">${d.fila.length}</div></div></div>
      ${d.cloneAtivo ? `<div class="card stat"><div class="bolha">${ic('ima')}</div><div><div class="k">Clonadas hoje</div><div class="v">${d.clonesHoje}</div></div></div>` : ''}
      <div class="card stat"><div class="bolha">${ic('grafico')}</div><div style="flex:1"><div class="k">Posts hoje</div>
        <div class="v">${d.postsHoje}<span style="color:var(--muted);font-weight:500;font-size:16px"> / ${d.maxDia}</span></div>
        <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></div></div>
    </div>
  </section>

  ${blocoWhatsApp(d)}

  ${feitos < d.passos.length ? `<section class="secao">
    <div class="cab"><h2>Primeiros passos</h2><span class="pill off">${feitos} de ${d.passos.length}</span></div>
    <div class="card passos">${d.passos.map((p, i) => `<div class="passo ${p.feito ? 'feito' : ''}">
      <div class="num">${p.feito ? ic('check', '') : i + 1}</div><div><div class="t">${esc(p.t)}</div><div class="d">${esc(p.d)}</div></div></div>`).join('')}</div>
  </section>` : ''}

  <section class="secao" id="automacoes">
    <div class="cab"><h2>Automações</h2><a class="btn" href="/automacao" style="min-height:44px;padding:0 16px">${ic('mais')}Nova automação</a></div>
    <div class="auts">${d.automacoes.map((a) => cardAutomacao(a, d)).join('')}
      ${d.automacoes.length ? '' : `<a class="novo card" href="/automacao">${ic('raio')}<b>Crie sua primeira automação</b><span style="font-size:14px">Escolha para onde vão as ofertas, quais ofertas, quando e como.</span></a>`}
    </div>
  </section>

  <section class="secao">
    <div class="card" style="padding:18px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <div class="bolha" style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary)">${ic('ima')}</div>
      <div style="flex:1;min-width:220px"><b>Clone de ofertas</b><div class="sub" style="font-size:14px;margin:2px 0 0">${d.clone.grupos ? `Monitorando ${d.clone.grupos} grupo(s) · ${d.clone.automatico ? 'vai direto para a fila' : 'você aprova no Telegram'} · ${d.clonesHoje} hoje` : 'Escolha grupos de ofertas de outras pessoas para trazer as promoções com o seu link.'}</div></div>
      <a class="btn sec" href="/clone" style="min-height:44px">${ic('editar')}Escolher grupos</a>
    </div>
  </section>

  <section class="secao">
    <div class="cab"><h2>Fila de ofertas</h2><span class="sub" style="margin:0;font-size:14px">cada automação pega daqui o que combina com as regras dela</span></div>
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

const NOMES_LOJA = { mercadolivre: 'Mercado Livre', shopee: 'Shopee', shein: 'Shein', tiktokshop: 'TikTok Shop' };
const NOMES_FONTE = { manual: 'Seus links', clone: 'Clone', shopee: 'Busca Shopee' };
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function resumoDias(dias) {
  if (dias.length === 7) return 'todos os dias';
  if (dias.join() === '1,2,3,4,5') return 'seg a sex';
  if (dias.join() === '0,6') return 'fim de semana';
  return dias.map((x) => DIAS_CURTOS[x]).join(', ');
}

function cardAutomacao(a, d) {
  const hoje = a.estado.dia === d.diaHoje ? a.estado.enviadosDia : 0;
  const ultimo = a.estado.ultimoEnvio ? d.hora(new Date(a.estado.ultimoEnvio).toISOString()) : 'nunca';
  const dest = [a.destinos.telegram.length && `${a.destinos.telegram.length} canal(is) Telegram`, a.destinos.whatsapp.length && `${a.destinos.whatsapp.length} grupo(s) WhatsApp`].filter(Boolean).join(' · ') || '<span style="color:var(--bad)">sem destino</span>';
  return `<div class="card aut ${a.ativa ? '' : 'off'}">
    <div class="topo2"><h3>${esc(a.nome)}</h3>${a.ativa ? '<span class="pill ok">Ligada</span>' : '<span class="pill off">Desligada</span>'}</div>
    <div class="linhas">
      <span>${ic('send')}${dest}</span>
      <span>${ic('relogio')}1 a cada ${a.intervaloMin} min · ${a.horaInicio}h–${a.horaFim}h · ${esc(resumoDias(a.dias))}</span>
      <span>${ic('lista')}${a.fontes.map((f) => NOMES_FONTE[f]).join(' + ')}${a.descontoMin ? ` · desconto ≥ ${a.descontoMin}%` : ''}${a.precoMax ? ` · até R$ ${a.precoMax}` : ''}</span>
    </div>
    <div class="tags">${(a.lojas.length ? a.lojas : Object.keys(NOMES_LOJA)).map((l) => `<span class="tag ${l}">${NOMES_LOJA[l]}</span>`).join('')}${a.categorias.map((c) => `<span class="tag">${esc(CATEGORIAS[c]?.nome || c)}</span>`).join('')}</div>
    <div class="rodape2"><span class="esq">Hoje ${hoje}/${a.maxDia} · último: ${esc(ultimo)}</span>
      <form method="post" action="/automacao/acao" style="display:flex;gap:6px">
        <input type="hidden" name="id" value="${esc(a.id)}">
        <button class="mini" name="acao" value="alternar" aria-label="${a.ativa ? 'Desligar' : 'Ligar'} automação" title="${a.ativa ? 'Desligar' : 'Ligar'}">${ic(a.ativa ? 'pausa' : 'play')}</button>
        <a class="mini" href="/automacao?id=${esc(a.id)}" title="Editar" style="text-decoration:none">${ic('editar')}<span>Editar</span></a>
      </form></div>
  </div>`;
}

function opcao(nome, valor, rotulo, marcado, tipo = 'checkbox') {
  return `<label class="opcao"><input type="${tipo}" name="${nome}" value="${esc(valor)}" ${marcado ? 'checked' : ''}><span>${rotulo}</span></label>`;
}

function campo(nome, rotulo, valor, { ajuda = '', tipo = 'text', extra = '' } = {}) {
  return `<div><label class="l" for="${nome}">${rotulo}</label><input class="in" id="${nome}" name="${nome}" type="${tipo}" value="${esc(valor ?? '')}" ${extra}>${ajuda ? `<span class="ajuda">${ajuda}</span>` : ''}</div>`;
}

/**
 * d = { a (automação ou null), gruposWa: [{id,nome}] | null, waConectado, modeloPadrao, nova }
 */
export function telaAutomacao(d) {
  const a = d.a;
  const conhecidos = new Set((d.gruposWa || []).map((g) => g.id));
  const outrosWa = a.destinos.whatsapp.filter((g) => !conhecidos.has(g));
  const passo = (n, titulo, desc, corpo) => `<section class="card secao"><div class="passo-cab"><div class="n">${n}</div><div><h2>${titulo}</h2><div class="d">${desc}</div></div></div><div class="corpo">${corpo}</div></section>`;

  const paraOnde = `
    ${campo('nome', 'Nome da automação', d.nova ? '' : a.nome, { ajuda: 'Só para você reconhecer. Ex.: Achadinhos Casa, Grupo VIP.', extra: 'placeholder="Ex.: Achadinhos da Lanny" required' })}
    <div><label class="l" for="telegram">Canais ou grupos do Telegram</label>
      <textarea class="in" id="telegram" name="telegram" style="min-height:70px;font-family:inherit" placeholder="-1003701717478&#10;@meucanal">${esc(a.destinos.telegram.join('\n'))}</textarea>
      <span class="ajuda">Um por linha. O bot precisa ser administrador do canal.</span></div>
    <div><span class="l">Grupos do WhatsApp</span>
      ${d.gruposWa ? (d.gruposWa.length ? `<div class="grupos">${d.gruposWa.map((g) => `<label><input type="checkbox" name="whatsapp" value="${esc(g.id)}" ${a.destinos.whatsapp.includes(g.id) ? 'checked' : ''}>${esc(g.nome)}<span class="id">${esc(g.id.replace('@g.us', ''))}</span></label>`).join('')}</div>` : '<span class="ajuda">O número do bot não está em nenhum grupo.</span>')
      : `<div class="aviso" style="margin:0">${ic('alerta')}<div>WhatsApp ${d.waAtivo ? 'desconectado' : 'desligado'}: conecte o número (Configurações → WhatsApp) para escolher os grupos aqui. Enquanto isso, dá para colar os IDs abaixo.</div></div>`}
      <label class="l" for="whatsapp_extra" style="margin-top:12px">IDs de grupos (opcional)</label>
      <input class="in" id="whatsapp_extra" name="whatsapp_extra" value="${esc(outrosWa.join(', '))}" placeholder="120363...@g.us">
    </div>`;

  const oQue = `
    <div><span class="l">De onde vêm as ofertas</span><div class="opcoes">
      ${opcao('fontes', 'manual', 'Links que eu mando ao bot', a.fontes.includes('manual'))}
      ${opcao('fontes', 'clone', 'Clone de ofertas', a.fontes.includes('clone'))}
      ${opcao('fontes', 'shopee', 'Busca automática na Shopee', a.fontes.includes('shopee'))}
    </div></div>
    <div class="dupla" id="busca-shopee">
      ${campo('shopee_palavras', 'Busca Shopee: palavras-chave', a.buscaShopee.palavras.join(', '), { ajuda: 'Separadas por vírgula. Ex.: fone bluetooth, air fryer' })}
      ${campo('shopee_desconto', 'Busca Shopee: desconto mínimo (%)', a.buscaShopee.descontoMin, { tipo: 'number' })}
      ${campo('shopee_nota', 'Busca Shopee: nota mínima', a.buscaShopee.notaMin, { tipo: 'number', extra: 'step="0.1" min="0" max="5"' })}
      ${campo('shopee_intervalo', 'Buscar a cada (horas)', a.buscaShopee.intervaloHoras, { tipo: 'number', extra: 'min="1"' })}
      ${campo('shopee_por_palavra', 'Ofertas por palavra em cada busca', a.buscaShopee.porPalavra, { tipo: 'number', extra: 'min="1" max="20"', ajuda: 'Mais ofertas para ritmos rápidos.' })}
    </div>
    <div><span class="l">Categorias</span><div class="opcoes" id="cats">
      ${Object.entries(CATEGORIAS).map(([k, c]) => opcao('categorias', k, c.nome, a.categorias.includes(k))).join('')}
    </div><span class="ajuda">Marque o que este destino deve postar (ex.: só Moda feminina e Infantil). Nenhuma marcada = todas as categorias. Se a busca da Shopee estiver sem palavras, ela busca pelas categorias marcadas.</span>
      <div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="mini" data-cats="todas">Marcar todas</button><button type="button" class="mini" data-cats="nenhuma">Limpar</button></div>
      <script>document.querySelectorAll('[data-cats]').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('#cats input').forEach(i=>i.checked=b.dataset.cats==='todas')));</script></div>
    <div><span class="l">Clonar só destes grupos</span>
      ${d.gruposClone?.length ? `<div class="grupos">${d.gruposClone.map((g) => `<label><input type="checkbox" name="origens" value="${esc(g.id)}" ${a.origens.includes(g.id) ? 'checked' : ''}>${esc(g.nome)}<span class="id">${g.rede}</span></label>`).join('')}</div>
      <span class="ajuda">Vale para ofertas do clone. Nenhum marcado = todos os grupos clonados.</span>`
        : '<span class="ajuda">Nenhum grupo para clonar ainda. Adicione em <a href="/clone">Clone de ofertas</a>.</span>'}</div>
    <div><span class="l">Lojas</span><div class="opcoes">
      ${Object.entries(NOMES_LOJA).map(([k, v]) => opcao('lojas', k, v, !a.lojas.length || a.lojas.includes(k))).join('')}
    </div><span class="ajuda">Todas marcadas = qualquer loja.</span></div>
    <div class="dupla">
      ${campo('precoMin', 'Preço mínimo (R$)', a.precoMin ?? '', { tipo: 'number', extra: 'step="any" min="0"' })}
      ${campo('precoMax', 'Preço máximo (R$)', a.precoMax ?? '', { tipo: 'number', extra: 'step="any" min="0"' })}
      ${campo('descontoMin', 'Desconto mínimo (%)', a.descontoMin || '', { tipo: 'number', ajuda: 'Ofertas sem desconto informado ficam de fora se preencher.' })}
    </div>
    <div class="dupla">
      ${campo('incluir', 'Só ofertas com estas palavras', a.incluir.join(', '), { ajuda: 'Opcional. Ex.: cozinha, panela, airfryer' })}
      ${campo('excluir', 'Nunca ofertas com estas palavras', a.excluir.join(', '), { ajuda: 'Opcional. Ex.: usado, recondicionado' })}
    </div>`;

  const quando = `
    <div><span class="l">Ritmo</span><div class="opcoes" id="ritmos">
      ${[5, 10, 15, 20, 30, 45, 60].map((m) => `<button type="button" class="chip" data-min="${m}" style="min-height:44px;padding:0 16px;font-size:14px;font-weight:600">a cada ${m} min</button>`).join('')}
    </div></div>
    <div class="dupla">
      ${campo('intervaloMin', 'Uma oferta a cada (minutos)', a.intervaloMin, { tipo: 'number', extra: 'min="1"' })}
      ${campo('maxDia', 'Máximo de ofertas por dia', a.maxDia, { tipo: 'number', extra: 'min="1" max="500"' })}
      ${campo('horaInicio', 'Começa às (hora)', a.horaInicio, { tipo: 'number', extra: 'min="0" max="23"' })}
      ${campo('horaFim', 'Para às (hora)', a.horaFim, { tipo: 'number', extra: 'min="1" max="24"' })}
    </div>
    <div class="aviso ok" style="margin:0" id="estimativa"></div>
    <div><span class="l">Dias da semana</span><div class="opcoes">${DIAS_CURTOS.map((n, i) => opcao('dias', i, n, a.dias.includes(i))).join('')}</div></div>
    <span class="ajuda">Telegram aguenta ritmo alto. No WhatsApp, ritmo muito alto em grupo aumenta o risco de o número ser bloqueado: comece devagar e aumente aos poucos.</span>
    <script>(()=>{const $=id=>document.getElementById(id);const est=()=>{const iv=+$('intervaloMin').value||1,ini=+$('horaInicio').value||0,fim=+$('horaFim').value||24,max=+$('maxDia').value||1;const cab=Math.max(0,Math.floor((fim-ini)*60/iv));const real=Math.min(cab,max);$('estimativa').innerHTML='<div>≈ <b>'+real+' ofertas por dia</b> por destino ('+(fim-ini)+' h, 1 a cada '+iv+' min'+(max<cab?', limitado pelo máximo de '+max:'')+'). A fila precisa ter ofertas suficientes: use várias palavras na busca da Shopee e o clone de ofertas.</div>';};
    document.querySelectorAll('#ritmos .chip').forEach(b=>b.addEventListener('click',()=>{$('intervaloMin').value=b.dataset.min;const ini=+$('horaInicio').value||0,fim=+$('horaFim').value||24;$('maxDia').value=Math.max(1,Math.floor((fim-ini)*60/b.dataset.min));est();}));
    ['intervaloMin','horaInicio','horaFim','maxDia'].forEach(id=>$(id).addEventListener('input',est));est();})();</script>`;

  const como = `
    <div><span class="l">Formato</span><div class="opcoes">
      ${opcao('formato', 'imagem', 'Imagem com o texto', a.formato !== 'texto', 'radio')}
      ${opcao('formato', 'texto', 'Só texto (com prévia do link)', a.formato === 'texto', 'radio')}
    </div></div>
    <div class="campos" style="padding:0;border:0">${campoModelo({ k: 'modelo' }, a.modelo || d.modeloPadrao)}</div>
    <span class="ajuda">Deixe igual ao modelo padrão para seguir as mudanças dele (Configurações → Modelo padrão).</span>`;

  return pagina(d.nova ? 'Nova automação' : a.nome, `
<header class="topo"><div class="in">
  <div class="marca"><div class="logo">${ic('sacola')}</div>Bot de Achadinhos</div>
  <a class="sair" href="/" style="margin-left:auto">${ic('voltar')}Voltar ao painel</a>
</div></header>
<main>
  <h1>${d.nova ? 'Nova automação' : esc(a.nome)}</h1>
  <p class="sub">Uma regra que trabalha sozinha: pega as ofertas, filtra pelo que você quer e envia para os seus destinos, no seu ritmo.</p>
  <form method="post" action="/automacao" onsubmit="const b=this.querySelector('.salvar .btn');b.disabled=true;b.lastChild.textContent=' Salvando...'">
    <input type="hidden" name="id" value="${esc(d.nova ? '' : a.id)}">
    <input type="hidden" name="ativa" value="false">
    <label class="switch" style="margin-top:18px"><input type="checkbox" name="ativa" value="true" ${a.ativa ? 'checked' : ''}>Automação ligada</label>
    ${passo(1, 'Para onde', 'Os canais e grupos que recebem as ofertas', paraOnde)}
    ${passo(2, 'O que', 'A fonte das ofertas e os filtros', oQue)}
    ${passo(3, 'Quando', 'O ritmo, os dias e os horários', quando)}
    ${passo(4, 'Como', 'O formato e o texto do post', como)}
    <div class="salvar" style="gap:10px">${d.nova ? '' : '<button class="btn sec" type="submit" form="excluir" style="color:var(--bad)">' + ic('lixo') + 'Excluir</button>'}
      <button class="btn">${ic('salvar')}<span> Salvar automação</span></button></div>
  </form>
  ${d.nova ? '' : `<form id="excluir" method="post" action="/automacao/acao" onsubmit="return confirm('Excluir a automação ${esc(a.nome).replace(/'/g, '')}? A fila e os envios não são apagados.')"><input type="hidden" name="id" value="${esc(a.id)}"><input type="hidden" name="acao" value="excluir"></form>`}
</main>
<script>(()=>{const s=document.querySelector('input[value=shopee][name=fontes]'),b=document.getElementById('busca-shopee');const f=()=>b.style.display=s.checked?'':'none';s.addEventListener('change',f);f();})()</script>`);
}

function blocoWhatsApp(d) {
  const w = d.whatsapp;
  if (w.conectado) return '';
  if (!w.ativo) {
    return `<section class="secao"><div class="card qrbox" style="grid-template-columns:auto 1fr">
      <div class="bolha" style="width:64px;height:64px;border-radius:16px;display:grid;place-items:center;background:var(--primary-soft);color:var(--primary)">${ic('msg')}</div>
      <div><h2>Conectar o WhatsApp</h2>
        <p class="sub">Para postar nos grupos, conecte o número do bot. Use um número só para isso: a conexão não é oficial e o WhatsApp pode bloquear números que enviam demais.</p>
        <form method="post" action="/whatsapp/ligar" style="margin-top:12px" onsubmit="this.querySelector('button').disabled=true">
          <button class="btn">${ic('qr')}Conectar WhatsApp</button></form></div></div></section>`;
  }
  return `<section class="secao"><div class="card qrbox">
    ${d.temQr ? `<img src="/qr.png?t=${Date.now()}" alt="QR code para conectar o WhatsApp" width="220" height="220">`
      : `<div style="width:220px;height:220px;border-radius:12px;border:1px dashed var(--border);display:grid;place-items:center;text-align:center;color:var(--muted);padding:16px">${ic('relogio')}<div style="font-size:14px">Gerando o QR code...</div></div>`}
    <div><h2>Conecte o WhatsApp</h2>
      <p class="sub">No celular do bot: <b>WhatsApp → ⋮ (ou Configurações) → Aparelhos conectados → Conectar um aparelho</b> e aponte a câmera para o código.</p>
      ${w.erro ? `<div class="aviso" style="margin-top:12px">${ic('alerta')}<div>${esc(w.erro)}${w.tentativas > 3 ? ` (${w.tentativas} tentativas)` : ''}</div></div>` : ''}
      <p class="sub" style="font-size:14px">Esta parte atualiza sozinha a cada 8 segundos.</p>
      <form method="post" action="/whatsapp/desconectar" style="margin-top:8px"><button class="mini" title="Apaga a sessão e gera um QR novo">${ic('lixo')}<span>Recomeçar conexão</span></button></form>
    </div>
    <script>setTimeout(()=>location.reload(),8000)</script></div></section>`;
}

/** d = { lojas: { ml:{etiqueta, temCookies, mattTool, atualizado}, shopee:{appId, temSecret, subId}, shein:{parametros} }, msg, teste } */
export function telaLojas(d) {
  const l = d.lojas;
  const st = (ok, txt = ok ? 'Conectada' : 'Não configurada') => `<span class="pill ${ok ? 'ok' : 'off'}">${txt}</span>`;
  const cartao = (tag, nome, status, desc, corpo, aberto) => `<details class="grupo" ${aberto ? 'open' : ''}>
    <summary><span class="tag ${tag}" style="min-width:110px;justify-content:center">${nome}</span><div class="txt"><div class="d">${desc}</div></div>${status}${ic('seta', 'seta')}</summary>
    <div class="corpo">${corpo}</div></details>`;
  const mlOk = Boolean(l.ml.etiqueta && l.ml.temCookies);

  const ml = `
    <p class="sub" style="margin:0">Com a conta conectada, <b>todo link do Mercado Livre</b> (seus, do clone ou da busca) vira um <b>meli.la oficial da sua conta</b>, igual ao gerador do portal de afiliados.</p>
    <div class="dupla">
      ${campo('ML_ETIQUETA', 'Etiqueta (tag) de afiliado', l.ml.etiqueta, { ajuda: 'Portal de afiliados → Gerador de links → "Etiqueta em uso". Ex.: soro1826673' })}
      ${campo('ML_MATT_TOOL', 'matt_tool (opcional, plano B)', l.ml.mattTool, { ajuda: 'Só se quiser que, quando o gerador falhar, o link use parâmetros.' })}
    </div>
    <div><label class="l" for="ML_COOKIES">Cookies da sua conta do Mercado Livre ${l.ml.temCookies ? '<span class="ja">salvo</span>' : ''}</label>
      <textarea class="in" id="ML_COOKIES" name="ML_COOKIES" style="min-height:90px" placeholder="${l.ml.temCookies ? 'Já salvos. Envie de novo só se a sessão expirar.' : 'Envie o arquivo cookies.txt ou cole aqui'}"></textarea>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <label class="btn sec" style="min-height:44px;cursor:pointer">${ic('envio')}<span>Enviar arquivo cookies.txt</span><input type="file" id="arquivoCookies" accept=".txt,.json,text/plain,application/json" style="display:none"></label>
        <span class="ajuda" id="arquivoNome" style="margin:0"></span>
      </div>
      <span class="ajuda"><b>Como pegar (igual ao DisparaPromo):</b> no Chrome do computador, entre em <b>mercadolivre.com.br/afiliados</b> com a sua conta → clique na extensão <b>Get cookies.txt LOCALLY</b> → <b>Export</b> (baixa o cookies.txt) → envie o arquivo aqui. Também aceita JSON e o formato "Header String" do Cookie-Editor. Só os cookies do Mercado Livre são guardados, e só no seu servidor. Se você sair da conta no navegador, eles expiram e é só enviar de novo.</span>
      <script>(()=>{const f=document.getElementById('arquivoCookies'),ta=document.getElementById('ML_COOKIES'),n=document.getElementById('arquivoNome');f.addEventListener('change',async()=>{const a=f.files[0];if(!a)return;ta.value=await a.text();n.textContent='✓ '+a.name+' carregado — agora clique em Testar conexão';});})()</script></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button class="btn sec" formaction="/lojas/testar-ml" formmethod="post">${ic('raio')}Testar conexão</button>
    </div>
    ${d.teste ? `<div class="aviso ${d.teste.ok ? 'ok' : ''}" style="margin:0">${ic(d.teste.ok ? 'check' : 'alerta')}<div>${esc(d.teste.texto)}</div></div>` : ''}`;

  const shopee = `
    <p class="sub" style="margin:0">Gera o link de afiliado sozinho pela API oficial e permite a busca automática de ofertas.</p>
    <div class="dupla">
      ${campo('SHOPEE_APP_ID', 'App ID', l.shopee.appId, { ajuda: 'affiliate.shopee.com.br → Open API' })}
      <div><label class="l" for="SHOPEE_SECRET">Secret ${l.shopee.temSecret ? '<span class="ja">salvo</span>' : ''}</label><input class="in" id="SHOPEE_SECRET" name="SHOPEE_SECRET" type="password" autocomplete="new-password" placeholder="${l.shopee.temSecret ? '•••••••• (deixe vazio para manter)' : ''}"></div>
      ${campo('SHOPEE_SUB_ID', 'Sub ID dos links', l.shopee.subId, { ajuda: 'Aparece no relatório de vendas.' })}
    </div>`;

  const shein = `
    <p class="sub" style="margin:0">A Shein só paga comissão em links gerados no painel de afiliados (ou no app). Por isso, por enquanto: <b>cole o seu link de afiliado</b> da Shein no privado do bot. Ofertas da Shein vindas do clone são ignoradas, porque o link continuaria sendo da outra pessoa.</p>
    ${campo('SHEIN_PARAMETROS', 'Parâmetros extras (opcional)', l.shein.parametros, { ajuda: 'Só se você souber o parâmetro de afiliado que a Shein coloca nos seus links. Ex.: url_from=SEU_ID' })}`;

  const tiktok = `<p class="sub" style="margin:0">Cole o link de afiliado gerado no app (Afiliados → produto → Compartilhar) no privado do bot. Como na Shein, ofertas de TikTok Shop do clone são ignoradas.</p>`;

  return pagina('Minhas lojas', `
<header class="topo"><div class="in">
  <div class="marca"><div class="logo">${ic('sacola')}</div>Bot de Achadinhos</div>
  <a class="sair" href="/" style="margin-left:auto">${ic('voltar')}Voltar ao painel</a>
</div></header>
<main>
  <h1>Minhas lojas</h1>
  <p class="sub">É o cadastro de afiliado de cada loja que faz todo link sair com a sua comissão.</p>
  ${d.msg ? `<div class="aviso ok" role="status">${ic('check')}<div>${esc(d.msg)}</div></div>` : ''}
  <form method="post" action="/lojas" class="secao" onsubmit="const b=this.querySelector('.salvar .btn');if(b){b.disabled=true}">
    ${cartao('mercadolivre', 'Mercado Livre', st(mlOk, mlOk ? 'Conectada' : l.ml.etiqueta ? 'Faltam os cookies' : 'Não configurada'), 'Links meli.la oficiais da sua conta', ml, !mlOk || d.teste)}
    ${cartao('shopee', 'Shopee', st(Boolean(l.shopee.appId && l.shopee.temSecret)), 'API oficial de afiliados', shopee, false)}
    ${cartao('shein', 'Shein', st(true, 'Link colado'), 'Seus links do painel/app de afiliados', shein, false)}
    ${cartao('tiktokshop', 'TikTok Shop', st(true, 'Link colado'), 'Seus links do app', tiktok, false)}
    <div class="salvar"><button class="btn">${ic('salvar')}<span> Salvar lojas</span></button></div>
  </form>
</main>`);
}

/** d = { grupos: [{id,nome}] | null, selecionados: [], automatico, maxHora, waAtivo, msg } */
export function telaClone(d) {
  const sel = new Set(d.selecionados);
  const selTg = new Set(d.selecionadosTelegram || []);
  const destinosTg = new Set(d.destinosTelegram || []);
  const extras = d.selecionados.filter((g) => !(d.grupos || []).some((x) => x.id === g || x.nome === g));
  const chats = (d.chatsTelegram || []).filter((c) => !destinosTg.has(c.id));
  const extrasTg = [...selTg].filter((id) => !chats.some((c) => c.id === id));
  return pagina('Clone de ofertas', `
<header class="topo"><div class="in">
  <div class="marca"><div class="logo">${ic('sacola')}</div>Bot de Achadinhos</div>
  <a class="sair" href="/" style="margin-left:auto">${ic('voltar')}Voltar ao painel</a>
</div></header>
<main>
  <h1>Clone de ofertas</h1>
  <p class="sub">Escolha grupos de ofertas de outras pessoas, no <b>WhatsApp</b> ou no <b>Telegram</b>. Cada promoção da <b>Shopee</b> ou do <b>Mercado Livre</b> que aparecer lá vira uma oferta com o <b>seu</b> link. Em cada automação você escolhe de quais grupos ela clona e quais categorias posta.</p>
  ${d.msg ? `<div class="aviso ok" role="status">${ic('check')}<div>${esc(d.msg)}</div></div>` : ''}
  ${d.erro ? `<div class="aviso erro" role="alert">${ic('alerta')}<div>${esc(d.erro)}</div></div>` : ''}

  <section class="card secao" style="padding:18px;display:grid;gap:12px;margin-bottom:16px">
    <h2 style="margin:0;font-size:18px">Adicionar grupo do WhatsApp pelo link</h2>
    <p class="ajuda" style="margin:0">Cole o link de convite do grupo que você quer clonar. O número do bot entra no grupo e ele já fica marcado.</p>
    ${d.waConectado ? `<form method="post" action="/clone/entrar" style="display:flex;gap:8px;flex-wrap:wrap">
      <input class="in" name="convite" required placeholder="https://chat.whatsapp.com/..." style="flex:1;min-width:240px" aria-label="Link de convite do grupo">
      <button class="btn">${ic('mais')}<span> Entrar e clonar</span></button>
    </form>` : `<div class="aviso" style="margin:0">${ic('alerta')}<div>Conecte o WhatsApp do bot na página inicial para adicionar grupos.</div></div>`}
  </section>

  <form method="post" action="/clone" class="card secao" style="padding:18px;display:grid;gap:18px">
    <div><span class="l">Grupos do WhatsApp para clonar</span>
    ${d.grupos ? (d.grupos.length ? `<input class="in" id="filtro" placeholder="Buscar grupo pelo nome..." style="margin-bottom:8px">
      <div class="grupos" id="lista">${d.grupos.map((g) => `<label><input type="checkbox" name="grupos" value="${esc(g.id)}" ${sel.has(g.id) || sel.has(g.nome) ? 'checked' : ''}>${esc(g.nome)}<span class="id">${esc(g.id.replace('@g.us', ''))}</span></label>`).join('')}</div>
      <span class="ajuda">Aparecem os grupos em que o número do bot está. Não marque os seus próprios grupos de destino.</span>` : '<span class="ajuda">O número do bot ainda não está em nenhum grupo. Use o link de convite acima.</span>')
      : `<div class="aviso" style="margin:0">${ic('alerta')}<div>WhatsApp ${d.waAtivo ? 'desconectado' : 'desligado'}: conecte o número do bot na página inicial para ver a lista de grupos.</div></div>`}
    ${extras.length ? `<input type="hidden" name="extras" value="${esc(extras.join(','))}">` : ''}</div>

    <div><span class="l">Grupos e canais do Telegram para clonar</span>
      ${chats.length ? `<div class="grupos">${chats.map((c) => `<label><input type="checkbox" name="grupos_tg" value="${esc(c.id)}" ${selTg.has(c.id) ? 'checked' : ''}>${esc(c.nome)}<span class="id">${c.tipo}</span></label>`).join('')}</div>`
        : '<span class="ajuda" style="display:block;margin-bottom:6px">Nenhum grupo ou canal do Telegram ainda.</span>'}
      <span class="ajuda"><b>Como adicionar:</b> coloque o seu bot no grupo ou canal (num canal, como administrador). Ele aparece aqui sozinho quando chegar a próxima mensagem; recarregue a página. Num grupo, deixe o bot como administrador para ele ler todas as mensagens. O Telegram não deixa um bot entrar sozinho em canais de outras pessoas.</span>
      <label class="l" for="tg_extra" style="margin-top:12px">IDs de chats do Telegram (opcional)</label>
      <input class="in" id="tg_extra" name="tg_extra" value="${esc(extrasTg.join(', '))}" placeholder="-100...">
    </div>

    <input type="hidden" name="automatico" value="false">
    <label class="switch"><input type="checkbox" name="automatico" value="true" ${d.automatico ? 'checked' : ''}>Colocar na fila sem me perguntar</label>
    <span class="ajuda" style="margin-top:-10px">Desligado: cada oferta clonada chega no seu Telegram com os botões Postar / Fila / Descartar.</span>
    ${campo('maxHora', 'Máximo de ofertas clonadas por hora', d.maxHora, { tipo: 'number', extra: 'min="1" max="120"' })}
    <div class="salvar"><button class="btn">${ic('salvar')}<span> Salvar</span></button></div>
  </form>
</main>
<script>(()=>{const f=document.getElementById('filtro');if(!f)return;f.addEventListener('input',()=>{const q=f.value.toLowerCase();document.querySelectorAll('#lista label').forEach(l=>l.style.display=l.textContent.toLowerCase().includes(q)?'':'none');});})()</script>`);
}
