import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.js';

// Armazenamento simples em JSON: fila de ofertas, histórico (para não repetir) e contagem diária.
const arquivo = () => path.join(config.pastaDados, 'fila.json');
const DIAS_SEM_REPETIR = 7;

function ler() {
  try {
    return JSON.parse(fs.readFileSync(arquivo(), 'utf8'));
  } catch {
    return { fila: [], historico: {}, postsHoje: { dia: '', total: 0 }, enviados: [], clones: { dia: '', total: 0 } };
  }
}

function salvar(d) {
  fs.mkdirSync(config.pastaDados, { recursive: true });
  const tmp = `${arquivo()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, arquivo());
}

export function jaPostada(chave, agora = Date.now()) {
  const quando = ler().historico[chave];
  return Boolean(quando && agora - quando < DIAS_SEM_REPETIR * 864e5);
}

export function adicionar(oferta) {
  const d = ler();
  // A mesma oferta pode estar na fila de automações diferentes (cada uma com a sua cópia).
  if (d.fila.some((o) => o.chave === oferta.chave && (o.automacao || '') === (oferta.automacao || ''))) return null;
  const item = { id: crypto.randomBytes(4).toString('hex'), fonte: 'manual', criadaEm: new Date().toISOString(), ...oferta };
  d.fila.push(item);
  salvar(d);
  return item;
}

export function listar() {
  return ler().fila;
}

export function remover(id) {
  const d = ler();
  const antes = d.fila.length;
  d.fila = d.fila.filter((o) => o.id !== id);
  salvar(d);
  return d.fila.length < antes;
}

export function proxima() {
  return ler().fila[0] || null;
}

/**
 * Registra um envio. Com `automacao`, a oferta continua na fila para as outras automações
 * (quem decide a remoção é limparFila); sem ela (postar agora), sai da fila.
 */
export function marcarPostada(oferta, dia, resultados = [], { automacao = null } = {}) {
  const d = ler();
  d.enviados = [
    {
      titulo: oferta.titulo,
      loja: oferta.loja,
      precoPor: oferta.precoPor ?? null,
      link: oferta.link,
      imagem: oferta.imagem ?? null,
      origem: oferta.origem ?? null,
      automacao: automacao?.nome ?? null,
      quando: new Date().toISOString(),
      destinos: resultados.filter((r) => r.ok).length,
      falhas: resultados.filter((r) => !r.ok).length,
    },
    ...(d.enviados || []),
  ].slice(0, 100);
  if (!automacao) d.fila = d.fila.filter((o) => o.id !== oferta.id);
  d.historico[oferta.chave] = Date.now();
  // limpa histórico antigo
  for (const [k, t] of Object.entries(d.historico)) if (Date.now() - t > 30 * 864e5) delete d.historico[k];
  if (d.postsHoje.dia !== dia) d.postsHoje = { dia, total: 0 };
  d.postsHoje.total += 1;
  salvar(d);
}

export function postsHoje(dia) {
  const p = ler().postsHoje;
  return p.dia === dia ? p.total : 0;
}

export function listarEnviados() {
  return ler().enviados || [];
}

/** Conta ofertas trazidas pelo clone no dia (para o painel). */
export function registrarClone(origem, dia = new Date().toISOString().slice(0, 10)) {
  const d = ler();
  if (!d.clones || d.clones.dia !== dia) d.clones = { dia, total: 0 };
  d.clones.total += 1;
  d.clones.ultimaOrigem = origem || null;
  salvar(d);
}

export function clonesHoje(dia = new Date().toISOString().slice(0, 10)) {
  const c = ler().clones;
  return c && c.dia === dia ? c.total : 0;
}

const VALIDADE_HORAS = 48;

/**
 * Tira da fila o que não serve mais: ofertas vencidas (48 h) e ofertas que todas as
 * automações interessadas já enviaram. `aceita(oferta, automacao, opcoes)` vem de automacoes.js.
 */
export function limparFila(automacoes, aceita, agora = Date.now()) {
  const d = ler();
  const antes = d.fila.length;
  d.fila = d.fila.filter((o) => {
    const idade = agora - new Date(o.criadaEm || agora).getTime();
    if (idade > VALIDADE_HORAS * 3600_000) return false;
    const interessadas = automacoes.filter((a) => a.ativa && aceita(o, a, { ignorarHistorico: true }).ok);
    if (!interessadas.length) return true;
    return !interessadas.every((a) => a.estado.enviadas.includes(o.chave));
  });
  if (d.fila.length !== antes) salvar(d);
  return antes - d.fila.length;
}
