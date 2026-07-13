/**
 * Helpers que dizem se uma configuração foi REALMENTE preenchida pelo
 * lojista — ou se ainda é só o default do seed/schema. O dashboard precisa
 * disso para não mostrar "Concluído" em coisas que não foram configuradas.
 *
 * Regras gerais:
 *  - vazio/null → não configurado
 *  - igual ao default do seed/schema → não configurado
 *  - parecido com valor de exemplo do manual (00000..., XXXXX, 12345...) → não configurado
 *  - valor diferente do seed e plausível → configurado
 */

// ───── valores que vêm do schema.prisma (StoreSettings @default) ─────
// Mantidos como constantes pra detectar quando o admin ainda não tocou.

const SEED_WHATSAPP = '5511999999999';
const SEED_WHATSAPP_DISPLAY = '(11) 99999-9999';
const SEED_EMAIL = 'contato@traveltech.com.br';
const SEED_ADDRESS = 'Av. Paulista, 1000 — São Paulo/SP';

// Os defaults de meta vêm do seed (prisma/seed.ts) e do schema. O seed
// reescreve com `${siteName} — ${tagline}` então listamos as duas formas.
const SEED_META_TITLES: ReadonlySet<string> = new Set([
  'TravelTech — Tudo para sua viagem',
  'TravelTech — Tudo para viajar com mais praticidade, tecnologia e segurança',
]);
const SEED_META_DESCRIPTIONS: ReadonlySet<string> = new Set([
  'Malas, mochilas, adaptadores e acessórios de viagem com atendimento humano e finalização segura pelo WhatsApp.',
  'Loja especializada em malas, mochilas e acessórios de viagem com tecnologia útil. Atendimento humano, entrega para todo o Brasil e finalização segura pelo WhatsApp.',
]);

// Slugs institucionais essenciais. Para considerar "páginas publicadas" como
// concluído, todos esses devem existir com conteúdo de tamanho mínimo.
export const REQUIRED_PAGE_SLUGS = ['sobre', 'politicas', 'termos', 'faq', 'garantia'] as const;
const MIN_PAGE_CONTENT_LENGTH = 120;

const norm = (v: string | null | undefined): string => (v ?? '').trim();

// ────────────────────────── WhatsApp ──────────────────────────

/**
 * Considera real quando:
 *  - tem 12 ou 13 dígitos (formato BR internacional: 55 + DDD + número)
 *  - não é o seed
 *  - não é sequência repetida (000..., 1111..., etc)
 */
export const isRealWhatsapp = (number: string | null | undefined): boolean => {
  const raw = norm(number);
  if (!raw) return false;
  if (raw === SEED_WHATSAPP) return false;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 13) return false;
  // sequência repetida: 000..., 9999..., etc
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
};

export const isRealWhatsappDisplay = (display: string | null | undefined): boolean => {
  const raw = norm(display);
  return !!raw && raw !== SEED_WHATSAPP_DISPLAY;
};

// ────────────────────────── Logo ──────────────────────────

/**
 * Logo real = URL não vazia e que não aponta para placeholder genérico.
 * Aceita qualquer URL real (Cloudinary, /uploads, https://...).
 */
export const isRealLogo = (logoUrl: string | null | undefined): boolean => {
  const raw = norm(logoUrl);
  if (!raw) return false;
  if (/placeholder/i.test(raw)) return false;
  return true;
};

// ────────────────────────── Hero ──────────────────────────

// Defaults do schema/seed do Hero — ajudam a detectar quando o lojista
// ainda não personalizou o texto principal.
const SEED_HERO_TITLES: ReadonlySet<string> = new Set([
  'Tudo para viajar com mais praticidade, tecnologia e segurança',
]);

/** Imagem real do hero = URL não vazia e não placeholder. */
export const isRealHeroImage = (heroImageUrl: string | null | undefined): boolean => {
  const raw = norm(heroImageUrl);
  if (!raw) return false;
  if (/placeholder/i.test(raw)) return false;
  return true;
};

/** Título do hero personalizado (diferente do default do seed). */
export const isRealHeroTitle = (heroTitle: string | null | undefined): boolean => {
  const raw = norm(heroTitle);
  if (!raw) return false;
  if (SEED_HERO_TITLES.has(raw)) return false;
  return true;
};

// ────────────────────── Conteúdo da home (homeContentJson) ──────────────────────

export type HomeContentSavedState = {
  heroBadges: 'configured' | 'default';
  trustCards: 'configured' | 'default';
  howItWorks: 'configured' | 'default';
};

/**
 * Diz, por seção do homeContentJson, se há conteúdo salvo no banco ou se a
 * home está caindo no DEFAULT_* embutido no código. Não compara o valor com
 * o default — basta existir array com itens para contar como configurado.
 */
export const homeContentSavedStates = (
  homeContentJson: string | null | undefined,
): HomeContentSavedState => {
  const raw = norm(homeContentJson);
  const allDefault: HomeContentSavedState = {
    heroBadges: 'default',
    trustCards: 'default',
    howItWorks: 'default',
  };
  if (!raw) return allDefault;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return allDefault;
  }
  if (!parsed || typeof parsed !== 'object') return allDefault;
  const obj = parsed as Record<string, unknown>;
  const has = (key: string): 'configured' | 'default' =>
    Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0 ? 'configured' : 'default';
  return {
    heroBadges: has('heroBadges'),
    trustCards: has('trustCards'),
    howItWorks: has('howItWorks'),
  };
};

// ────────────────────────── SEO ──────────────────────────

export const isRealSeo = (settings: {
  defaultMetaTitle?: string | null;
  defaultMetaDescription?: string | null;
} | null | undefined): boolean => {
  if (!settings) return false;
  const title = norm(settings.defaultMetaTitle);
  const desc = norm(settings.defaultMetaDescription);
  if (!title || !desc) return false;
  if (SEED_META_TITLES.has(title)) return false;
  if (SEED_META_DESCRIPTIONS.has(desc)) return false;
  // Mínimo razoável de descrição (Google espera 50-160).
  if (desc.length < 40) return false;
  return true;
};

// ────────────────────── Google Analytics 4 ──────────────────────

const GA_FAKE_PATTERNS = [
  /^g-x+$/i,
  /^g-0+$/,
  /^g-12345/i,
  /^g-aaaaa/i,
];

export const isRealGa = (): boolean => {
  const raw = norm(process.env.NEXT_PUBLIC_GA_ID);
  if (!raw) return false;
  // Formato esperado: G-XXXXXXXXXX (ID público do GA4).
  if (!/^G-[A-Z0-9]{6,}$/i.test(raw)) return false;
  if (GA_FAKE_PATTERNS.some((re) => re.test(raw))) return false;
  return true;
};

// ────────────────────── Meta Pixel ──────────────────────

const PIXEL_FAKE_PATTERNS = [
  /^0+$/,
  /^1234567890/,
  /^9876543210/,
  /^111+$/,
];

export const isRealPixel = (): boolean => {
  const raw = norm(process.env.NEXT_PUBLIC_META_PIXEL_ID);
  if (!raw) return false;
  // Pixel IDs do Facebook são numéricos, normalmente 15-16 dígitos.
  if (!/^\d{8,20}$/.test(raw)) return false;
  if (PIXEL_FAKE_PATTERNS.some((re) => re.test(raw))) return false;
  return true;
};

// ────────────────────── Cloudinary ──────────────────────

export const isRealCloudinary = (): boolean => {
  return !!norm(process.env.CLOUDINARY_CLOUD_NAME) &&
    !!norm(process.env.CLOUDINARY_API_KEY) &&
    !!norm(process.env.CLOUDINARY_API_SECRET);
};

// ────────────────────── Pagamentos ──────────────────────

const VALID_PAYMENT_METHODS: ReadonlySet<string> = new Set([
  'pix',
  'cartao-credito',
  'cartao-debito',
  'boleto',
  'dinheiro',
  'a-combinar',
]);

export type PaymentMethodsState =
  | 'configured' // JSON salvo no banco com ≥1 método válido — "Concluído"
  | 'empty'      // JSON salvo mas sem método ativo (lojista limpou tudo) — "Pendente"
  | 'fallback';  // JSON null/vazio/inválido — sistema cai no DEFAULT_ACTIVE — "Atenção"

/**
 * Diz como as formas de pagamento estão. Trata o seed/default como
 * configuração real — se existe JSON parseável com ao menos um método válido,
 * conta como "Concluído". Só vira "Atenção" quando o JSON está ausente ou
 * inválido (parser cai no fallback). E só vira "Pendente" se o lojista
 * explicitamente salvou lista vazia.
 *
 * (A action `updatePaymentMethodsAction` já bloqueia salvar lista vazia, então
 * o estado 'empty' só aparece se alguém zerar o campo direto no banco.)
 */
export const paymentMethodsState = (
  paymentMethodsJson: string | null | undefined,
): PaymentMethodsState => {
  const raw = norm(paymentMethodsJson);
  if (!raw) return 'fallback';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 'fallback';
  }
  if (!Array.isArray(parsed)) return 'fallback';
  const valid = parsed.filter(
    (v): v is string => typeof v === 'string' && VALID_PAYMENT_METHODS.has(v),
  );
  if (valid.length === 0) return 'empty';
  return 'configured';
};

/**
 * Açúcar booleano em cima de paymentMethodsState — útil para checklists que
 * só querem saber "está configurado?".
 */
export const isPaymentMethodsConfigured = (
  paymentMethodsJson: string | null | undefined,
): boolean => paymentMethodsState(paymentMethodsJson) === 'configured';

// ────────────────────── Páginas institucionais ──────────────────────

/**
 * Considera publicadas quando todos os slugs essenciais existem E têm
 * conteúdo mínimo. Conteúdo vazio ou muito curto = ainda fallback.
 */
export const realPublishedPagesCount = (
  pages: Array<{ slug: string; content: string }>,
): number => {
  const bySlug = new Map(pages.map((p) => [p.slug, p.content ?? '']));
  return REQUIRED_PAGE_SLUGS.reduce((n, slug) => {
    const content = norm(bySlug.get(slug));
    return n + (content.length >= MIN_PAGE_CONTENT_LENGTH ? 1 : 0);
  }, 0);
};

export const allRequiredPagesPublished = (
  pages: Array<{ slug: string; content: string }>,
): boolean => realPublishedPagesCount(pages) === REQUIRED_PAGE_SLUGS.length;
