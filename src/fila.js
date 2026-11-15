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
    return { fila: [], historico: {}, postsHoje: { dia: '', total: 0 } };
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
  if (d.fila.some((o) => o.chave === oferta.chave)) return null;
  const item = { id: crypto.randomBytes(4).toString('hex'), ...oferta };
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

export function marcarPostada(oferta, dia) {
  const d = ler();
  d.fila = d.fila.filter((o) => o.id !== oferta.id);
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
