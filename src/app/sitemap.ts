import type { MetadataRoute } from 'next';
import { siteConfig as fallback } from '@/config/site';
import { getActiveProducts } from '@/lib/db/products';
import { getPublicCategories } from '@/lib/db/categories';

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
