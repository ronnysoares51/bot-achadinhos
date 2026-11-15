// Uso: npm run testar-link -- "https://shopee.com.br/produto-i.123.456"
import { montarOferta } from '../src/oferta.js';
import { formatarWhatsApp } from '../src/formatar.js';

const entrada = process.argv.slice(2).join(' ');
if (!entrada) {
  console.log('Uso: npm run testar-link -- "LINK DO PRODUTO"');
  process.exit(1);
}
try {
  const oferta = await montarOferta(entrada);
  console.log(JSON.stringify(oferta, null, 2));
  console.log('\n--- Prévia WhatsApp ---\n');
  console.log(formatarWhatsApp(oferta));
} catch (e) {
  console.error('Erro:', e.message);
  process.exit(1);
}
