#!/usr/bin/env bash
# Instala/atualiza o Bot de Achadinhos num VPS Ubuntu (rodar como root, dentro da pasta do projeto).
set -euo pipefail
cd "$(dirname "$0")/.."
DOMINIO="${DOMINIO:-achadinhos.rstvquix.com}"

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null

echo "==> Arquivo .env"
if [ ! -f .env ]; then
  cp .env.example .env
  SENHA="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)"
  sed -i "s/^PAINEL_SENHA=.*/PAINEL_SENHA=${SENHA}/" .env
  echo "DOMINIO=${DOMINIO}" >> .env
  chmod 600 .env
  echo "    Senha do painel criada: ${SENHA}"
else
  echo "    .env já existe (mantido)."
fi

echo "==> Portas 80/443"
OCUPADAS="$(ss -ltnp 2>/dev/null | awk '$4 ~ /:(80|443)$/' | grep -v caddy || true)"
if [ -n "$OCUPADAS" ] && ! docker compose ps --services 2>/dev/null | grep -q caddy; then
  echo "    As portas 80/443 já estão em uso por outro serviço:"
  echo "$OCUPADAS"
  echo "    Subindo sem o Caddy (painel em 127.0.0.1:3010). Configure o proxy existente para ${DOMINIO}."
  docker compose -f docker-compose.sem-caddy.yml up -d --build
else
  docker compose up -d --build
fi

echo "==> Pronto"
docker compose ps
echo "Painel: https://${DOMINIO}"
echo "Senha:  grep PAINEL_SENHA .env"
