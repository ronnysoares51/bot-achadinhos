FROM node:22-alpine
# git: o Baileys baixa uma dependência (libsignal) direto do GitHub
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
# O WhatsApp recusa clientes que se identificam como "WEB" (erro 405 desde fev/2026):
# troca para MACOS no código do Baileys.
RUN for f in $(grep -rl "UserAgent.Platform.WEB" node_modules/baileys/lib 2>/dev/null); do \
      sed -i 's/UserAgent\.Platform\.WEB/UserAgent.Platform.MACOS/g' "$f" && echo "patch: $f"; done; true
COPY . .
ENV PASTA_DADOS=/app/dados WHATSAPP_SESSAO=/app/dados/whatsapp-sessao NODE_ENV=production
VOLUME ["/app/dados"]
EXPOSE 3000
CMD ["node", "src/index.js"]
