export type ProductImage = {
  src: string;
  alt: string;
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type ProductVariantOptionPublic = {
  id: string;
  name: string;
  values: { id: string; value: string; imageUrl: string | null }[];
};

export type ProductVariantPublic = {
  id: string;
  title: string;
  sku: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  active: boolean;
  imageUrl: string | null;
  optionsMap: Record<string, string>;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  oldPrice?: number;
  installments: number;
  stock: number;
  sku: string;
  brand: string;
  categorySlug: string;
  badge?: 'novo' | 'promo' | 'destaque';
  images: ProductImage[];
  benefits: string[];
  specifications: ProductSpec[];
  boxContents: string[];
  warranty: string;
  faq: FAQItem[];
  relatedIds: string[];
  /** Vazio ou ausente = produto simples. Populado pelos loaders reais via adapter. */
  variantOptions?: ProductVariantOptionPublic[];
  variants?: ProductVariantPublic[];
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  highlight?: boolean;
};

export type CartLine = {
  productId: string;
  quantity: number;
  /** Snapshot do produto no momento em que foi adicionado ao carrinho. */
  name: string;
  slug: string;
  sku: string;
  price: number;
  image: string;
  /** Variação escolhida (produtos com variantes). Vazio = produto simples. */
  variantId?: string;
  /** Texto legível da variação — "Preto / P". Mostrado no carrinho e no WhatsApp. */
  variantTitle?: string;
  /** Mapa das opções escolhidas — {"Cor":"Preto","Tamanho":"P"}. Auxilia formatação. */
  variantOptionsMap?: Record<string, string>;
};

export type DeliveryType = 'entrega' | 'retirada';

export type PaymentMethod =
  | 'pix'
  | 'cartao-credito'
  | 'cartao-debito'
  | 'boleto'
  | 'dinheiro'
  | 'a-combinar';

export type CheckoutData = {
  name: string;
  phone: string;
  document?: string;
  email?: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
  deliveryType: DeliveryType;
  deliveryNote?: string;
  payment: PaymentMethod;
  notes?: string;
};
