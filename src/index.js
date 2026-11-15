import { config } from './config.js';
import { iniciarWhatsApp } from './destinos/whatsapp.js';
import { iniciarPainelTelegram, avisarAdmins } from './telegramAdmin.js';
import { iniciarAgendador } from './agendador.js';
import { chamar } from './destinos/telegram.js';

async function main() {
  console.log('Bot de Achadinhos iniciando...');
  if (!config.telegram.admins.length) {
    console.warn('[aviso] TELEGRAM_ADMINS vazio: mande /start ao bot no privado para descobrir seu ID.');
  }

  await iniciarWhatsApp({
    aoReceberQr: (png) => {
      for (const id of config.telegram.admins) {
        chamar('sendMessage', { chat_id: id, text: `📱 QR do WhatsApp gerado. Veja no terminal ou no arquivo ${png}.` }).catch(() => {});
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
