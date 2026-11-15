import { config } from './config.js';
import { iniciarWhatsApp } from './destinos/whatsapp.js';
import { iniciarPainelTelegram, avisarAdmins, enviarParaAprovacao } from './telegramAdmin.js';
import { processarMensagem } from './clone.js';
import { iniciarAgendador } from './agendador.js';
import { iniciarPainelWeb } from './painel.js';
import { chamar } from './destinos/telegram.js';
import { migrarConfiguracaoAntiga } from './automacoes.js';

async function main() {
  console.log('Bot de Achadinhos iniciando...');
  const migrada = migrarConfiguracaoAntiga();
  if (migrada) console.log(`[automações] Configuração antiga virou a automação "${migrada.nome}".`);
  iniciarPainelWeb();

  if (!config.telegram.token) {
    console.warn('[aviso] TELEGRAM_BOT_TOKEN vazio: preencha no painel web (ou no .env). Aguardando...');
    return; // fica só o painel web no ar até salvar a configuração
  }
  if (!config.telegram.admins.length) {
    console.warn('[aviso] TELEGRAM_ADMINS vazio: mande /start ao bot no privado para descobrir seu ID.');
  }

  await iniciarWhatsApp({
    aoReceberMensagem: async (msg) => {
      const r = await processarMensagem(msg, { aprovar: enviarParaAprovacao, avisar: avisarAdmins }).catch((e) => ({ ok: false, motivo: e.message }));
      if (r.ok) console.log(`[clone] ${msg.nomeGrupo}: oferta enviada para ${r.destino}`);
      else if (!/sem link|repetida/.test(r.motivo)) console.log(`[clone] ${msg.nomeGrupo}: ignorada (${r.motivo})`);
    },
    aoReceberQr: (png) => {
      for (const id of config.telegram.admins) {
        chamar('sendMessage', { chat_id: id, text: `📱 QR do WhatsApp gerado. Abra o painel web para escanear (arquivo ${png}).` }).catch(() => {});
      }
    },
  });

  iniciarAgendador(avisarAdmins);
  await iniciarPainelTelegram();
}

main().catch((e) => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
