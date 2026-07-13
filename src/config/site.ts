export const siteConfig = {
  name: 'TravelTech',
  shortName: 'TravelTech',
  tagline: 'Tudo para viajar com mais praticidade, tecnologia e segurança',
  description:
    'Loja especializada em malas, mochilas e acessórios de viagem com tecnologia útil. Atendimento humano, entrega para todo o Brasil e finalização segura pelo WhatsApp.',
  url: 'https://traveltech.com.br',
  // Número em formato internacional, sem +, espaços ou símbolos. Ex.: 5511999999999
  whatsapp: '5511999999999',
  whatsappDisplay: '(11) 99999-9999',
  email: 'contato@traveltech.com.br',
  address: 'Av. Paulista, 1000 — São Paulo/SP',
  businessHours: 'Seg. a Sáb. — 9h às 19h',
  socials: {
    instagram: 'https://instagram.com/traveltech',
    facebook: 'https://facebook.com/traveltech',
    youtube: 'https://youtube.com/@traveltech',
  },
  trustMessages: [
    'Entrega para todo o Brasil',
    'Parcelamento em até 12x sem juros',
    'Produtos úteis para sua próxima viagem',
    'Atendimento rápido pelo WhatsApp',
    'Compra segura com suporte humano',
    'Envio rápido e rastreado',
    'Viaje com mais praticidade e segurança',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
