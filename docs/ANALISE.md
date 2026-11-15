# Análise dos bots de achadinhos no GitHub

Data: 14/11/2026. Objetivo: achar uma ferramenta que poste em grupos de achadinhos do **WhatsApp** e do **Telegram** integrando **Mercado Livre, Shopee, Shein e TikTok Shop**.

## Como foi feita

Os 9 projetos mais relevantes foram clonados e analisados (código, dependências, testes, histórico de commits, segredos expostos e licença). Executar o código de terceiros não foi permitido, por segurança, então a análise é estática.

## Comparação

| Projeto | Lojas | WhatsApp | Telegram | Linhas de código | Testes | Último commit | Licença | Observações |
|---|---|---|---|---|---|---|---|---|
| **Mateus0790/botafiliado** | Shopee, ML, AliExpress (+Amazon parcial) | Baileys 7 (opcional) ou "kit" no privado | Sim + Discord | ~5,8 mil (JS) | 13 arquivos | 22/10/2026 | **Nenhuma** | Melhor código: APIs oficiais, painel web, Docker pronto, login do ML via noVNC |
| odcolares/RendaExtraCupuns | Amazon, ML, Shopee, AliExpress | whatsapp-web.js (só lê) | Sim | ~16 mil (TS) | 35 | 30/10/2026 | Nenhuma | Mais ambicioso (virou SaaS com Stripe), muito complexo; IDs de afiliado do autor no código |
| fabioluizrohde/bot | Amazon, ML, Shopee | Baileys 7 + Playwright | Sim | ~12,8 mil | 21 | 05/11/2026 | Nenhuma | Copia ofertas de grupos de terceiros; derivado do elizandrocharellojr-debug |
| elizandrocharellojr-debug/bot-afiliados-whatsapp | Amazon, ML, Shopee | Baileys 7 | Sim | ~6,2 mil | 3 | 15/09/2026 | Nenhuma | Versão original do fabioluizrohde; parado |
| GabrielSOGarcia/bot-ofertas | Shopee (ML em andamento) | Baileys 6 | Sim | ~8,2 mil (Py+JS) | 2 | 10/11/2026 | Nenhuma | Ótima curadoria automática da Shopee, multi-nicho, painel no Telegram |
| gustavohenrique-d/bot-ofertas-afiliados | Shopee, ML (CSV manual) | Sim | Sim | ~2,3 mil (Py) | 6 | 18/10/2026 | Nenhuma | Simples e limpo; só 3 commits |
| VianaMiguel/Teleshopeezap | ML, Shopee, Amazon | whatsapp-web.js | Sim | ~6,7 mil | 1 | 07/11/2026 | Nenhuma | Feito para Windows (.bat), arquivos "fix_painel_v2" |
| rlucio01/bot-ofertas-telegram | ML, Shopee, Amazon | Não | Sim | ~2,7 mil (Py) | 0 | 22/09/2026 | Nenhuma | Só Telegram |
| SaulloGabryel/BlueBot | ML, Shopee, AliExpress | whatsapp-web.js | Sim | ~0,8 mil | 2 | 08/10/2025 | Nenhuma | **Descartado**: tem um perfil inteiro do Chrome com cookies salvo no repositório |

## Conclusões

1. **Nenhum projeto cobre as 4 lojas.** Shein e TikTok Shop não aparecem em nenhum dos bots. O motivo é técnico: as duas não têm API aberta de afiliados no Brasil; o link de afiliado sai do app de cada uma.
2. **O melhor código é o Mateus0790/botafiliado**: usa só APIs oficiais, tem painel, testes, Docker e trata o risco do WhatsApp com cuidado (modo "kit" sem risco e modo QR opcional).
3. **Nenhum dos 9 tem licença.** Sem licença, o código é "todos os direitos reservados": dá para ler e estudar, mas copiar para um projeto seu não é permitido sem autorização do autor.
4. **Mercado Livre não tem API de afiliados.** Os projetos usam três caminhos: link `meli.la` gerado no Linkbuilder (mais seguro), parâmetros `matt_word`/`matt_tool`, ou automação de navegador logado (frágil).
5. **WhatsApp em grupos só funciona com biblioteca não oficial** (Baileys ou whatsapp-web.js). A API oficial do WhatsApp Business não posta em grupos. Existe risco de banimento do número.

## Decisão

Em vez de copiar código sem licença, este repositório é um **projeto próprio (licença MIT)**, escrito do zero, que junta as melhores ideias:

- do **Mateus0790**: só APIs oficiais, link colado no privado do Telegram com prévia e botões, limpeza de rastreio de outros afiliados antes de converter;
- do **GabrielSOGarcia**: busca automática na Shopee por palavras-chave com filtro de desconto e nota, Baileys num serviço único;
- do **gustavohenrique-d**: simplicidade, formatação separada para Telegram (HTML) e WhatsApp (*negrito*), retry no limite do Telegram;
- e acrescenta o que faltava em todos: **Shein e TikTok Shop**, fila com horário de postagem, limite diário e pausa entre grupos para reduzir risco de banimento.

## Como cada loja é tratada aqui

| Loja | Como o link de afiliado é gerado | Preço/foto |
|---|---|---|
| Shopee | API oficial de afiliados (`generateShortLink`) | API oficial (`productOfferV2`) |
| Mercado Livre | `meli.la` colado (recomendado) ou `matt_word`/`matt_tool` | Prévia pública da página (ou manual) |
| Shein | Link de afiliado colado do app/portal (+ parâmetros opcionais) | Prévia pública (ou manual) |
| TikTok Shop | Link de afiliado colado do app | Manual (a página bloqueia leitura) |

## Próximos passos possíveis

- Painel web (hoje o painel é o privado do Telegram).
- Busca automática no Mercado Livre por categorias de ofertas.
- Integração com a API de afiliados do TikTok Shop, se ela for liberada para o Brasil.
- Relatório de cliques/vendas por `subId` da Shopee.
