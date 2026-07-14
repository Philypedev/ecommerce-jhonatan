import type {
  Product as LegacyProduct,
  ProductVariantOptionPublic,
  ProductVariantPublic,
} from '@/types';
import type { ProductWithRelations } from './products';

const parseOptionsMap = (raw: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
  } catch {
    /* silent */
  }
  return {};
};

/**
 * Converte o registro do banco para o tipo Product usado pelos componentes
 * legados (ProductCard, ProductDetails, etc.). Mantém compatibilidade total.
 *
 * `variantOptions` e `variants` só ficam populados quando o loader anexou —
 * páginas de listagem devolvem [] para não pagar N+1 (variantes só importam
 * na PDP).
 */
export const toLegacyProduct = (p: ProductWithRelations): LegacyProduct => {
  const allowedBadges = ['novo', 'promo', 'destaque'] as const;
  const badge =
    p.badge && (allowedBadges as readonly string[]).includes(p.badge)
      ? (p.badge as (typeof allowedBadges)[number])
      : undefined;

  const variantOptions: ProductVariantOptionPublic[] = (p.variantOptions ?? []).map(
    (o) => ({
      id: o.id,
      name: o.name,
      values: o.values.map((v) => ({
        id: v.id,
        value: v.value,
        // imageUrl é anexado pelos loaders via attachValueImages (raw SQL).
        // Se veio null/undefined (ex.: lista sem hydrate), cai em null.
        imageUrl: (v as { imageUrl?: string | null }).imageUrl ?? null,
      })),
    }),
  );

  const variants: ProductVariantPublic[] = (p.variants ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    sku: v.sku,
    price: v.price,
    oldPrice: v.oldPrice ?? null,
    stock: v.stock,
    active: v.active,
    imageUrl: v.imageUrl ?? null,
    optionsMap: parseOptionsMap(v.optionsJson),
  }));

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    description: p.fullDescription,
    price: p.price,
    oldPrice: p.oldPrice ?? undefined,
    installments: p.installments,
    stock: p.stock,
    sku: p.sku,
    brand: p.brand,
    // p.category pode ser null agora (rascunho sem categoria). Público só
    // acessa produtos ACTIVE, que exigem categoria via superRefine — mas
    // guardamos aqui para a página admin de edição não estourar.
    categorySlug: p.category?.slug ?? '',
    badge,
    images:
      p.images.length > 0
        ? p.images.map((i) => ({ src: i.url, alt: i.alt || p.name }))
        : [{ src: '/placeholder.svg', alt: p.name }],
    benefits: p.benefits.map((b) => b.text),
    specifications: p.specifications.map((s) => ({ label: s.name, value: s.value })),
    boxContents: (() => {
      try {
        const parsed = JSON.parse(p.packageContent || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return p.packageContent ? p.packageContent.split('\n').filter(Boolean) : [];
      }
    })(),
    warranty: p.warranty,
    faq: p.faq.map((f) => ({ question: f.question, answer: f.answer })),
    relatedIds: [],
    variantOptions,
    variants,
  };
};
