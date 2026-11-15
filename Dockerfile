FROM node:22-alpine
# git: o Baileys baixa uma dependência (libsignal) direto do GitHub
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV PASTA_DADOS=/app/dados WHATSAPP_SESSAO=/app/dados/whatsapp-sessao NODE_ENV=production
VOLUME ["/app/dados"]
EXPOSE 3000
CMD ["node", "src/index.js"]
