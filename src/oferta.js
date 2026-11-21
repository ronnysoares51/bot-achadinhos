import { config } from './config.js';
import { detectarLoja, extrairLinks } from './lojas/index.js';
import { gerarLinkShopee, produtoShopee, shopeeConfigurada } from './lojas/shopee.js';
import { linkMercadoLivre, linkShein, linkTikTokShop, limparUrl } from './lojas/outras.js';
import { buscarPrevia, urlFinal } from './lojas/previa.js';
import { mlConectado, gerarMeliLaUm } from './lojas/mlLinkbuilder.js';

/** "R$ 1.299,90" -> 1299.9 */
export function lerPreco(txt) {
  if (txt === undefined || txt === null || txt === '') return null;
  let s = String(txt).replace(/[^\d.,]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Lê a mensagem do admin: o primeiro link é o produto e as linhas opcionais completam os dados.
 *   titulo: Fone Bluetooth X
 *   de: 199,90
 *   por: 89,90
 *   cupom: ACHADO10
 *   obs: Frete grátis
 */
export function lerMensagemAdmin(texto) {
  const [link] = extrairLinks(texto);
  const campos = {};
  for (const linha of String(texto).split('\n')) {
    const m = linha.match(/^\s*(titulo|título|de|por|cupom|obs|foto)\s*:\s*(.+)$/i);
    if (m) campos[m[1].toLowerCase().replace('título', 'titulo')] = m[2].trim();
  }
  return {
    link: link || null,
    titulo: campos.titulo || null,
    precoDe: lerPreco(campos.de),
    precoPor: lerPreco(campos.por),
    cupom: campos.cupom || null,
    obs: campos.obs || null,
    imagem: campos.foto || null,
  };
}

// Frases de chamada dos outros grupos ("ACHADINHO IMPERDÍVEL!", "OLHA O PRECINHO") não são o nome do produto.
const CHAMADA = /\b(achadinho|achado|imperd[ií]ve(l|is)|olha|olhem|precinho|oportunidade|aproveit|corre+|baixou|rel[aâ]mpago|bug|promo|oferta|desconto|economi|off\b|agora por|apenas|s[oó] hoje|[uú]ltimas? unidades|n[aã]o perca|garant[ae])/i;
export function ehChamada(linha) {
  const l = String(linha || '').trim();
  const letras = l.replace(/[^a-zà-ú]/gi, '');
  const maiusculas = letras.length >= 6 && letras === letras.toUpperCase();
  const palavras = l.split(/\s+/).filter(Boolean).length;
  return CHAMADA.test(l) && (maiusculas || palavras <= 5 || /[!]$/.test(l));
}

/**
 * Lê uma mensagem de oferta escrita por outra pessoa (grupo monitorado):
 * título = primeira linha com texto de verdade; preços = valores "R$"; cupom = palavra após "cupom".
 */
export function extrairDeMensagem(texto) {
  const t = String(texto || '');
  const precos = [...t.matchAll(/R\$\s*([\d.]+(?:,\d{1,2})?)/gi)].map((m) => lerPreco(m[1])).filter(Boolean);
  let precoDe = null;
  let precoPor = null;
  if (precos.length >= 2) {
    precoDe = Math.max(...precos);
    precoPor = Math.min(...precos);
  } else if (precos.length === 1) precoPor = precos[0];
  if (precoDe === precoPor) precoDe = null;

  const cupom = (t.match(/cupom\s*[:：-]?\s*\*?([A-Z0-9][A-Z0-9_-]{3,20})\*?/i) || [])[1] || null;

  const candidatas = t
    .split('\n')
    .map((l) => l.replace(/[*_~`]/g, '').replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}️‍]/gu, '').replace(/^[>\-•·\s]+/, '').trim())
    .filter((l) => l.length >= 6 && !/https?:\/\//i.test(l) && !/R\$/i.test(l) && !/^(cupom|link|compre|corre|oferta|promo[cç][aã]o)\b/i.test(l) && /[a-zà-ú]{3}/i.test(l) && !ehChamada(l));
  // Linha toda em MAIÚSCULAS costuma ser chamada ("FAROL AMARELADO FICA NO PASSADO"): prefere o nome normal.
  const caixaAlta = (l) => {
    const letras = l.replace(/[^a-zà-ú]/gi, '');
    return letras.length >= 6 && letras === letras.toUpperCase();
  };
  const titulo = candidatas.find((l) => !caixaAlta(l)) || candidatas[0] || null;

  return { titulo: titulo ? titulo.slice(0, 140) : null, precoDe, precoPor, cupom };
}

const ENCURTADOS = /^(s\.shopee\.com\.br|shope\.ee|shp\.ee|vt\.tiktok\.com|vm\.tiktok\.com|mercadolivre\.com|mlb\.am)$/;

/** Converte o link para o link de afiliado da loja certa. */
export async function converterLink(url, opcoes = {}) {
  let alvo = url;
  const host = new URL(url).hostname.replace(/^www\./, '');
  const loja = detectarLoja(url);
  if (!loja) throw new Error('Loja não reconhecida. Aceitas: Mercado Livre, Shopee, Shein e TikTok Shop.');

  // Link curto de outra pessoa (Shopee/ML) pode carregar o rastreio dela: expandimos antes.
  // TikTok Shop é mantido como está, porque o link curto do app já é o seu link de afiliado.
  if (ENCURTADOS.test(host) && loja !== 'tiktokshop') alvo = await urlFinal(url);

  switch (loja) {
    case 'shopee':
      return { loja, link: await gerarLinkShopee(limparUrl(alvo)), urlProduto: alvo };
    case 'mercadolivre': {
      // Link meli.la colado por você é mantido (já é seu); com a conta conectada, qualquer outro
      // link vira um meli.la novo na sua conta (link oficial, comissão garantida).
      if (host === 'meli.la' && !opcoes.deOutraPessoa) return { loja, link: url, urlProduto: alvo };
      if (mlConectado()) {
        const produto = host === 'meli.la' ? await urlFinal(url) : alvo;
        try {
          return { loja, link: await gerarMeliLaUm(limparUrl(produto)), urlProduto: produto };
        } catch (e) {
          if (!config.mercadolivre.mattTool) throw e;
          console.error('[mercadolivre] meli.la falhou, usando parâmetros:', e.message);
        }
      }
      return { loja, link: linkMercadoLivre(host === 'meli.la' ? url : alvo), urlProduto: alvo };
    }
    case 'shein':
      return { loja, link: linkShein(url), urlProduto: alvo };
    case 'tiktokshop':
      return { loja, link: linkTikTokShop(url), urlProduto: url };
    default:
      throw new Error('Loja não suportada.');
  }
}

/** Monta a oferta completa a partir da mensagem do admin. */
export async function montarOferta(texto, { link: linkForcado, extra = {}, deOutraPessoa = false } = {}) {
  const manual = lerMensagemAdmin(texto);
  if (linkForcado) manual.link = linkForcado;
  for (const [k, v] of Object.entries(extra)) if (manual[k] == null && v != null) manual[k] = v;
  if (!manual.link) throw new Error('Mande um link de produto.');
  const { loja, link, urlProduto } = await converterLink(manual.link, { deOutraPessoa });

  let auto = {};
  if (loja === 'shopee' && shopeeConfigurada()) {
    auto = (await produtoShopee(urlProduto).catch(() => null)) || {};
  }
  if (!auto.titulo) auto = { ...(await buscarPrevia(urlProduto)), ...auto };

  const precoPor = manual.precoPor ?? auto.precoPor ?? null;
  const precoDe = manual.precoDe ?? auto.precoDe ?? null;
  const desconto = precoDe && precoPor && precoDe > precoPor ? Math.round((1 - precoPor / precoDe) * 100) : null;

  return {
    loja,
    // Clonada: o nome real do produto (API/página) vale mais que a frase de chamada do outro grupo.
    titulo: (deOutraPessoa ? auto.titulo || manual.titulo : manual.titulo || auto.titulo) || 'Achadinho imperdível',
    precoDe,
    precoPor,
    desconto,
    cupom: manual.cupom,
    obs: manual.obs,
    imagem: manual.imagem || auto.imagem || null,
    nota: auto.nota ?? null,
    vendas: auto.vendas ?? null,
    link,
    // O endereço do produto (sem o link de afiliado): é dele que sai o código do anúncio para buscar a foto grande.
    urlProduto,
    chave: auto.chave || `${loja}:${urlProduto.split('?')[0]}`,
    criadaEm: new Date().toISOString(),
  };
}
