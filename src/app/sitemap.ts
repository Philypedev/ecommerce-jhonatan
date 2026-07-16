import type { MetadataRoute } from 'next';
import { siteConfig as fallback } from '@/config/site';
import { getActiveProducts } from '@/lib/db/products';
import { getPublicCategories } from '@/lib/db/categories';

// Sitemap é gerado dinamicamente e recacheado a cada 5min. Sem essa
// configuração, o Next gera o XML no build usando /tmp/traveltech-build.db
// (vazio) e nunca mais atualiza — categorias/produtos criados em
// produção não entram no sitemap até um novo deploy. As Server Actions
// de produto/categoria também chamam revalidatePath('/sitemap.xml')
// para forçar refresh imediato após alterações.
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || fallback.url;
  const now = new Date();

  const [products, categories] = await Promise.all([
    getActiveProducts().catch(() => []),
    getPublicCategories().catch(() => []),
  ]);

  return [
    { url: `${baseUrl}/`, lastModified: now, priority: 1 },
    { url: `${baseUrl}/sobre`, lastModified: now, priority: 0.5 },
    { url: `${baseUrl}/contato`, lastModified: now, priority: 0.5 },
    { url: `${baseUrl}/faq`, lastModified: now, priority: 0.5 },
    { url: `${baseUrl}/politicas`, lastModified: now, priority: 0.4 },
    { url: `${baseUrl}/garantia`, lastModified: now, priority: 0.4 },
    { url: `${baseUrl}/termos`, lastModified: now, priority: 0.3 },
    ...categories.map((c) => ({
      url: `${baseUrl}/categoria/${c.slug}`,
      lastModified: c.updatedAt,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${baseUrl}/produto/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.9,
    })),
  ];
}
