// Carrega o .env se o pacote dotenv estiver instalado (nos testes ele é opcional).
try {
  await import('dotenv/config');
} catch {
  /* sem dotenv: usa só as variáveis de ambiente */
}

import fs from 'node:fs';
import path from 'node:path';

// Configurações salvas pelo painel web (dados/config.json) têm prioridade sobre o .env.
export const ARQUIVO_CONFIG = path.join(process.env.PASTA_DADOS || 'dados', 'config.json');
export function lerConfigSalva() {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO_CONFIG, 'utf8'));
  } catch {
    return {};
  }
}
for (const [k, v] of Object.entries(lerConfigSalva())) {
  if (v !== undefined && v !== null && String(v) !== '') process.env[k] = String(v);
}

const lista =(v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const num = (v, padrao) => (v === undefined || v === '' ? padrao : Number(v));

export const config = {
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    // Canais/grupos onde as ofertas são publicadas (o bot precisa ser admin).
    canais: lista(process.env.TELEGRAM_CANAIS),
    // Só esses IDs de usuário podem mandar links e comandos no privado do bot.
    admins: lista(process.env.TELEGRAM_ADMINS),
  },
  whatsapp: {
    ativo: process.env.WHATSAPP_ATIVO === 'true',
    // IDs (xxx@g.us) ou nomes exatos dos grupos de destino.
    grupos: lista(process.env.WHATSAPP_GRUPOS),
    pastaSessao: process.env.WHATSAPP_SESSAO || 'dados/whatsapp-sessao',
    // Pausa aleatória entre um grupo e outro (segundos) para parecer envio humano.
    pausaMin: num(process.env.WHATSAPP_PAUSA_MIN, 20),
    pausaMax: num(process.env.WHATSAPP_PAUSA_MAX, 60),
  },
  clone: {
    // Grupos de ofertas de outras pessoas que o número do bot acompanha (IDs ou nomes).
    grupos: lista(process.env.WHATSAPP_MONITORAR),
    // true = vai direto para a fila; false = manda para você aprovar no Telegram.
    automatico: process.env.CLONE_AUTOMATICO === 'true',
    maxHora: num(process.env.CLONE_MAX_HORA, 10),
  },
  shopee: {
    appId: process.env.SHOPEE_APP_ID || '',
    secret: process.env.SHOPEE_SECRET || '',
    subId: process.env.SHOPEE_SUB_ID || 'achadinhos',
    apiUrl: process.env.SHOPEE_API_URL || 'https://open-api.affiliate.shopee.com.br/graphql',
  },
  mercadolivre: {
    mattWord: process.env.ML_MATT_WORD || '',
    mattTool: process.env.ML_MATT_TOOL || '',
  },
  shein: {
    // Parâmetros extras opcionais (ex.: "url_from=SEU_ID"). Se vazio, o link colado é usado como está.
    parametros: process.env.SHEIN_PARAMETROS || '',
  },
  agendador: {
    // Intervalo entre posts da fila (minutos) e janela de horário permitida.
    intervaloMin: num(process.env.POST_INTERVALO_MIN, 45),
    horaInicio: num(process.env.POST_HORA_INICIO, 8),
    horaFim: num(process.env.POST_HORA_FIM, 22),
    maxPorDia: num(process.env.POST_MAX_DIA, 8),
    fusoHorario: process.env.TZ || 'America/Sao_Paulo',
  },
  autoShopee: {
    // Busca automática na Shopee por palavras-chave (precisa das credenciais da API).
    ativo: process.env.AUTO_SHOPEE === 'true',
    palavras: lista(process.env.AUTO_SHOPEE_PALAVRAS),
    descontoMin: num(process.env.AUTO_SHOPEE_DESCONTO_MIN, 30),
    notaMin: num(process.env.AUTO_SHOPEE_NOTA_MIN, 4.5),
    intervaloHoras: num(process.env.AUTO_SHOPEE_INTERVALO_H, 3),
  },
  pastaDados: process.env.PASTA_DADOS || 'dados',
  painel: {
    porta: num(process.env.PAINEL_PORTA, 3000),
    senha: process.env.PAINEL_SENHA || '',
  },
};
