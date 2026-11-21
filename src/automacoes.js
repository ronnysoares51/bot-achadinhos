import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';
import { CATEGORIAS, categoriasDe } from './categorias.js';

/**
 * Automações: cada uma é uma regra que pega ofertas de uma ou mais fontes, filtra e envia
 * para os seus próprios destinos (canais do Telegram e grupos do WhatsApp), no seu ritmo.
 */
const arquivo = () => path.join(config.pastaDados, 'automacoes.json');
export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const FONTES = {
  manual: 'Links que você manda ao bot',
  clone: 'Clone de ofertas (grupos monitorados)',
  shopee: 'Busca automática na Shopee',
};
export const LOJAS = ['mercadolivre', 'shopee', 'shein', 'tiktokshop'];
const MAX_HISTORICO = 800;

function ler() {
  try {
    return JSON.parse(fs.readFileSync(arquivo(), 'utf8'));
  } catch {
    return null;
  }
}

function gravar(lista) {
  fs.mkdirSync(config.pastaDados, { recursive: true });
  const tmp = `${arquivo()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(lista, null, 2));
  fs.renameSync(tmp, arquivo());
}

const numero = (v, padrao, min = -Infinity, max = Infinity) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return v === '' || v == null || !Number.isFinite(n) ? padrao : Math.min(max, Math.max(min, n));
};
const lista = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[,\n]/)).map((s) => String(s).trim()).filter(Boolean);

/** Garante todos os campos com valores válidos. */
export function normalizar(a = {}) {
  const estado = a.estado || {};
  return {
    id: a.id || crypto.randomBytes(4).toString('hex'),
    nome: String(a.nome || 'Nova automação').trim().slice(0, 60),
    ativa: a.ativa !== false && a.ativa !== 'false',
    destinos: {
      telegram: lista(a.destinos?.telegram),
      whatsapp: lista(a.destinos?.whatsapp),
    },
    fontes: lista(a.fontes).filter((f) => f in FONTES),
    buscaShopee: {
      palavras: lista(a.buscaShopee?.palavras),
      descontoMin: numero(a.buscaShopee?.descontoMin, 30, 0, 95),
      notaMin: numero(a.buscaShopee?.notaMin, 4.5, 0, 5),
      intervaloHoras: numero(a.buscaShopee?.intervaloHoras, 3, 1, 48),
      porPalavra: numero(a.buscaShopee?.porPalavra, 5, 1, 20),
    },
    lojas: lista(a.lojas).filter((l) => LOJAS.includes(l)),
    categorias: lista(a.categorias).filter((c) => c in CATEGORIAS),
    origens: lista(a.origens),
    precoMin: numero(a.precoMin, null, 0),
    precoMax: numero(a.precoMax, null, 0),
    descontoMin: numero(a.descontoMin, 0, 0, 95),
    incluir: lista(a.incluir),
    excluir: lista(a.excluir),
    intervaloMin: numero(a.intervaloMin, 45, 1, 1440),
    dias: lista(a.dias).map(Number).filter((d) => d >= 0 && d <= 6),
    horaInicio: numero(a.horaInicio, 8, 0, 23),
    horaFim: numero(a.horaFim, 22, 1, 24),
    maxDia: numero(a.maxDia, 8, 1, 500),
    formato: a.formato === 'texto' ? 'texto' : 'imagem',
    modelo: String(a.modelo || '').replace(/\r\n/g, '\n').trim(),
    estado: {
      ultimoEnvio: estado.ultimoEnvio || 0,
      dia: estado.dia || '',
      enviadosDia: estado.enviadosDia || 0,
      enviadas: Array.isArray(estado.enviadas) ? estado.enviadas.slice(-MAX_HISTORICO) : [],
      ultimaBusca: estado.ultimaBusca || 0,
      total: estado.total || 0,
    },
  };
}

export function listarAutomacoes() {
  return (ler() || []).map(normalizar);
}

export function obterAutomacao(id) {
  return listarAutomacoes().find((a) => a.id === id) || null;
}

/** Cria ou atualiza (mantém o estado de envios da automação existente). */
export function salvarAutomacao(dados) {
  const todas = listarAutomacoes();
  const i = todas.findIndex((a) => a.id === dados.id);
  const nova = normalizar({ ...dados, estado: i >= 0 ? todas[i].estado : undefined });
  if (!nova.dias.length) nova.dias = [0, 1, 2, 3, 4, 5, 6];
  if (!nova.fontes.length) nova.fontes = ['manual'];
  if (i >= 0) todas[i] = nova;
  else todas.push(nova);
  gravar(todas);
  return nova;
}

export function excluirAutomacao(id) {
  const todas = listarAutomacoes();
  const resto = todas.filter((a) => a.id !== id);
  gravar(resto);
  return resto.length < todas.length;
}

export function alternarAutomacao(id) {
  const todas = listarAutomacoes();
  const a = todas.find((x) => x.id === id);
  if (!a) return null;
  a.ativa = !a.ativa;
  gravar(todas);
  return a;
}

/** Registra que a automação enviou a oferta (para ritmo, limite diário e não repetir). */
export function registrarEnvio(id, chave, dia, agora = Date.now()) {
  const todas = listarAutomacoes();
  const a = todas.find((x) => x.id === id);
  if (!a) return;
  if (a.estado.dia !== dia) Object.assign(a.estado, { dia, enviadosDia: 0 });
  a.estado.enviadosDia += 1;
  a.estado.total += 1;
  a.estado.ultimoEnvio = agora;
  if (chave && !a.estado.enviadas.includes(chave)) a.estado.enviadas.push(chave);
  a.estado.enviadas = a.estado.enviadas.slice(-MAX_HISTORICO);
  gravar(todas);
}

export function registrarBusca(id, agora = Date.now()) {
  const todas = listarAutomacoes();
  const a = todas.find((x) => x.id === id);
  if (!a) return;
  a.estado.ultimaBusca = agora;
  gravar(todas);
}

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * A automação aceita esta oferta? Devolve { ok, motivo }.
 * ignorarHistorico: não considera se ela já enviou a oferta.
 */
export function aceita(oferta, a, { ignorarHistorico = false } = {}) {
  const fonte = oferta.fonte || 'manual';
  if (oferta.automacao && oferta.automacao !== a.id) return { ok: false, motivo: 'de outra automação' };
  if (!a.fontes.includes(fonte)) return { ok: false, motivo: `fonte ${fonte} não usada` };
  if (a.lojas.length && !a.lojas.includes(oferta.loja)) return { ok: false, motivo: 'loja fora do filtro' };
  // Clone feito para esta automação (dos grupos dela): os grupos escolhidos já são o filtro,
  // então posta mesmo fora das categorias. Clones antigos (sem dono) seguem as regras de antes.
  const clonePropria = fonte === 'clone' && oferta.automacao === a.id;
  if (fonte === 'clone' && !clonePropria && a.origens.length && !a.origens.includes(oferta.origemId) && !a.origens.includes(oferta.origem)) return { ok: false, motivo: 'clone de outro grupo' };
  if (a.categorias.length && !clonePropria) {
    const cats = categoriasDe(`${oferta.titulo || ''} ${oferta.textoOrigem || ''}`);
    if (!a.categorias.some((c) => cats.includes(c))) return { ok: false, motivo: 'fora das categorias' };
  }
  const preco = Number(oferta.precoPor) || null;
  if (a.precoMin != null && (preco == null || preco < a.precoMin)) return { ok: false, motivo: 'preço abaixo do mínimo' };
  if (a.precoMax != null && (preco == null || preco > a.precoMax)) return { ok: false, motivo: 'preço acima do máximo' };
  if (a.descontoMin > 0 && !(Number(oferta.desconto) >= a.descontoMin)) return { ok: false, motivo: 'desconto abaixo do mínimo' };
  const titulo = semAcento(oferta.titulo);
  if (a.incluir.length && !a.incluir.some((p) => titulo.includes(semAcento(p)))) return { ok: false, motivo: 'sem palavra obrigatória' };
  if (a.excluir.some((p) => titulo.includes(semAcento(p)))) return { ok: false, motivo: 'tem palavra proibida' };
  if (!ignorarHistorico && a.estado.enviadas.includes(oferta.chave)) return { ok: false, motivo: 'já enviada' };
  return { ok: true };
}

/** Pode postar agora? Respeita dias, horário, limite diário e intervalo. */
export function podePostar(a, { agora = new Date(), dia, hora, diaSemana }) {
  if (!a.ativa) return false;
  if (!a.destinos.telegram.length && !a.destinos.whatsapp.length) return false;
  if (!a.dias.includes(diaSemana)) return false;
  if (hora < a.horaInicio || hora >= a.horaFim) return false;
  const enviadosHoje = a.estado.dia === dia ? a.estado.enviadosDia : 0;
  if (enviadosHoje >= a.maxDia) return false;
  return agora.getTime() - a.estado.ultimoEnvio >= a.intervaloMin * 60_000;
}

export function enviadosHoje(a, dia) {
  return a.estado.dia === dia ? a.estado.enviadosDia : 0;
}

/**
 * Primeira execução com a versão de automações: transforma a configuração antiga
 * (canais, grupos, horários e busca da Shopee) numa automação "Principal".
 */
export function migrarConfiguracaoAntiga(cfg = config) {
  if (ler() !== null) return null;
  const temDestino = cfg.telegram.canais.length || cfg.whatsapp.grupos.length;
  if (!temDestino) {
    gravar([]);
    return null;
  }
  const fontes = ['manual', 'clone'];
  if (cfg.autoShopee.ativo && cfg.autoShopee.palavras.length) fontes.push('shopee');
  const a = normalizar({
    nome: 'Principal',
    destinos: { telegram: cfg.telegram.canais, whatsapp: cfg.whatsapp.grupos },
    fontes,
    buscaShopee: {
      palavras: cfg.autoShopee.palavras,
      descontoMin: cfg.autoShopee.descontoMin,
      notaMin: cfg.autoShopee.notaMin,
      intervaloHoras: cfg.autoShopee.intervaloHoras,
    },
    intervaloMin: cfg.agendador.intervaloMin,
    horaInicio: cfg.agendador.horaInicio,
    horaFim: cfg.agendador.horaFim,
    maxDia: cfg.agendador.maxPorDia,
    dias: [0, 1, 2, 3, 4, 5, 6],
  });
  gravar([a]);
  return a;
}
