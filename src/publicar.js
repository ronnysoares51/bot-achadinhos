import { config } from './config.js';
import { formatarTelegram, formatarWhatsApp } from './formatar.js';
import { publicarNosCanais } from './destinos/telegram.js';
import { publicarNosGrupos } from './destinos/whatsapp.js';
import { marcarPostada } from './fila.js';
import { listarAutomacoes, registrarEnvio } from './automacoes.js';
import { garantirFoto } from './imagem.js';

export function diaLocal(data = new Date(), fuso = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

export function horaLocal(data = new Date(), fuso = 'America/Sao_Paulo') {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour: '2-digit', hourCycle: 'h23' }).format(data));
}

export function diaSemanaLocal(data = new Date(), fuso = 'America/Sao_Paulo') {
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: fuso, weekday: 'short' }).format(data);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nome);
}

/** Envia a oferta para os destinos de UMA automação, com o modelo e o formato dela. */
export async function publicarNaAutomacao(oferta, a) {
  if (a.formato !== 'texto') await garantirFoto(oferta);
  const modelo = a.modelo || process.env.MODELO_MENSAGEM;
  const comImagem = a.formato !== 'texto';
  const tg = await publicarNosCanais(oferta, formatarTelegram(oferta, modelo), a.destinos.telegram, { comImagem });
  const wa = await publicarNosGrupos(oferta, formatarWhatsApp(oferta, modelo), a.destinos.whatsapp, { comImagem });
  const resultados = [...tg, ...wa];
  if (resultados.some((r) => r.ok)) {
    const dia = diaLocal(new Date(), config.agendador.fusoHorario);
    registrarEnvio(a.id, oferta.chave, dia);
    marcarPostada(oferta, dia, resultados, { automacao: a });
  }
  return resultados;
}

/**
 * "Postar agora": manda para os destinos de todas as automações ligadas (cada destino uma vez só).
 * Sem automações, usa os canais/grupos antigos da configuração.
 */
export async function publicar(oferta, fuso = config.agendador.fusoHorario) {
  await garantirFoto(oferta);
  const ativas = listarAutomacoes().filter((a) => a.ativa);
  const dia = diaLocal(new Date(), fuso);
  const resultados = [];
  if (ativas.length) {
    const feitos = new Set();
    for (const a of ativas) {
      const tg = a.destinos.telegram.filter((d) => !feitos.has(`t:${d}`));
      const wa = a.destinos.whatsapp.filter((d) => !feitos.has(`w:${d}`));
      tg.forEach((d) => feitos.add(`t:${d}`));
      wa.forEach((d) => feitos.add(`w:${d}`));
      const modelo = a.modelo || process.env.MODELO_MENSAGEM;
      const comImagem = a.formato !== 'texto';
      resultados.push(...(await publicarNosCanais(oferta, formatarTelegram(oferta, modelo), tg, { comImagem })));
      resultados.push(...(await publicarNosGrupos(oferta, formatarWhatsApp(oferta, modelo), wa, { comImagem })));
      registrarEnvio(a.id, oferta.chave, dia);
    }
  } else {
    resultados.push(...(await publicarNosCanais(oferta, formatarTelegram(oferta))));
    resultados.push(...(await publicarNosGrupos(oferta, formatarWhatsApp(oferta))));
  }
  if (resultados.some((r) => r.ok)) marcarPostada(oferta, dia, resultados);
  return resultados;
}
