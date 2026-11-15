import { formatarTelegram, formatarWhatsApp } from './formatar.js';
import { publicarNosCanais } from './destinos/telegram.js';
import { publicarNosGrupos } from './destinos/whatsapp.js';
import { marcarPostada } from './fila.js';

export function diaLocal(data = new Date(), fuso = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(data);
}

export function horaLocal(data = new Date(), fuso = 'America/Sao_Paulo') {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour: '2-digit', hourCycle: 'h23' }).format(data));
}

/** Publica a oferta em todos os destinos (Telegram primeiro, depois WhatsApp com pausas). */
export async function publicar(oferta, fuso) {
  const tg = await publicarNosCanais(oferta, formatarTelegram(oferta));
  const wa = await publicarNosGrupos(oferta, formatarWhatsApp(oferta));
  const resultados = [...tg, ...wa];
  if (resultados.some((r) => r.ok)) marcarPostada(oferta, diaLocal(new Date(), fuso), resultados);
  return resultados;
}
