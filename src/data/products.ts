import type { Product } from '@/types';

const placeholder = (alt: string) => ({ src: '/placeholder.svg', alt });

export const products: Product[] = [
  {
    id: 'p-001',
    slug: 'mala-de-bordo-inteligente-20',
    name: 'Mala de Bordo Inteligente 20"',
    shortDescription:
      'Mala rígida de bordo com porta USB, cadeado TSA integrado e rodas 360°. Aprovada para a cabine.',
    description:
      'Pensada para quem viaja com frequência, a Mala de Bordo Inteligente 20" combina policarbonato resistente, rodas duplas silenciosas e detalhes que facilitam o dia a dia: porta USB lateral para carregar o celular, cadeado TSA embutido e bolso frontal para acesso rápido a documentos. Tamanho aprovado pelas principais companhias aéreas como bagagem de mão.',
    price: 899.9,
    oldPrice: 1199,
    installments: 12,
    stock: 18,
    sku: 'MALA-BORD-20-USB',
    brand: 'TravelTech',
    categorySlug: 'malas-bagagens',
    badge: 'promo',
    images: [
      placeholder('Mala de Bordo Inteligente 20" frente'),
      placeholder('Mala de Bordo Inteligente 20" detalhe USB'),
    ],
    benefits: [
      'Aprovada como bagagem de mão',
      'Porta USB para carregar o celular em trânsito',
      'Cadeado TSA integrado',
      'Rodas duplas 360° silenciosas',
      'Casco rígido em policarbonato',
    ],
    specifications: [
      { label: 'Dimensões', value: '55 x 35 x 23 cm' },
      { label: 'Capacidade', value: '38 litros' },
      { label: 'Peso', value: '2,8 kg' },
      { label: 'Material', value: 'Policarbonato 100%' },
      { label: 'Rodas', value: '4 rodas duplas 360°' },
      { label: 'Cadeado', value: 'TSA com senha de 3 dígitos' },
      { label: 'Porta USB', value: 'Sim (sem bateria inclusa)' },
    ],
    boxContents: [
      '1x Mala de Bordo 20"',
      '1x Cabo USB interno',
      '1x Manual com instruções de cadeado',
    ],
    warranty: '24 meses de garantia contra defeitos de fabricação.',
    faq: [
      {
        question: 'Posso levar como bagagem de mão?',
        answer: 'Sim, as dimensões 55x35x23 cm atendem ao padrão da maioria das companhias aéreas no Brasil e na América Latina. Sempre confira a regra específica da sua companhia antes do embarque.',
      },
      {
        question: 'A bateria do USB está inclusa?',
        answer: 'Não. O cabo USB conecta uma entrada externa a uma saída interna, mas você precisa conectar seu próprio power bank dentro da mala.',
      },
    ],
    relatedIds: ['p-002', 'p-007', 'p-008', 'p-005'],
  },
  {
    id: 'p-002',
    slug: 'mochila-antifurto-usb-25l',
    name: 'Mochila Antifurto USB 25L',
    shortDescription:
      'Mochila urbana com zíperes ocultos, porta USB e compartimento acolchoado para notebook 15,6".',
    description:
      'Conforto e segurança no mesmo produto. A Mochila Antifurto USB 25L tem zíperes ocultos contra batedores de carteira, tecido resistente à água, alças ergonômicas e organização para notebook, tablet e acessórios. Ideal para o dia a dia, viagens curtas e trabalho remoto pelo mundo.',
    price: 349.9,
    oldPrice: 449,
    installments: 12,
    stock: 24,
    sku: 'MOCH-AF-25L',
    brand: 'TravelTech',
    categorySlug: 'mochilas',
    badge: 'destaque',
    images: [
      placeholder('Mochila Antifurto USB 25L vista frontal'),
      placeholder('Mochila Antifurto USB 25L compartimentos'),
    ],
    benefits: [
      'Zíperes ocultos antifurto',
      'Porta USB externa',
      'Compartimento acolchoado para notebook 15,6"',
      'Tecido resistente à água',
      'Encaixe na alça da mala (trolley sleeve)',
    ],
    specifications: [
      { label: 'Capacidade', value: '25 litros' },
      { label: 'Notebook', value: 'Até 15,6"' },
      { label: 'Material', value: 'Poliéster impermeável' },
      { label: 'Porta USB', value: 'Sim (sem bateria inclusa)' },
      { label: 'Peso', value: '0,9 kg' },
    ],
    boxContents: ['1x Mochila Antifurto', '1x Cabo USB interno'],
    warranty: '12 meses de garantia.',
    faq: [
      {
        question: 'Cabe um notebook gamer?',
        answer: 'Sim, o compartimento acolchoado acomoda notebooks de até 15,6". Modelos maiores podem não caber confortavelmente.',
      },
      {
        question: 'É realmente impermeável?',
        answer: 'O tecido é resistente à água — segura chuvisco e respingos. Não recomendamos submergir a mochila.',
      },
    ],
    relatedIds: ['p-001', 'p-003', 'p-007', 'p-005'],
  },
  {
    id: 'p-003',
    slug: 'adaptador-universal-de-tomada-4-usb',
    name: 'Adaptador Universal de Tomada (4 USB + USB-C)',
    shortDescription:
      'Funciona em 150+ países. 1 tomada AC, 3 portas USB-A e 1 porta USB-C com carregamento rápido.',
    description:
      'Um único adaptador para suas viagens pelo mundo. Plugs retráteis para UK, EU, USA/Brasil e AUS, mais 1 entrada AC universal e 4 portas USB (3 USB-A + 1 USB-C de carregamento rápido). Proteção contra sobrecarga e fusível substituível.',
    price: 189.9,
    installments: 10,
    stock: 40,
    sku: 'ADP-UNIV-4USB',
    brand: 'TravelTech',
    categorySlug: 'eletronicos-viagem',
    badge: 'destaque',
    images: [placeholder('Adaptador Universal de Tomada')],
    benefits: [
      'Compatível com mais de 150 países',
      '4 portas USB (1 USB-C 18W + 3 USB-A)',
      'Plugs retráteis em design compacto',
      'Proteção contra sobrecarga e fusível substituível',
      'Cabe em qualquer mochila',
    ],
    specifications: [
      { label: 'Compatibilidade', value: 'EU / UK / USA / AUS / BR' },
      { label: 'Portas USB-A', value: '3 (5V/2.4A)' },
      { label: 'Porta USB-C', value: '1 (5V/3A — até 18W)' },
      { label: 'Potência máxima', value: '10A / 2500W' },
      { label: 'Peso', value: '170g' },
    ],
    boxContents: ['1x Adaptador Universal', '1x Bolsa de viagem', '1x Manual'],
    warranty: '12 meses de garantia.',
    faq: [
      {
        question: 'Funciona com secador de cabelo / chapinha?',
        answer: 'O adaptador suporta até 2500W em 220V. Confira a potência do seu aparelho antes de usar. Para aparelhos de alta potência, prefira fontes locais.',
      },
      {
        question: 'O adaptador converte voltagem?',
        answer: 'Não. Ele apenas adapta o tipo de plug. A voltagem precisa ser compatível com o aparelho que você quer ligar.',
      },
    ],
    relatedIds: ['p-007', 'p-001', 'p-002'],
  },
  {
    id: 'p-004',
    slug: 'balanca-digital-bagagem',
    name: 'Balança Digital de Bagagem',
    shortDescription:
      'Pesa malas de até 50kg com display LCD, auto-zero e desligamento automático.',
    description:
      'Evite o susto no check-in. A Balança Digital de Bagagem pesa em segundos qualquer mala com alça de até 50kg de capacidade, tem precisão de 50g, leitura clara no LCD e desligamento automático para economizar bateria. Alça reforçada e compacta para levar na bolsa.',
    price: 79.9,
    oldPrice: 99,
    installments: 6,
    stock: 60,
    sku: 'BAL-50KG-LCD',
    brand: 'TravelTech',
    categorySlug: 'acessorios-viagem',
    badge: 'promo',
    images: [placeholder('Balança Digital de Bagagem')],
    benefits: [
      'Capacidade de até 50 kg',
      'Precisão de 50g',
      'Display LCD com luz',
      'Conversão kg / lb',
      'Auto-desligamento',
    ],
    specifications: [
      { label: 'Capacidade', value: '50 kg' },
      { label: 'Precisão', value: '50g' },
      { label: 'Unidades', value: 'kg / lb' },
      { label: 'Alimentação', value: '1x Pilha CR2032 (inclusa)' },
    ],
    boxContents: ['1x Balança Digital', '1x Pilha CR2032', '1x Manual'],
    warranty: '6 meses de garantia.',
    faq: [
      {
        question: 'A pilha já vem inclusa?',
        answer: 'Sim, a pilha CR2032 já vem instalada e pronta para uso.',
      },
    ],
    relatedIds: ['p-001', 'p-005', 'p-008'],
  },
  {
    id: 'p-005',
    slug: 'kit-organizadores-mala-6-pecas',
    name: 'Kit Organizadores de Mala (6 peças)',
    shortDescription:
      'Conjunto com 6 packing cubes em tamanhos variados. Mais espaço, menos bagunça.',
    description:
      'Transforme qualquer mala em um sistema organizado. O kit traz 6 cubes em tamanhos PP/P/M/G/GG mais uma necessaire impermeável, todos com zíper YKK, alça e visor em tela para ver o que está dentro. Compatível com qualquer mala ou mochila.',
    price: 199.9,
    installments: 10,
    stock: 35,
    sku: 'ORG-MALA-6P',
    brand: 'TravelTech',
    categorySlug: 'organizadores',
    badge: 'novo',
    images: [placeholder('Kit Organizadores de Mala 6 peças')],
    benefits: [
      '6 peças em tamanhos diferentes',
      'Visor em tela para identificar conteúdo',
      'Zíperes resistentes',
      'Necessaire impermeável inclusa',
      'Otimiza até 30% do espaço da mala',
    ],
    specifications: [
      { label: 'Quantidade', value: '6 peças (PP/P/M/G/GG + necessaire)' },
      { label: 'Material', value: 'Nylon 210D' },
      { label: 'Zíperes', value: 'Reforçados com alça' },
    ],
    boxContents: ['5x Packing cubes', '1x Necessaire impermeável'],
    warranty: '3 meses de garantia.',
    faq: [
      {
        question: 'Servem em mochila pequena?',
        answer: 'Sim. As peças PP e P cabem facilmente em mochilas de 20–30L. Os tamanhos maiores são ideais para malas de despacho.',
      },
    ],
    relatedIds: ['p-001', 'p-002', 'p-006'],
  },
  {
    id: 'p-006',
    slug: 'travesseiro-de-pescoco-com-memoria',
    name: 'Travesseiro de Pescoço com Espuma Viscoelástica',
    shortDescription:
      'Sustentação ideal para sono em voos longos. Espuma de memória e capa lavável.',
    description:
      'Pare de chegar destruído no destino. O travesseiro tem espuma viscoelástica que se molda ao pescoço, capa em microfibra removível e lavável, fecho ajustável na parte da frente e bolso para celular. Vem com bolsa de transporte que reduz o volume em 50%.',
    price: 159.9,
    oldPrice: 199,
    installments: 8,
    stock: 28,
    sku: 'PILL-MEM-PRO',
    brand: 'TravelTech',
    categorySlug: 'acessorios-viagem',
    badge: 'destaque',
    images: [placeholder('Travesseiro de Pescoço com Espuma Viscoelástica')],
    benefits: [
      'Espuma viscoelástica (memory foam)',
      'Capa removível e lavável',
      'Bolso frontal para celular',
      'Bolsa de transporte com compressão',
    ],
    specifications: [
      { label: 'Material interno', value: 'Espuma viscoelástica' },
      { label: 'Capa', value: 'Microfibra removível' },
      { label: 'Peso', value: '320g' },
    ],
    boxContents: ['1x Travesseiro', '1x Capa', '1x Bolsa de compressão'],
    warranty: '6 meses de garantia.',
    faq: [
      {
        question: 'A capa pode ir na máquina de lavar?',
        answer: 'Sim. Remova a capa e lave na máquina em ciclo delicado. Não lave o miolo de espuma.',
      },
    ],
    relatedIds: ['p-001', 'p-007', 'p-002'],
  },
  {
    id: 'p-007',
    slug: 'power-bank-viagem-20000mah',
    name: 'Power Bank para Viagem 20.000mAh',
    shortDescription:
      'Carregamento rápido 22.5W, 3 saídas e capacidade certificada para voos.',
    description:
      'Para quem não pode ficar sem bateria na estrada. 20.000mAh de capacidade real, 3 saídas simultâneas (USB-C PD + 2 USB-A QC 3.0) e entrada USB-C com PD 18W para recarga rápida do próprio power bank. Capacidade dentro do limite permitido para bagagem de mão em voos comerciais.',
    price: 249.9,
    oldPrice: 329,
    installments: 12,
    stock: 22,
    sku: 'PB-20K-22W',
    brand: 'TravelTech',
    categorySlug: 'eletronicos-viagem',
    badge: 'promo',
    images: [placeholder('Power Bank para Viagem 20.000mAh')],
    benefits: [
      '20.000mAh de capacidade real',
      'Carregamento rápido 22.5W',
      '3 saídas simultâneas',
      'Aprovado para bagagem de mão (até 100Wh)',
      'Display digital com porcentagem',
    ],
    specifications: [
      { label: 'Capacidade', value: '20.000mAh / 74Wh' },
      { label: 'Saídas', value: '1x USB-C PD + 2x USB-A QC 3.0' },
      { label: 'Entrada', value: 'USB-C PD 18W' },
      { label: 'Peso', value: '380g' },
    ],
    boxContents: ['1x Power Bank 20.000mAh', '1x Cabo USB-C', '1x Bolsa', '1x Manual'],
    warranty: '12 meses de garantia.',
    faq: [
      {
        question: 'Posso levar no avião?',
        answer: 'Sim. Com 74Wh, está dentro do limite de 100Wh permitido para bagagem de mão pela maioria das companhias. Não despache na mala — power banks devem ir sempre com você.',
      },
      {
        question: 'Em quanto tempo recarrega meu celular?',
        answer: 'Smartphones modernos costumam carregar de 0 a 100% em menos de 1h30 usando a saída USB-C PD. Esse modelo carrega um celular até 5 vezes antes de precisar ser recarregado.',
      },
    ],
    relatedIds: ['p-003', 'p-002', 'p-001'],
  },
  {
    id: 'p-008',
    slug: 'cadeado-tsa-com-senha',
    name: 'Cadeado TSA com Senha',
    shortDescription:
      'Aprovado pela TSA para viagens aos EUA. Senha de 3 dígitos e cabo flexível.',
    description:
      'Proteja sua mala sem perder o controle. O cadeado é aprovado pela TSA (Transportation Security Administration), permitindo que aeroportos americanos abram a mala para inspeção sem violar a fechadura. Senha de 3 dígitos personalizável e cabo de aço flexível.',
    price: 49.9,
    installments: 4,
    stock: 80,
    sku: 'CAD-TSA-3D',
    brand: 'TravelTech',
    categorySlug: 'acessorios-viagem',
    images: [placeholder('Cadeado TSA com Senha')],
    benefits: [
      'Aprovado pela TSA',
      'Senha de 3 dígitos personalizável',
      'Cabo de aço flexível',
      'Compatível com qualquer zíper de mala/mochila',
    ],
    specifications: [
      { label: 'Tipo de senha', value: '3 dígitos' },
      { label: 'Aprovação', value: 'TSA' },
      { label: 'Material', value: 'Liga de zinco com cabo de aço' },
    ],
    boxContents: ['1x Cadeado TSA', '1x Manual com instruções de senha'],
    warranty: '6 meses de garantia.',
    faq: [
      {
        question: 'Posso usar em qualquer mala?',
        answer: 'Sim. O cabo flexível encaixa em qualquer zíper duplo de malas, mochilas ou bolsas.',
      },
      {
        question: 'Como faço se esquecer a senha?',
        answer: 'Você pode resetar a senha seguindo o passo a passo do manual, desde que ele esteja na posição aberta. Por segurança, anote a senha em local separado da mala.',
      },
    ],
    relatedIds: ['p-001', 'p-004', 'p-002'],
  },
];

export const featuredProducts = products.filter((p) =>
  ['p-001', 'p-002', 'p-003', 'p-005', 'p-006', 'p-007'].includes(p.id),
);

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);

export const getProductById = (id: string): Product | undefined =>
  products.find((p) => p.id === id);

export const getProductsByCategory = (slug: string): Product[] =>
  products.filter((p) => p.categorySlug === slug);

export const getRelatedProducts = (product: Product): Product[] =>
  product.relatedIds
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p));
