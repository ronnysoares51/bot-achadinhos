import { config } from './config.js';
import { detectarLoja, extrairLinks } from './lojas/index.js';
import { shopeeConfigurada } from './lojas/shopee.js';
import { mlConectado, produtoDaPaginaSocial } from './lojas/mlLinkbuilder.js';
import { urlFinal } from './lojas/previa.js';
import { montarOferta, extrairDeMensagem } from './oferta.js';
import { adicionar, listar, registrarClone } from './fila.js';
import { listarAutomacoes } from './automacoes.js';

/**
 * Clone de ofertas: recebe a mensagem de um grupo monitorado e devolve um link que
 * certamente será SEU (ou null). Shein e TikTok Shop ficam de fora: o link de outra
 * pessoa nessas lojas não pode ser trocado pelo seu, e a comissão iria para ela.
 */
export async function linkClonavel(url, { resolver = urlFinal, social = produtoDaPaginaSocial } = {}) {
  const loja = detectarLoja(url);
  if (loja === 'shopee') return shopeeConfigurada() ? { loja, link: url } : { motivo: 'Shopee sem credenciais da API' };
  if (loja === 'mercadolivre') {
    if (!mlConectado() && !(config.mercadolivre.mattWord && config.mercadolivre.mattTool)) return { motivo: 'Mercado Livre não conectado (Minhas lojas)' };
    let final = await resolver(url);
    // Link de outro afiliado abre o perfil social dele: pega o produto em destaque na página.
    if (/\/social\//.test(final)) {
      const produto = await social(final);
      if (!produto) return { motivo: 'perfil social do ML sem produto em destaque' };
      final = produto;
    }
    const host = new URL(final).hostname.replace(/^www\./, '');
    if (detectarLoja(final) !== 'mercadolivre' || host === 'meli.la') {
      return { motivo: 'link do ML não leva a um produto' };
    }
    return { loja, link: final };
  }
  if (loja === 'shein' || loja === 'tiktokshop') return { motivo: `${loja}: não dá para trocar o link de outra pessoa pelo seu` };
  return { motivo: 'loja não suportada' };
}

// Limite de ofertas clonadas por hora, contado por automação e grupo de origem: um grupo que posta
// muito não tira o espaço dos outros, e uma automação não tira o espaço da outra.
const recentes = new Map();
export function dentroDoLimite(chave = '', agora = Date.now(), max = config.clone.maxHora) {
  const lista = (recentes.get(chave) || []).filter((t) => agora - t <= 3600_000);
  recentes.set(chave, lista);
  return lista.length < max;
}
function contarClone(chave = '', agora = Date.now()) {
  recentes.set(chave, [...(recentes.get(chave) || []), agora]);
}

/**
 * Para quais automações vai o clone deste grupo. Cada automação clona só dos grupos marcados nela.
 * Grupo que nenhuma automação marcou ("sem dono") vai para as automações sem nenhum grupo marcado.
 */
export function automacoesDoGrupo(grupo, nomeGrupo, automacoes = listarAutomacoes()) {
  const clonam = automacoes.filter((a) => a.fontes.includes('clone'));
  const doGrupo = (a) => a.origens.includes(grupo) || Boolean(nomeGrupo && a.origens.includes(nomeGrupo));
  const donos = clonam.filter(doGrupo);
  if (donos.length) return donos.filter((a) => a.ativa);
  return clonam.filter((a) => a.ativa && !a.origens.length);
}

/**
 * Processa uma mensagem de grupo monitorado: monta a oferta uma vez e põe uma cópia na fila de
 * CADA automação dona do grupo (cada uma posta a sua, no seu ritmo, sem depender das outras).
 * aprovar(oferta, origem): manda para o admin aprovar (modo manual).
 */
export async function processarMensagem({ texto, nomeGrupo, grupo, baixarFoto }, { aprovar, avisar, automacoes } = {}) {
  const links = extrairLinks(texto).filter((l) => detectarLoja(l));
  if (!links.length) return { ok: false, motivo: 'sem link de loja' };
  const origem = grupo || nomeGrupo || '';
  const todas = automacoes || automacoesDoGrupo(grupo, nomeGrupo);
  if (!todas.length) return { ok: false, motivo: 'nenhuma automação ativa clona deste grupo' };
  const alvos = todas.filter((a) => dentroDoLimite(`${a.id}|${origem}`));
  if (!alvos.length) return { ok: false, motivo: 'limite por hora deste grupo atingido' };

  const motivos = [];
  for (const url of links) {
    const alvo = await linkClonavel(url);
    if (!alvo.link) {
      motivos.push(alvo.motivo);
      continue;
    }
    const oferta = await montarOferta('', { link: alvo.link, extra: extrairDeMensagem(texto), deOutraPessoa: true });
    const naFila = listar();
    const novas = alvos.filter((a) => !a.estado.enviadas.includes(oferta.chave) && !naFila.some((o) => o.chave === oferta.chave && o.automacao === a.id));
    if (!novas.length) return { ok: false, motivo: 'repetida' };
    if (baixarFoto) {
      const foto = await baixarFoto().catch(() => {
        console.warn('[clone] Não foi possível baixar a foto original.');
        return null;
      });
      if (foto) oferta.fotoOriginal = foto;
    }
    // Texto original (curto): ajuda a achar a categoria quando o título é uma frase de chamada.
    oferta.textoOrigem = String(texto || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
    registrarClone(nomeGrupo);
    for (const a of novas) {
      contarClone(`${a.id}|${origem}`);
      const item = { ...oferta, fonte: 'clone', origem: nomeGrupo, origemId: grupo, automacao: a.id };
      if (config.clone.automatico) {
        adicionar(item);
        avisar?.(`🧲 Clone: "${oferta.titulo}" (de ${nomeGrupo}) entrou na fila da automação "${a.nome}".`);
      } else {
        await aprovar?.(item, `${nomeGrupo} → ${a.nome}`);
      }
    }
    return { ok: true, destino: config.clone.automatico ? 'fila' : 'aprovacao', automacoes: novas.map((a) => a.nome) };
  }
  return { ok: false, motivo: `nenhum link pode virar seu: ${[...new Set(motivos)].join('; ')}` };
}
