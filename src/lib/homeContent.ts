/**
 * Conteúdo editável da home — armazenado em StoreSettings.homeContentJson.
 * Cobre selos do hero, cards da seção de confiança e passos do "como funciona".
 */

export const HOME_ICON_OPTIONS = [
  { value: 'truck', label: 'Caminhão / Entrega' },
  { value: 'shield', label: 'Escudo / Segurança' },
  { value: 'headset', label: 'Headset / Atendimento' },
  { value: 'credit-card', label: 'Cartão / Pagamento' },
  { value: 'check', label: 'Check / Concluído' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'star', label: 'Estrela / Destaque' },
] as const;

export type HomeIconName = (typeof HOME_ICON_OPTIONS)[number]['value'];

export type HeroBadge = { icon: HomeIconName; label: string };
export type TrustCard = { icon: HomeIconName; title: string; text: string };
export type HowItWorksStep = { title: string; text: string };

export type HomeContent = {
  heroBadges: HeroBadge[];
  trustCards: TrustCard[];
  howItWorks: HowItWorksStep[];
};

export const DEFAULT_HERO_BADGES: HeroBadge[] = [
  { icon: 'truck', label: 'Entrega para todo o Brasil' },
  { icon: 'headset', label: 'Atendimento especializado' },
  { icon: 'credit-card', label: 'Pagamento facilitado' },
  { icon: 'shield', label: 'Compra segura pelo WhatsApp' },
];

export const DEFAULT_TRUST_CARDS: TrustCard[] = [
  { icon: 'truck', title: 'Entrega para todo o Brasil', text: 'Envio rápido e rastreado com transportadoras parceiras.' },
  { icon: 'headset', title: 'Atendimento humanizado', text: 'Fale com um especialista antes e depois da compra.' },
  { icon: 'shield', title: 'Suporte e garantia', text: 'Produtos com garantia, nota fiscal e suporte direto pelo WhatsApp.' },
  { icon: 'credit-card', title: 'Pagamento facilitado', text: 'Em até 12x sem juros e diversas formas de pagamento.' },
  { icon: 'check', title: 'Procedência confirmada', text: 'Produtos selecionados, em pronta entrega e prontos para uso.' },
  { icon: 'whatsapp', title: 'Compra segura via WhatsApp', text: 'Confirmação de pagamento e envio com a nossa equipe.' },
];

export const DEFAULT_HOW_IT_WORKS: HowItWorksStep[] = [
  { title: 'Escolha seus produtos', text: 'Navegue pelo catálogo e selecione o que precisa.' },
  { title: 'Adicione ao carrinho', text: 'Revise os itens, quantidade e valores.' },
  { title: 'Informe seus dados', text: 'Preencha entrega ou retirada, com poucos campos.' },
  { title: 'Finalize pelo WhatsApp', text: 'Enviaremos todo o pedido pronto para um especialista.' },
  { title: 'Confirmação humana', text: 'Confirmamos pagamento, frete, prazo e disponibilidade.' },
];

export const parseHomeContent = (json: string | undefined | null): HomeContent => {
  if (!json) {
    return {
      heroBadges: DEFAULT_HERO_BADGES,
      trustCards: DEFAULT_TRUST_CARDS,
      howItWorks: DEFAULT_HOW_IT_WORKS,
    };
  }
  try {
    const parsed = JSON.parse(json) as Partial<HomeContent>;
    return {
      heroBadges:
        Array.isArray(parsed.heroBadges) && parsed.heroBadges.length > 0
          ? parsed.heroBadges
          : DEFAULT_HERO_BADGES,
      trustCards:
        Array.isArray(parsed.trustCards) && parsed.trustCards.length > 0
          ? parsed.trustCards
          : DEFAULT_TRUST_CARDS,
      howItWorks:
        Array.isArray(parsed.howItWorks) && parsed.howItWorks.length > 0
          ? parsed.howItWorks
          : DEFAULT_HOW_IT_WORKS,
    };
  } catch {
    return {
      heroBadges: DEFAULT_HERO_BADGES,
      trustCards: DEFAULT_TRUST_CARDS,
      howItWorks: DEFAULT_HOW_IT_WORKS,
    };
  }
};

export const stringifyHomeContent = (content: HomeContent): string =>
  JSON.stringify(content);
