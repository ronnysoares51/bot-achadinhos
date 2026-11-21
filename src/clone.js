import { config } from './config.js';
import { detectarLoja, extrairLinks } from './lojas/index.js';
import { shopeeConfigurada } from './lojas/shopee.js';
import { mlConectado, produtoDaPaginaSocial } from './lojas/mlLinkbuilder.js';
import { urlFinal } from './lojas/previa.js';
import { montarOferta, extrairDeMensagem } from './oferta.js';
import { adicionar, jaPostada, listar, registrarClone } from './fila.js';

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

// Limite de ofertas clonadas por hora, contado POR GRUPO de origem. Antes era um limite só para
// todos os grupos: um grupo que posta muito (ex.: 60 ofertas/h) gastava o limite inteiro e as
// ofertas dos outros grupos eram descartadas, deixando sem nada as automações que clonam deles.
const recentes = new Map();
export function dentroDoLimite(grupo = '', agora = Date.now(), max = config.clone.maxHora) {
  const lista = (recentes.get(grupo) || []).filter((t) => agora - t <= 3600_000);
  recentes.set(grupo, lista);
  return lista.length < max;
}
function contarClone(grupo = '', agora = Date.now()) {
  recentes.set(grupo, [...(recentes.get(grupo) || []), agora]);
}

/**
 * Processa uma mensagem de grupo monitorado.
 * aprovar(oferta, origem): manda para o admin aprovar (modo manual).
 */
export async function processarMensagem({ texto, nomeGrupo, grupo, baixarFoto }, { aprovar, avisar } = {}) {
  const links = extrairLinks(texto).filter((l) => detectarLoja(l));
  if (!links.length) return { ok: false, motivo: 'sem link de loja' };
  const origem = grupo || nomeGrupo || '';
  if (!dentroDoLimite(origem)) return { ok: false, motivo: 'limite por hora deste grupo atingido' };

  const motivos = [];
  for (const url of links) {
    const alvo = await linkClonavel(url);
    if (!alvo.link) {
      motivos.push(alvo.motivo);
      continue;
    }
    const oferta = await montarOferta('', { link: alvo.link, extra: extrairDeMensagem(texto), deOutraPessoa: true });
    if (baixarFoto) {
      const foto = await baixarFoto().catch(() => {
        console.warn('[clone] Não foi possível baixar a foto original.');
        return null;
      });
      if (foto) oferta.fotoOriginal = foto;
    }
    if (jaPostada(oferta.chave) || listar().some((o) => o.chave === oferta.chave)) return { ok: false, motivo: 'repetida' };
    contarClone(origem);
    // Texto original (curto): ajuda a achar a categoria quando o título é uma frase de chamada.
    oferta.textoOrigem = String(texto || '').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
    registrarClone(nomeGrupo);
    if (config.clone.automatico) {
      adicionar({ ...oferta, fonte: 'clone', origem: nomeGrupo, origemId: grupo });
      avisar?.(`🧲 Clone: "${oferta.titulo}" (de ${nomeGrupo}) entrou na fila.`);
      return { ok: true, destino: 'fila' };
    }
    await aprovar?.({ ...oferta, fonte: 'clone', origem: nomeGrupo, origemId: grupo }, nomeGrupo);
    return { ok: true, destino: 'aprovacao' };
  }
  return { ok: false, motivo: `nenhum link pode virar seu: ${[...new Set(motivos)].join('; ')}` };
}
