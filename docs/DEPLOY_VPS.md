# Deploy no VPS da Hostinger

Servidor: VPS KVM 2 (Ubuntu 24.04), IP `187.41.105.104`.
Endereço do painel: **https://achadinhos.rstvquix.com** (registro DNS tipo A `achadinhos` → `187.41.105.104`).

> A hospedagem compartilhada (plano Premium) só roda PHP/HTML. O bot precisa ficar ligado 24h (Node.js + WhatsApp), por isso roda no VPS.

## Opção 1 — Gerenciador Docker do hPanel (sem terminal)

1. hPanel → VPS → **Gerenciador Docker** → **Compose** → **Compose a partir de URL**.
2. URL: `https://github.com/ronnysoares51/bot-achadinhos/blob/main/docker-compose.yml` · Nome do projeto: `bot-achadinhos`.
3. **Implantar**.

Sobem dois contêineres:

- `bot`: o bot + painel web (porta interna 3000);
- `caddy`: HTTPS automático (Let's Encrypt) nas portas 80/443, para `achadinhos.rstvquix.com`.

## Opção 2 — terminal

```bash
git clone https://github.com/ronnysoares51/bot-achadinhos.git /opt/bot-achadinhos
bash /opt/bot-achadinhos/scripts/instalar-vps.sh
```

Se as portas 80/443 já estiverem em uso por outro serviço, o script sobe sem o Caddy e o painel fica em `127.0.0.1:3010` para ser ligado ao proxy existente.

## Senha do painel

Na primeira vez o bot cria uma senha aleatória e mostra nos logs do contêiner `bot`:

```
[painel] Senha do painel: XXXXXXXXXXXX
```

(Gerenciador Docker → bot-achadinhos → Gerenciar → Logs, ou `docker compose logs bot | grep Senha`.)
Para definir a sua, use a variável `PAINEL_SENHA`.

## Depois de instalado

1. Abra https://achadinhos.rstvquix.com e entre com a senha.
2. Preencha o token do Telegram e salve. Mande `/start` ao bot no Telegram, copie seu ID para "IDs dos admins" e salve de novo.
3. Para o WhatsApp: em "Ativo" coloque `true`, salve e escaneie o QR que aparece no painel.

## Atualizar

Gerenciador Docker → bot-achadinhos → Gerenciar → reimplantar (rebuild). Pelo terminal:
`docker compose up -d --build`.
