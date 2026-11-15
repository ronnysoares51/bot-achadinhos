import { config } from './config.js';
import { listar, adicionar, limparFila } from './fila.js';
import { publicarNaAutomacao, diaLocal, horaLocal, diaSemanaLocal } from './publicar.js';
import { buscarOfertasShopee, shopeeConfigurada } from './lojas/shopee.js';
import { listarAutomacoes, aceita, podePostar, registrarBusca } from './automacoes.js';

let ocupado = false;

/** Filtra e ordena ofertas da busca automática da Shopee. */
export function escolherOfertas(ofertas, { descontoMin, notaMin }) {
  return ofertas
    .filter((o) => o.link && o.desconto >= descontoMin && (o.nota ?? 0) >= notaMin)
    .sort((a, b) => b.desconto * (b.comissao || 0.01) - a.desconto * (a.comissao || 0.01));
}

/** Busca da Shopee de cada automação que usa essa fonte (no intervalo dela). */
async function buscasShopee(automacoes, avisar) {
  if (!shopeeConfigurada()) return;
  for (const a of automacoes) {
    const b = a.buscaShopee;
    if (!a.ativa || !a.fontes.includes('shopee') || !b.palavras.length) continue;
    if (Date.now() - a.estado.ultimaBusca < b.intervaloHoras * 3600_000) continue;
    registrarBusca(a.id);
    let novas = 0;
    for (const palavra of b.palavras) {
      try {
        const ofertas = escolherOfertas(await buscarOfertasShopee(palavra), b);
        for (const o of ofertas.slice(0, 3)) {
          const item = { ...o, fonte: 'shopee', automacao: a.id };
          if (aceita(item, a).ok && adicionar(item)) novas++;
        }
      } catch (e) {
        console.error(`[shopee] ${a.nome} / ${palavra}: ${e.message}`);
      }
    }
    if (novas) avisar?.(`🤖 Busca na Shopee (${a.nome}): ${novas} oferta(s) na fila.`);
  }
}

async function ciclo(avisar) {
  if (ocupado) return;
  ocupado = true;
  try {
    const automacoes = listarAutomacoes();
    await buscasShopee(automacoes, avisar);
    const agora = new Date();
    const fuso = config.agendador.fusoHorario;
    const momento = { agora, dia: diaLocal(agora, fuso), hora: horaLocal(agora, fuso), diaSemana: diaSemanaLocal(agora, fuso) };
    for (const a of listarAutomacoes()) {
      if (!podePostar(a, momento)) continue;
      const oferta = listar().find((o) => aceita(o, a).ok);
      if (!oferta) continue;
      const res = await publicarNaAutomacao(oferta, a);
      const falhas = res.filter((r) => !r.ok);
      if (falhas.length) avisar?.(`⚠️ ${a.nome}: falhas ao postar "${oferta.titulo}":\n${falhas.map((f) => `${f.destino}: ${f.erro}`).join('\n')}`);
    }
    limparFila(listarAutomacoes(), aceita);
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

/** Mantido por compatibilidade: o ritmo agora é controlado por automação. */
export function registrarPostManual() {}
