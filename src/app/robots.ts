import type { MetadataRoute } from 'next';
import { siteConfig as fallback } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || fallback.url;
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // - /admin, /checkout, /api: nunca indexar.
        // - /carrinho: página só faz sentido logado com estado local — evita
        //   páginas vazias indexadas.
        // - /busca: query-strings geram infinitas URLs sem valor semântico.
        disallow: ['/admin', '/checkout', '/api', '/carrinho', '/busca'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
