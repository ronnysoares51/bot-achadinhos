import { config } from './config.js';
import { detectarLoja, extrairLinks } from './lojas/index.js';
import { shopeeConfigurada } from './lojas/shopee.js';
import { urlFinal } from './lojas/previa.js';
import { montarOferta, extrairDeMensagem } from './oferta.js';
import { adicionar, jaPostada, listar, registrarClone } from './fila.js';

/**
 * Clone de ofertas: recebe a mensagem de um grupo monitorado e devolve um link que
 * certamente será SEU (ou null). Shein e TikTok Shop ficam de fora: o link de outra
 * pessoa nessas lojas não pode ser trocado pelo seu, e a comissão iria para ela.
 */
export async function linkClonavel(url, { resolver = urlFinal } = {}) {
  const loja = detectarLoja(url);
  if (loja === 'shopee') return shopeeConfigurada() ? { loja, link: url } : { motivo: 'Shopee sem credenciais da API' };
  if (loja === 'mercadolivre') {
    if (!config.mercadolivre.mattWord || !config.mercadolivre.mattTool) return { motivo: 'Mercado Livre sem matt_word/matt_tool' };
    const final = await resolver(url);
    const host = new URL(final).hostname.replace(/^www\./, '');
    if (detectarLoja(final) !== 'mercadolivre' || host === 'meli.la' || /\/social\//.test(final)) {
      return { motivo: 'link do ML não leva a um produto' };
    }
    return { loja, link: final };
  }
  if (loja === 'shein' || loja === 'tiktokshop') return { motivo: `${loja}: não dá para trocar o link de outra pessoa pelo seu` };
  return { motivo: 'loja não suportada' };
}

const recentes = [];
function dentroDoLimite(agora = Date.now()) {
  while (recentes.length && agora - recentes[0] > 3600_000) recentes.shift();
  return recentes.length < config.clone.maxHora;
}

/**
 * Processa uma mensagem de grupo monitorado.
 * aprovar(oferta, origem): manda para o admin aprovar (modo manual).
 */
export async function processarMensagem({ texto, nomeGrupo }, { aprovar, avisar } = {}) {
  const links = extrairLinks(texto).filter((l) => detectarLoja(l));
  if (!links.length) return { ok: false, motivo: 'sem link de loja' };
  if (!dentroDoLimite()) return { ok: false, motivo: 'limite por hora atingido' };

  for (const url of links) {
    const alvo = await linkClonavel(url);
    if (!alvo.link) continue;
    const oferta = await montarOferta('', { link: alvo.link, extra: extrairDeMensagem(texto) });
    if (jaPostada(oferta.chave) || listar().some((o) => o.chave === oferta.chave)) return { ok: false, motivo: 'repetida' };
    recentes.push(Date.now());
    registrarClone(nomeGrupo);
    if (config.clone.automatico) {
      adicionar({ ...oferta, origem: nomeGrupo });
      avisar?.(`🧲 Clone: "${oferta.titulo}" (de ${nomeGrupo}) entrou na fila.`);
      return { ok: true, destino: 'fila' };
    }
    await aprovar?.(oferta, nomeGrupo);
    return { ok: true, destino: 'aprovacao' };
  }
  return { ok: false, motivo: 'nenhum link pode virar seu' };
}
