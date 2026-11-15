# Deploy no VPS da Hostinger

Servidor: VPS KVM 2 (Ubuntu 24.04), IP `187.41.105.104`.
Endereço do painel: **https://achadinhos.rstvquix.com** (registro DNS tipo A `achadinhos` → `187.41.105.104`).

> A hospedagem compartilhada (plano Premium) só roda PHP/HTML. O bot precisa ficar ligado 24h (Node.js + WhatsApp), por isso roda no VPS.

## Primeira instalação

No console do VPS (hPanel → VPS → Web console, ou `ssh root@187.41.105.104`):

```bash
# 1) chave de leitura para o repositório privado (adicione a chave pública em
#    GitHub → bot-achadinhos → Settings → Deploy keys, sem permissão de escrita)
ssh-keygen -t ed25519 -N "" -f ~/.ssh/bot_achadinhos -C "vps-bot-achadinhos"
cat ~/.ssh/bot_achadinhos.pub
printf 'Host github-bot\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/bot_achadinhos\n  IdentitiesOnly yes\n' >> ~/.ssh/config

# 2) baixar e instalar
git clone git@github-bot:ronnysoares51/bot-achadinhos.git /opt/bot-achadinhos
bash /opt/bot-achadinhos/scripts/instalar-vps.sh
```

O script instala o Docker (se faltar), cria o `.env` com uma senha aleatória para o painel e sobe:

- `bot`: o bot + painel web (porta interna 3000);
- `caddy`: HTTPS automático (Let's Encrypt) nas portas 80/443.

Se as portas 80/443 já estiverem em uso por outro serviço, o script sobe sem o Caddy e o painel fica em `127.0.0.1:3010` para ser ligado ao proxy existente.

## Depois de instalado

1. Abra https://achadinhos.rstvquix.com e entre com a senha (`grep PAINEL_SENHA /opt/bot-achadinhos/.env`).
2. Preencha o token do Telegram e salve. Mande `/start` ao bot no Telegram, copie seu ID para "IDs dos admins" e salve de novo.
3. Para o WhatsApp: em "Ativo" coloque `true`, salve e escaneie o QR que aparece no painel.

## Atualizar

```bash
cd /opt/bot-achadinhos && git pull && docker compose up -d --build
```

## Logs

```bash
cd /opt/bot-achadinhos && docker compose logs -f bot
```
