import { config } from './config.js';
import { iniciarWhatsApp } from './destinos/whatsapp.js';
import { iniciarPainelTelegram, avisarAdmins } from './telegramAdmin.js';
import { iniciarAgendador } from './agendador.js';
import { iniciarPainelWeb } from './painel.js';
import { chamar } from './destinos/telegram.js';

async function main() {
  console.log('Bot de Achadinhos iniciando...');
  iniciarPainelWeb();

  if (!config.telegram.token) {
    console.warn('[aviso] TELEGRAM_BOT_TOKEN vazio: preencha no painel web (ou no .env). Aguardando...');
    return; // fica só o painel web no ar até salvar a configuração
  }
  if (!config.telegram.admins.length) {
    console.warn('[aviso] TELEGRAM_ADMINS vazio: mande /start ao bot no privado para descobrir seu ID.');
  }

  await iniciarWhatsApp({
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
