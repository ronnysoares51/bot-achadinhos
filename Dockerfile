FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV PASTA_DADOS=/app/dados WHATSAPP_SESSAO=/app/dados/whatsapp-sessao
VOLUME ["/app/dados"]
CMD ["node", "src/index.js"]
