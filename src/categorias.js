/**
 * Categorias de produto para filtrar o que cada automação posta.
 * A oferta é classificada pelo título (sem acento, minúsculo).
 * palavras: termos que identificam a categoria no título.
 * busca: termos usados na busca automática da Shopee quando a automação não tem palavras próprias.
 */
export const CATEGORIAS = {
  iphone: { nome: 'iPhone', palavras: ['iphone'], busca: ['iphone'] },
  celulares: {
    nome: 'Celulares',
    palavras: ['celular', 'smartphone', 'iphone', 'galaxy', 'xiaomi', 'redmi', 'poco ', 'motorola', 'moto g', 'moto e', 'realme', 'capinha', 'capa celular', 'pelicula', 'carregador'],
    busca: ['celular', 'smartphone', 'capinha celular'],
  },
  eletronicos: {
    nome: 'Eletrônicos',
    palavras: ['fone', 'headset', 'airpods', 'earbuds', 'caixa de som', 'smartwatch', 'relogio inteligente', 'smart tv', 'televisao', 'tv ', 'tablet', 'ipad', 'camera', 'alexa', 'echo dot', 'chromecast', 'fire tv', 'power bank', 'bluetooth'],
    busca: ['fone bluetooth', 'smartwatch', 'caixa de som bluetooth'],
  },
  informatica: {
    nome: 'Informática',
    palavras: ['notebook', 'laptop', 'macbook', 'computador', 'monitor', 'teclado', 'mouse', 'ssd', 'hd externo', 'pendrive', 'memoria ram', 'roteador', 'webcam', 'impressora'],
    busca: ['notebook', 'mouse gamer', 'teclado mecanico', 'ssd'],
  },
  games: {
    nome: 'Games',
    palavras: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'controle gamer', 'controle ps', 'controle xbox', 'joystick', 'gamer', 'console'],
    busca: ['controle gamer', 'headset gamer', 'console'],
  },
  modaFeminina: {
    nome: 'Moda feminina',
    palavras: ['feminin', 'vestido', 'saia', 'blusa', 'cropped', 'body ', 'legging', 'sutia', 'calcinha', 'biquini', 'lingerie', 'bolsa', 'bolsas'],
    busca: ['vestido feminino', 'blusa feminina', 'bolsa feminina'],
  },
  modaMasculina: {
    nome: 'Moda masculina',
    palavras: ['masculin', 'camisa polo', 'bermuda', 'cueca', 'camiseta masculina', 'calca masculina'],
    busca: ['camiseta masculina', 'bermuda masculina', 'camisa polo'],
  },
  calcados: {
    nome: 'Calçados',
    palavras: ['tenis', 'sapato', 'sandalia', 'chinelo', 'bota ', 'botas', 'sapatilha', 'rasteirinha', 'crocs', 'havaianas'],
    busca: ['tenis', 'sandalia', 'chinelo'],
  },
  infantil: {
    nome: 'Infantil e bebê',
    palavras: ['infantil', 'bebe', 'crianca', 'kids', 'menino', 'menina', 'fralda', 'mamadeira', 'chupeta', 'carrinho de bebe', 'body bebe', 'enxoval'],
    busca: ['roupa infantil', 'bebe', 'fralda'],
  },
  brinquedos: {
    nome: 'Brinquedos',
    palavras: ['brinquedo', 'boneca', 'lego', 'pelucia', 'quebra-cabeca', 'carrinho de controle', 'hot wheels', 'jogo de tabuleiro'],
    busca: ['brinquedo', 'boneca', 'lego'],
  },
  beleza: {
    nome: 'Beleza',
    palavras: ['perfume', 'maquiagem', 'batom', 'base liquida', 'rimel', 'mascara de cilios', 'skincare', 'hidratante', 'shampoo', 'condicionador', 'secador', 'chapinha', 'prancha', 'escova secadora', 'esmalte', 'serum', 'protetor solar'],
    busca: ['perfume', 'maquiagem', 'skincare'],
  },
  casa: {
    nome: 'Casa e decoração',
    palavras: ['jogo de cama', 'lencol', 'edredom', 'travesseiro', 'toalha', 'tapete', 'cortina', 'luminaria', 'organizador', 'decoracao', 'quadro', 'aspirador', 'robo aspirador', 'ventilador', 'umidificador'],
    busca: ['organizador', 'jogo de cama', 'aspirador'],
  },
  cozinha: {
    nome: 'Cozinha',
    palavras: ['air fryer', 'airfryer', 'fritadeira', 'panela', 'liquidificador', 'cafeteira', 'micro-ondas', 'microondas', 'batedeira', 'mixer', 'faca', ' pote ', ' potes ', 'garrafa termica', 'sanduicheira', 'cozinha'],
    busca: ['air fryer', 'panela', 'utensilios cozinha'],
  },
  fitness: {
    nome: 'Esporte e fitness',
    palavras: ['academia', 'fitness', 'whey', 'creatina', 'halter', 'anilha', 'bicicleta', 'esteira', 'yoga', 'corrida', 'suplemento', 'garrafa academia', 'bola de futebol'],
    busca: ['creatina', 'whey protein', 'acessorios academia'],
  },
  pet: {
    nome: 'Pet',
    palavras: [' pet ', ' pets ', 'cachorro', 'gato', 'racao', 'coleira', 'arranhador', 'caminha pet', 'areia sanitaria'],
    busca: ['pet', 'racao', 'brinquedo cachorro'],
  },
  ferramentas: {
    nome: 'Ferramentas',
    palavras: ['furadeira', 'parafusadeira', 'ferramenta', 'chave de fenda', 'serra', 'martelo', 'kit ferramentas', 'trena', 'lixadeira'],
    busca: ['parafusadeira', 'kit ferramentas'],
  },
  automotivo: {
    nome: 'Automotivo',
    palavras: ['carro', 'automotivo', 'motocicleta', 'pneu', 'capacete', 'suporte veicular', 'aspirador automotivo', 'som automotivo'],
    busca: ['acessorios carro', 'suporte celular carro'],
  },
};

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Categorias (ids) em que o título se encaixa. */
export function categoriasDe(titulo) {
  const t = ` ${semAcento(titulo)} `;
  return Object.entries(CATEGORIAS)
    .filter(([, c]) => c.palavras.some((p) => t.includes(p)))
    .map(([id]) => id);
}

/** Termos de busca da Shopee para as categorias escolhidas. */
export function buscaDasCategorias(ids) {
  return [...new Set(ids.flatMap((id) => CATEGORIAS[id]?.busca || []))];
}
