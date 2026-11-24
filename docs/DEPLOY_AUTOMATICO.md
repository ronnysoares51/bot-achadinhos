# Deploy automático do bot existente

## O que muda
Somente arquivos de automação. Nenhum arquivo `src/`, configuração, sessão ou fila é alterado.
O workflow aceita push em main e execução manual em main. Os testes usam um contêiner isolado sem rede e sem dados de produção. O deploy é serializado no GitHub e por flock na VPS.
O servidor aceita somente `deploy <SHA>`, exige que SHA seja o main atual e testa novamente a imagem antes de substituir o serviço bot.
A configuração efetiva continua em `/docker/bot-achadinhos/docker-compose.yml`; o volume fixo continua `/opt/bot-achadinhos-dados:/app/dados`.
Não há docker compose down, remoção de volumes, alteração de outros projetos ou envio manual de ofertas.
Se a inicialização falhar, o script tenta voltar à imagem anterior. Isso não reverte migrações de dados feitas por futuras versões.

## Ativação (ainda pendente)
1. Instalar `scripts/deploy-hostinger.sh` como `/usr/local/sbin/deploy-bot-achadinhos`, root:root, modo 0755, após conferir seu conteúdo.
2. Executar `bash /usr/local/sbin/deploy-bot-achadinhos --check`.
3. Criar chave SSH exclusiva. A chave pública deve ser adicionada ao authorized_keys existente sem sobrescrevê-lo, com as opções:
   `restrict,command="/usr/local/sbin/deploy-bot-achadinhos"`
   A chave não deve permitir shell, PTY ou encaminhamento. A chave privada não deve ser publicada nem aparecer em logs.
4. No GitHub Actions deste repositório, cadastrar os secrets `BOT_DEPLOY_SSH_KEY` (chave privada exclusiva) e `BOT_DEPLOY_KNOWN_HOSTS` (host key obtida e conferida pela sessão autenticada da VPS), e a variável `BOT_DEPLOY_HOST` (endereço da VPS). Nunca confiar somente em ssh-keyscan feito pela rede sem conferir a identidade.
5. Integrar esta alteração em main. Acompanhar a primeira execução até os testes, o deploy e a verificação HTTP passarem. Confirmar no painel que WhatsApp/Telegram continuam conectados.
6. Só então considerar a automação ativa e validada.

## Por que não usar a ação oficial diretamente
A ação `hostinger/deploy-on-vps@v2` chama a API de criação/atualização de projeto e declara sucesso quando a solicitação foi aceita; não aguarda saúde do serviço. Não foi comprovado que ela preservaria o .env local deste projeto. O compose atual também compila main, e não o SHA testado. O procedimento SSH conserva o compose local e publica explicitamente o SHA verificado.

## Verificações feitas na preparação
- Projeto, porta 3010 e mount de dados conferidos na VPS.
- Sintaxe Bash e modo --check validados no servidor.
- Credencial exclusiva e primeiro deploy via GitHub Actions ainda pendentes.
