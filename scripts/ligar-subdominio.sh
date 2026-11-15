#!/usr/bin/env bash
# Liga achadinhos.rstvquix.com ao painel do bot usando o Caddy que já existe no VPS.
# - coloca o contêiner do bot na mesma rede do Caddy (sem reiniciar nada);
# - acrescenta o bloco do subdomínio no Caddyfile (com backup);
# - valida e recarrega o Caddy sem derrubar os outros sites; se falhar, desfaz.
# Rode de novo depois de reimplantar o bot (a ligação de rede é refeita).
set -uo pipefail
DOMINIO="${DOMINIO:-achadinhos.rstvquix.com}"
BOT="$(docker ps --format '{{.Names}}' | grep -E '^bot-achadinhos-bot' | head -1)"
C="$(docker ps --format '{{.Names}}' | grep -E 'caddy' | grep -v bot-achadinhos | head -1)"
[ -n "$BOT" ] || { echo "Contêiner do bot não está rodando."; exit 1; }
[ -n "$C" ] || { echo "Nenhum contêiner do Caddy rodando."; exit 1; }
echo "Bot: $BOT  |  Caddy: $C"

# 1) mesma rede
REDE="$(docker inspect "$C" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')"
if ! docker inspect "$BOT" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | grep -qw "$REDE"; then
  docker network connect --alias bot-achadinhos "$REDE" "$BOT" && echo "Bot conectado à rede $REDE."
fi

# 2) Caddyfile no host
DEST="$(docker inspect "$C" --format '{{join .Args " "}}' | grep -oE -- '--config [^ ]+' | awk '{print $2}')"
DEST="${DEST:-/etc/caddy/Caddyfile}"
MONT="$(docker inspect "$C" --format '{{range .Mounts}}{{.Source}}|{{.Destination}}{{"\n"}}{{end}}')"
F="$(echo "$MONT" | awk -F'|' -v d="$DEST" '$2==d{print $1}')"
if [ -z "$F" ]; then
  B="$(echo "$MONT" | awk -F'|' -v d="$(dirname "$DEST")" '$2==d{print $1}')"
  [ -n "$B" ] && F="$B/$(basename "$DEST")"
fi
[ -n "$F" ] && [ -f "$F" ] || { echo "Não achei o Caddyfile no host (config: $DEST)."; echo "$MONT"; exit 1; }
echo "Caddyfile: $F"

if grep -q "$DOMINIO" "$F"; then
  echo "O bloco de $DOMINIO já existe."
else
  cp "$F" "$F.bak-achadinhos"
  printf '\n%s {\n\treverse_proxy bot-achadinhos:3000\n}\n' "$DOMINIO" >> "$F"
  echo "Bloco adicionado."
fi

# 3) validar e recarregar
if docker exec "$C" caddy validate --config "$DEST" --adapter caddyfile >/dev/null 2>&1 \
   && docker exec "$C" caddy reload --config "$DEST" --adapter caddyfile; then
  echo "OK: Caddy recarregado. Abra https://$DOMINIO"
else
  echo "Falhou ao validar/recarregar. Desfazendo..."
  [ -f "$F.bak-achadinhos" ] && cp "$F.bak-achadinhos" "$F"
  docker exec "$C" caddy validate --config "$DEST" --adapter caddyfile 2>&1 | tail -5
fi
