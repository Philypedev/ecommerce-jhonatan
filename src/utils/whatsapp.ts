import { siteConfig } from '@/config/site';
import { getProductById } from '@/data/products';
import type {
  CartLine,
  CheckoutData,
  PaymentMethod,
  Product,
  ProductVariantPublic,
} from '@/types';
import { formatCurrency } from './formatCurrency';

const formatVariantSummary = (
  optionsMap?: Record<string, string> | null,
  fallbackTitle?: string | null,
): string | null => {
  if (optionsMap && Object.keys(optionsMap).length > 0) {
    return Object.entries(optionsMap)
      .map(([k, v]) => `${k} ${v}`)
      .join(' / ');
  }
  return fallbackTitle && fallbackTitle.length > 0 ? fallbackTitle : null;
};

const paymentLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  'cartao-credito': 'Cartão de Crédito',
  'cartao-debito': 'Cartão de Débito',
  boleto: 'Boleto bancário',
  dinheiro: 'Dinheiro',
  'a-combinar': 'A combinar pelo WhatsApp',
};

export const paymentMethodLabel = (method: string): string =>
  paymentLabels[method as PaymentMethod] ?? method;

/**
 * Base pública do site — usada na mensagem do WhatsApp para o cliente clicar
 * e conferir. Prioridade:
 *   1. `NEXT_PUBLIC_SITE_URL` (quando o dev/produção define explicitamente)
 *   2. Em produção sem env: `siteConfig.url` (domínio configurado no código)
 *   3. Em desenvolvimento sem env: `http://localhost:3000` (nunca vazamos o
 *      domínio hardcoded quando o dev está trabalhando localmente)
 *
 * O trailing slash é removido pra evitar `//produto/...` na URL final.
 */
const resolveSiteBaseUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  if (process.env.NODE_ENV === 'production') return siteConfig.url;
  return 'http://localhost:3000';
};

const productUrl = (slug: string): string =>
  `${resolveSiteBaseUrl()}/produto/${slug}`;

/** Mensagem de consulta de disponibilidade (estoque=0). */
export const buildAvailabilityCheckMessage = (product: Product): string => {
  const lines = [
    `Olá! Tenho interesse no produto abaixo, mas vi que está marcado como *sob consulta de disponibilidade*:`,
    ``,
    `*${product.name}*`,
    `SKU: ${product.sku}`,
    `Link: ${productUrl(product.slug)}`,
    ``,
    `Pode me confirmar se está disponível, prazo de entrega e formas de pagamento?`,
  ];
  return lines.join('\n');
};

/**
 * Mensagem enviada quando o cliente clica "Comprar pelo WhatsApp" na PDP.
 * Layout formatado com separadores em bloco + negrito nativo do WhatsApp,
 * legível em iOS/Android/Web sem emojis. Ver README de mensagens do projeto.
 *
 * Regras dos campos opcionais:
 *  - "Variação" só aparece se há variante selecionada
 *  - "SKU" só aparece se o produto/variante tem SKU
 */
export const buildQuickWhatsAppMessage = (
  product: Product,
  quantity = 1,
  variant?: ProductVariantPublic | null,
): string => {
  const unitPrice = variant ? variant.price : product.price;
  const sku = (variant ? variant.sku : product.sku)?.trim() ?? '';
  const variantSummary = variant
    ? formatVariantSummary(variant.optionsMap, variant.title)
    : null;

  const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';

  const lines: (string | null)[] = [
    DIVIDER,
    `*SOLICITAÇÃO PELO SITE*`,
    DIVIDER,
    ``,
    `Olá! Vi este produto no site e quero finalizar pelo WhatsApp.`,
    ``,
    `*Produto:* ${product.name}`,
    variantSummary ? `*Variação:* ${variantSummary}` : null,
    sku ? `*SKU:* ${sku}` : null,
    `*Quantidade:* ${quantity}`,
    ``,
    `*Valor unitário:* ${formatCurrency(unitPrice)}`,
    `*Subtotal:* ${formatCurrency(unitPrice * quantity)}`,
    ``,
    `*Link do produto:*`,
    productUrl(product.slug),
    ``,
    `Pode confirmar a disponibilidade, o frete e as formas de pagamento?`,
  ];

  return lines.filter((l): l is string => l !== null).join('\n');
};

/** Estrutura de item agnóstica (independe de mocks). */
export type WhatsAppLine = {
  name: string;
  slug: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  variantTitle?: string | null;
  variantOptionsMap?: Record<string, string> | null;
};

/** Versão central — recebe itens prontos. Compatível com DB e com mocks. */
export const buildCheckoutMessageFromLines = (
  data: CheckoutData,
  lines: WhatsAppLine[],
): string => {
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const isDelivery = data.deliveryType === 'entrega';

  const productLines = lines
    .map((line, idx) => {
      const variantSummary = formatVariantSummary(
        line.variantOptionsMap ?? null,
        line.variantTitle ?? null,
      );
      return [
        `${idx + 1}. ${line.quantity}x ${line.name}`,
        variantSummary ? `   Variação: ${variantSummary}` : null,
        `   SKU: ${line.sku}`,
        `   Valor unitário: ${formatCurrency(line.unitPrice)}`,
        `   Subtotal: ${formatCurrency(line.unitPrice * line.quantity)}`,
        `   Link: ${productUrl(line.slug)}`,
      ]
        .filter((l): l is string => l !== null)
        .join('\n');
    })
    .join('\n\n');

  const sections: string[] = [];

  // Cabeçalho enfatizado com separadores em bloco (não usa emoji — mantém a
  // mensagem legível no WhatsApp Web, iOS, Android e em prints).
  const DIVIDER = '━━━━━━━━━━━━━━━━━━━━';

  sections.push([DIVIDER, `*NOVO PEDIDO PELO SITE*`, DIVIDER].join('\n'));

  sections.push(
    [
      `*DADOS DO CLIENTE*`,
      `Nome: ${data.name}`,
      `Telefone: ${data.phone}`,
      data.document ? `CPF/CNPJ: ${data.document}` : null,
      data.email ? `E-mail: ${data.email}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  if (isDelivery) {
    sections.push(
      [
        `*ENDEREÇO DE ENTREGA*`,
        `CEP: ${data.cep}`,
        `Rua: ${data.street}, Nº ${data.number}`,
        data.complement ? `Complemento: ${data.complement}` : null,
        `Bairro: ${data.district}`,
        `Cidade/UF: ${data.city}/${data.state}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  sections.push(
    [
      `*ENTREGA*`,
      `Tipo: ${isDelivery ? 'Entrega no endereço' : 'Retirada na loja'}`,
      data.deliveryNote ? `Observação: ${data.deliveryNote}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  sections.push([`*PRODUTOS DO PEDIDO*`, ``, productLines].join('\n'));

  sections.push(
    [
      `*RESUMO DO PEDIDO*`,
      `Subtotal: ${formatCurrency(subtotal)}`,
      `Frete: A confirmar`,
      `Total estimado: ${formatCurrency(subtotal)}`,
    ].join('\n'),
  );

  sections.push([`*FORMA DE PAGAMENTO*`, paymentMethodLabel(data.payment)].join('\n'));

  if (data.notes && data.notes.trim().length > 0) {
    sections.push([`*OBSERVAÇÕES*`, data.notes.trim()].join('\n'));
  }

  sections.push(
    [
      DIVIDER,
      `Pedido enviado pelo site.`,
      `Confirmação humana necessária antes do pagamento.`,
      DIVIDER,
    ].join('\n'),
  );

  return sections.join('\n\n');
};

/** Compatibilidade: versão antiga que usa mocks. Útil em testes/legado. */
export const buildCheckoutWhatsAppMessage = (
  data: CheckoutData,
  cart: CartLine[],
): string => {
  const lines: WhatsAppLine[] = cart
    .map((line): WhatsAppLine | null => {
      const product = getProductById(line.productId);
      if (!product) return null;
      return {
        name: product.name,
        slug: product.slug,
        sku: line.sku,
        unitPrice: line.price,
        quantity: line.quantity,
        variantTitle: line.variantTitle ?? null,
        variantOptionsMap: line.variantOptionsMap ?? null,
      };
    })
    .filter((x): x is WhatsAppLine => x !== null);
  return buildCheckoutMessageFromLines(data, lines);
};

/** Gera link wa.me já com mensagem codificada. */
export const buildWhatsAppLink = (
  message: string,
  whatsapp: string = siteConfig.whatsapp,
): string => `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
