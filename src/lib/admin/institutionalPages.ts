/**
 * Metadados das páginas institucionais editáveis pelo admin.
 * Centraliza o que estava duplicado entre listagem e editor:
 *  - slugs válidos
 *  - rótulo, rota pública e descrição curta
 *  - conteúdo padrão do fallback
 *
 * Não substitui o fallback usado nas páginas públicas — cada uma continua
 * com sua cópia inline, pra a home ficar 100% renderizável sem depender
 * deste módulo. Aqui é só o que o admin precisa.
 */

export type InstitutionalPageMeta = {
  slug: string;
  name: string;
  route: string;
  description: string;
  /** SVG path para o ícone discreto do card. `viewBox="0 0 24 24"`. */
  iconPath: string;
  default: {
    title: string;
    content: string;
  };
};

export const INSTITUTIONAL_PAGES: readonly InstitutionalPageMeta[] = [
  {
    slug: 'sobre',
    name: 'Quem somos',
    route: '/sobre',
    description: 'História, propósito e proposta de valor da loja.',
    // ícone: pessoas
    iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    default: {
      title: 'Sua viagem começa antes do embarque',
      content:
        'A TravelTech reúne malas, mochilas, acessórios inteligentes e eletrônicos úteis para deixar cada deslocamento mais leve, prático e seguro.\n\nUnimos curadoria de produtos com um atendimento humano e direto pelo WhatsApp.\n\n## Nossa missão\n\nTornar a sua viagem mais simples e tranquila — com produtos selecionados, envio rápido para todo o Brasil e suporte humano antes, durante e depois da compra.',
    },
  },
  {
    slug: 'politicas',
    name: 'Políticas',
    route: '/politicas',
    description: 'Entrega, troca, garantia, privacidade e pagamento.',
    // ícone: escudo
    iconPath: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z',
    default: {
      title: 'Políticas de entrega, troca e garantia',
      content:
        'Transparência em cada etapa do seu pedido. Confira nossos compromissos com você.\n\n## Entrega\n\nRealizamos entregas para todo o Brasil, com transportadoras parceiras e Correios. Prazos e fretes são confirmados pela equipe via WhatsApp após a finalização do pedido. Em geral, os pedidos saem para envio em até 2 dias úteis após a confirmação de pagamento.\n\n## Troca e devolução\n\nVocê pode solicitar a troca ou devolução em até 7 dias corridos após o recebimento, conforme o Código de Defesa do Consumidor.\n\n## Garantia\n\nTodos os produtos contam com garantia direta do fabricante. O prazo padrão é de 12 meses, salvo indicação diferente na página do produto.\n\n## Privacidade\n\nOs dados que você informa em nosso site são utilizados exclusivamente para processar e confirmar o seu pedido com a nossa equipe pelo WhatsApp.\n\n## Pagamento\n\nComo o pedido é finalizado pelo WhatsApp, nenhum valor é cobrado diretamente neste site. A forma de pagamento é confirmada com a nossa equipe.',
    },
  },
  {
    slug: 'termos',
    name: 'Termos de uso',
    route: '/termos',
    description: 'Regras jurídicas de uso do site e do checkout via WhatsApp.',
    // ícone: documento
    iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    default: {
      title: 'Termos de uso',
      content:
        'Estes termos regulam o uso do nosso site e o processo de compra que ocorre via WhatsApp.\n\n## Aceitação\n\nAo navegar e enviar um pedido pelo site, você concorda com estes termos.\n\n## Pedidos\n\nO envio de um pedido por este site é uma manifestação de interesse de compra. A confirmação efetiva acontece após nosso time validar disponibilidade, prazo e pagamento pelo WhatsApp.\n\n## Preços e produtos\n\nNos esforçamos para manter informações de preço, estoque e descrição sempre atualizadas, mas podem ocorrer alterações sem aviso prévio. Em caso de divergência, prevalecem as informações confirmadas pela equipe no atendimento.\n\n## Pagamento\n\nNenhum valor é cobrado diretamente neste site. O pagamento é combinado pelo WhatsApp e somente os canais oficiais informados por nossa equipe devem ser utilizados.\n\n## Limitação de responsabilidade\n\nNão nos responsabilizamos por danos decorrentes de uso inadequado dos produtos ou por informações incorretas fornecidas pelo cliente.\n\n## Foro\n\nFica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer questões relativas a estes termos.',
    },
  },
  {
    slug: 'faq',
    name: 'Perguntas frequentes',
    route: '/faq',
    description: 'Respostas objetivas para as dúvidas mais comuns.',
    // ícone: interrogação em círculo
    iconPath: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01',
    default: {
      title: 'Perguntas frequentes',
      content:
        'Reunimos as dúvidas mais comuns sobre como funciona a compra na TravelTech.\n\n## Como funciona a finalização pelo WhatsApp?\n\nVocê monta seu pedido no site (escolhe produtos, preenche dados e forma de pagamento) e ao clicar em "Finalizar pelo WhatsApp", abrimos uma conversa com nossa equipe trazendo todos os dados já organizados. A confirmação final é feita por uma pessoa real.\n\n## O pagamento é feito pelo site?\n\nNão. Nenhum valor é cobrado neste site. Após a confirmação do pedido pelo WhatsApp, enviamos os dados oficiais (PIX, link de cartão, boleto etc.) e o pagamento acontece fora do site.\n\n## Como funciona o frete?\n\nO frete é calculado e confirmado pelo nosso time durante o atendimento pelo WhatsApp, considerando o CEP de destino e a forma de envio mais adequada para o seu pedido.\n\n## Vocês entregam para todo o Brasil?\n\nSim. Trabalhamos com transportadoras parceiras e com os Correios para entregar em todo o território nacional.\n\n## Como acompanho meu pedido?\n\nAssim que o pedido é despachado, enviamos o código de rastreio pelo WhatsApp. Você acompanha diretamente no site da transportadora.\n\n## Posso retirar o produto?\n\nSim, oferecemos retirada agendada na nossa loja física. Selecione a opção "Retirada" no checkout para combinarmos data e horário.\n\n## Como funciona troca e garantia?\n\nVocê pode solicitar troca em até 7 dias corridos após o recebimento. Para defeitos cobertos pela garantia do fabricante (12 meses para a maioria dos produtos), basta nos chamar no WhatsApp que orientamos o processo.',
    },
  },
  {
    slug: 'garantia',
    name: 'Garantia',
    route: '/garantia',
    description: 'Prazos, coberturas e como acionar a garantia.',
    // ícone: verificado
    iconPath: 'M9 12l2 2 4-4 M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z',
    default: {
      title: 'Garantia',
      content:
        'Compromisso de procedência e suporte em todos os nossos produtos.\n\n## Prazo padrão\n\nA maioria dos produtos conta com 12 meses de garantia direta do fabricante. Acessórios e consumíveis podem ter prazo menor — consulte sempre a página do produto.\n\n## O que está coberto\n\n- Defeitos de fabricação\n- Falhas em componentes eletrônicos cobertos pelo fabricante\n- Problemas de funcionamento dentro do uso normal indicado\n\n## O que não está coberto\n\n- Mau uso, quedas, contato com líquidos fora das especificações\n- Desgaste natural por uso\n- Modificações não autorizadas no produto\n- Itens consumíveis (pilhas, baterias, fitas etc.) após o prazo específico\n\n## Como acionar\n\n1. Entre em contato com a gente pelo WhatsApp informando o número do pedido ou nota fiscal.\n2. Descreva o problema, com fotos ou vídeos se possível.\n3. Orientamos sobre envio para análise técnica.\n4. Após análise, fazemos o reparo, substituição ou reembolso, conforme o caso.\n\n## Importante\n\nGuarde a nota fiscal — ela é o seu comprovante de garantia.',
    },
  },
];

export const isValidInstitutionalSlug = (slug: string): boolean =>
  INSTITUTIONAL_PAGES.some((p) => p.slug === slug);

export const getInstitutionalPageMeta = (
  slug: string,
): InstitutionalPageMeta | null =>
  INSTITUTIONAL_PAGES.find((p) => p.slug === slug) ?? null;

// ─────────────────────────── status ───────────────────────────

export type PageStatus = 'personalized' | 'default' | 'pending';
export type PageSeoStatus = 'ok' | 'pending';

/**
 * "personalized" = registro no banco com conteúdo salvo.
 * "pending" = registro existe mas sem conteúdo (edge case — schema exige
 *   title mas content default é '').
 * "default" = nenhum registro no banco; loja mostra o fallback do código.
 */
export const getPageStatus = (
  record: { title: string; content: string } | null | undefined,
): PageStatus => {
  if (!record) return 'default';
  if (!record.content?.trim()) return 'pending';
  return 'personalized';
};

export const getPageSeoStatus = (
  record: { metaTitle: string | null; metaDescription: string | null } | null | undefined,
): PageSeoStatus => {
  if (!record) return 'pending';
  const hasTitle = !!record.metaTitle?.trim();
  const hasDesc = !!record.metaDescription?.trim();
  return hasTitle && hasDesc ? 'ok' : 'pending';
};

export const PAGE_STATUS_STYLE: Record<
  PageStatus,
  { label: string; badge: string; dot: string }
> = {
  personalized: {
    label: 'Personalizada',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  default: {
    label: 'Usando padrão',
    badge: 'bg-ink-100 text-ink-700',
    dot: 'bg-ink-400',
  },
  pending: {
    label: 'Pendente',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
};

export const PAGE_SEO_STYLE: Record<
  PageSeoStatus,
  { label: string; badge: string; dot: string }
> = {
  ok: {
    label: 'SEO ok',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'SEO pendente',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
};
