import { config } from './config.js';
import { proxima, postsHoje, adicionar, jaPostada } from './fila.js';
import { publicar, diaLocal, horaLocal } from './publicar.js';
import { buscarOfertasShopee, shopeeConfigurada } from './lojas/shopee.js';

let ultimoPost = 0;
let ultimaBusca = 0;
let ocupado = false;

/** Decide se já pode postar agora (janela de horário, limite diário e intervalo). */
export function podePostar(agora = new Date(), cfg = config.agendador, totalHoje = 0, ultimo = 0) {
  const h = horaLocal(agora, cfg.fusoHorario);
  if (h < cfg.horaInicio || h >= cfg.horaFim) return false;
  if (totalHoje >= cfg.maxPorDia) return false;
  return agora.getTime() - ultimo >= cfg.intervaloMin * 60_000;
}

/** Filtra e ordena ofertas da busca automática da Shopee. */
export function escolherOfertas(ofertas, { descontoMin, notaMin }) {
  return ofertas
    .filter((o) => o.link && o.desconto >= descontoMin && (o.nota ?? 0) >= notaMin)
    .sort((a, b) => b.desconto * (b.comissao || 0.01) - a.desconto * (a.comissao || 0.01));
}

async function buscaAutomatica(avisar) {
  const a = config.autoShopee;
  if (!a.ativo || !shopeeConfigurada() || !a.palavras.length) return;
  if (Date.now() - ultimaBusca < a.intervaloHoras * 3600_000) return;
  ultimaBusca = Date.now();
  let novas = 0;
  for (const palavra of a.palavras) {
    try {
      const ofertas = escolherOfertas(await buscarOfertasShopee(palavra), a);
      for (const o of ofertas.slice(0, 2)) {
        if (!jaPostada(o.chave) && adicionar({ ...o, criadaEm: new Date().toISOString() })) novas++;
      }
    } catch (e) {
      console.error(`[auto-shopee] ${palavra}: ${e.message}`);
    }
  }
  if (novas) avisar?.(`🤖 Busca automática: ${novas} oferta(s) da Shopee entraram na fila. Use /fila para ver.`);
}

async function ciclo(avisar) {
  if (ocupado) return;
  ocupado = true;
  try {
    await buscaAutomatica(avisar);
    const agora = new Date();
    const dia = diaLocal(agora, config.agendador.fusoHorario);
    if (!podePostar(agora, config.agendador, postsHoje(dia), ultimoPost)) return;
    const oferta = proxima();
    if (!oferta) return;
    ultimoPost = Date.now();
    const res = await publicar(oferta, config.agendador.fusoHorario);
    const falhas = res.filter((r) => !r.ok);
    if (falhas.length) avisar?.(`⚠️ Falhas ao postar "${oferta.titulo}":\n${falhas.map((f) => `${f.destino}: ${f.erro}`).join('\n')}`);
  } catch (e) {
    console.error('[agendador]', e);
  } finally {
    ocupado = false;
  }
}

export function iniciarAgendador(avisar) {
  setInterval(() => ciclo(avisar), 60_000);
  setTimeout(() => ciclo(avisar), 5_000);
}

export function registrarPostManual() {
  ultimoPost = Date.now();
}
