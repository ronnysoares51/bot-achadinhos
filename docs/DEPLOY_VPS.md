# Deploy no VPS da Hostinger

Servidor: VPS KVM 2 (Ubuntu 24.04), IP `187.41.105.104`.
Endereço do painel: **https://achadinhos.rstvquix.com** (registro DNS tipo A `achadinhos` → `187.41.105.104`).

> A hospedagem compartilhada (plano Premium) só roda PHP/HTML. O bot precisa ficar ligado 24h (Node.js + WhatsApp), por isso roda no VPS.

## Como está montado neste VPS

As portas 80/443 do VPS já são do **Caddy do projeto `evolution-api`**, que faz o HTTPS dos sites. O bot não sobe outro Caddy:

- projeto Docker `bot-achadinhos` (Gerenciador Docker → Compose a partir de URL →
  `https://github.com/ronnysoares51/bot-achadinhos/blob/main/docker-compose.yml`);
- o painel fica em `127.0.0.1:3010` e na rede do Caddy com o nome `bot-achadinhos`;
- o Caddy existente recebe o bloco:

```
achadinhos.rstvquix.com {
	reverse_proxy bot-achadinhos:3000
}
```

Isso é feito pelo script (backup, validação e recarga sem derrubar os outros sites):

```bash
curl -fsSL https://raw.githubusercontent.com/ronnysoares51/bot-achadinhos/main/scripts/ligar-subdominio.sh | bash
```

**Depois de reimplantar o bot, rode o script de novo** (ele refaz a ligação de rede; o bloco no Caddyfile já fica salvo).

## Senha do painel

Na primeira vez o bot cria uma senha aleatória e mostra nos logs do contêiner:

```
[painel] Senha do painel: XXXXXXXXXXXX
```

Gerenciador Docker → bot-achadinhos → Gerenciar → Logs, ou `docker logs bot-achadinhos-bot-1 2>&1 | grep Senha`.
Para definir a sua, use a variável `PAINEL_SENHA`.

## Depois de instalado

1. Abra https://achadinhos.rstvquix.com e entre com a senha.
2. Preencha o token do Telegram e salve. Mande `/start` ao bot no Telegram, copie seu ID para "IDs dos admins" e salve de novo.
3. Para o WhatsApp: em "Ativo" coloque `true`, salve e escaneie o QR que aparece no painel.

## Servidor novo (portas 80/443 livres)

Use `docker-compose.com-caddy.yml`, que já traz o próprio Caddy com HTTPS automático, ou rode `scripts/instalar-vps.sh`.
