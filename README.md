# 🛍️ Bot de Achadinhos

Bot que transforma links de produto em **links de afiliado** e posta as ofertas em **grupos do WhatsApp** e **canais do Telegram**.

Lojas: **Mercado Livre · Shopee · Shein · TikTok Shop**

> Por que este projeto existe e como ele se compara aos outros bots do GitHub: veja [docs/ANALISE.md](docs/ANALISE.md).

## Como funciona

1. Você cola o link do produto no **privado do bot no Telegram**.
2. O bot gera o seu link de afiliado, busca foto e preço e mostra a **prévia** do post.
3. Você escolhe: **✅ Postar agora**, **🕒 Pôr na fila** ou **🗑 Descartar**.
4. A fila é postada sozinha no horário que você definir (ex.: das 8h às 22h, a cada 45 min, no máximo 8 por dia).
5. Opcional: **busca automática na Shopee** por palavras-chave, filtrando desconto e nota.

Se a loja não mostrar o preço (comum no TikTok Shop e na Shein), complete na mesma mensagem:

```
https://vt.tiktok.com/SEU-LINK/
titulo: Garrafa Térmica 1L
de: 99,90
por: 39,90
cupom: TIK10
obs: Frete grátis
```

## Lojas

| Loja | O que você precisa |
|---|---|
| **Shopee** | Credenciais da [Shopee Affiliate Open API](https://affiliate.shopee.com.br/open_api) (`SHOPEE_APP_ID`, `SHOPEE_SECRET`). O bot gera o link sozinho. |
| **Mercado Livre** | Cole um link **meli.la** do Linkbuilder (recomendado) **ou** preencha `ML_MATT_WORD` e `ML_MATT_TOOL` para converter links comuns. Confira no painel do ML se as vendas estão sendo creditadas. |
| **Shein** | Cole o **seu link de afiliado** gerado no app/portal da Shein. |
| **TikTok Shop** | Cole o **seu link de afiliado** gerado no app (Afiliados → Produto → Compartilhar). |

Links curtos de outras pessoas (Shopee/ML) são expandidos e limpos antes da conversão, para a comissão ser sua.

## Instalação

Requisitos: **Node.js 20+** (ou Docker).

```bash
git clone https://github.com/ronnysoares51/bot-achadinhos.git
cd bot-achadinhos
npm install
cp .env.example .env     # preencha
npm start
```

### Passo a passo do Telegram

1. Crie um bot no [@BotFather](https://t.me/BotFather) e coloque o token em `TELEGRAM_BOT_TOKEN`.
2. Rode o bot e mande `/start` no privado: ele responde com o seu ID. Coloque em `TELEGRAM_ADMINS` e reinicie.
3. Adicione o bot como **administrador** do seu canal e coloque `@seucanal` (ou o ID `-100...`) em `TELEGRAM_CANAIS`.

### Passo a passo do WhatsApp

1. `WHATSAPP_ATIVO=true` e rode o bot.
2. Escaneie o QR que aparece no terminal (também salvo em `dados/whatsapp-qr.png`) em **WhatsApp → Aparelhos conectados**.
3. Mande `/grupos` ao bot no Telegram, copie os IDs dos grupos e coloque em `WHATSAPP_GRUPOS`. Reinicie.

> ⚠️ **Risco de banimento:** o WhatsApp não tem API oficial para grupos. Este bot usa a biblioteca não oficial Baileys (a mesma ideia do WhatsApp Web). Use **um número só para isso**, poucos posts por dia (5 a 8 por grupo) e mantenha as pausas entre grupos.

### Docker

```bash
cp .env.example .env     # preencha
docker compose up -d
docker compose logs -f   # QR do WhatsApp aparece aqui
```

## Painel web

Com `PAINEL_SENHA` preenchido, o bot abre um painel na porta `3000` (em produção: **http://achadinhos.rstvquix.com:3010**):

- status do Telegram, do WhatsApp, da fila e dos posts do dia;
- **QR do WhatsApp** para escanear pelo navegador;
- todas as configurações (tokens, lojas, horários). Ao salvar, o bot reinicia sozinho com os novos valores (ficam em `dados/config.json`, com prioridade sobre o `.env`).

## Deploy no VPS (Hostinger)

Veja [docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md).

## Comandos no Telegram

| Comando | O que faz |
|---|---|
| (colar link) | Gera prévia com botões |
| `/fila` | Mostra a fila |
| `/postar` | Posta a próxima da fila agora |
| `/remover ID` | Tira uma oferta da fila |
| `/grupos` | Lista grupos do WhatsApp com os IDs |
| `/status` | Situação do bot |

## Testes

```bash
npm test
npm run testar-link -- "https://shopee.com.br/produto-i.123.456"
```

## Estrutura

```
src/
  index.js            inicia WhatsApp, agendador e painel do Telegram
  config.js           variáveis de ambiente
  oferta.js           monta a oferta (link de afiliado + preço + foto)
  formatar.js         texto do post (WhatsApp e Telegram)
  fila.js             fila, histórico (não repete por 7 dias) e contagem diária
  agendador.js        posta a fila no horário e faz a busca automática da Shopee
  publicar.js         envia para todos os destinos
  telegramAdmin.js    painel no privado do Telegram
  lojas/              Shopee (API oficial), Mercado Livre, Shein, TikTok Shop, prévia de página
  destinos/           Telegram (Bot API) e WhatsApp (Baileys)
```

## Licença

MIT
