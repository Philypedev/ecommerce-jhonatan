import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllCategories, getCategoryBySlug } from '@/lib/db/categories';
import {
  getBrandsInCategory,
  listCategoryProducts,
  type ProductSort,
} from '@/lib/db/products';
import { toLegacyProduct } from '@/lib/db/adapters';
import { ProductCard } from '@/components/product/ProductCard';
import { CategorySidebar } from '@/components/product/CategorySidebar';
import { Pagination } from '@/components/product/Pagination';
import { ChevronRight, SearchIcon } from '@/components/ui/Icon';
import { siteConfig } from '@/config/site';

// ISR: revalidação em background a cada 60s. Antes existia também um
// `export const dynamic = 'force-dynamic'` que ANULAVA o ISR — toda visita
// batia no banco. Removido pra devolver a página a categoria pro cache.
export const revalidate = 60;

type Params = { slug: string };
type Search = {
  minPrice?: string;
  maxPrice?: string;
  brand?: string;
  sort?: string;
  onlyAvailable?: string;
  onlyOffers?: string;
  onlyFeatured?: string;
  page?: string;
};

export async function generateStaticParams() {
  const cats = await getAllCategories();
  return cats.map((c) => ({ slug: c.slug }));
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> => {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Categoria não encontrada' };
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  return {
    title: category.metaTitle || category.name,
    description: category.metaDescription || category.description,
    openGraph: {
      title: category.metaTitle || category.name,
      description: category.metaDescription || category.description,
      url: `${baseUrl}/categoria/${category.slug}`,
      images: category.imageUrl ? [{ url: category.imageUrl, alt: category.name }] : undefined,
    },
  };
};

const VALID_SORTS: ProductSort[] = ['recent', 'price-asc', 'price-desc', 'featured', 'manual'];

const toNumber = (v?: string): number | undefined => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category || category.status !== 'ACTIVE') notFound();

  const isOffersPage = slug === 'ofertas';

  const sort = (VALID_SORTS as string[]).includes(sp.sort ?? '')
    ? (sp.sort as ProductSort)
    : 'recent';

  const filters = {
    minPrice: toNumber(sp.minPrice),
    maxPrice: toNumber(sp.maxPrice),
    brand: sp.brand,
    onlyAvailable: !!sp.onlyAvailable,
    onlyOffers: !!sp.onlyOffers || isOffersPage,
    onlyFeatured: !!sp.onlyFeatured,
    sort,
    page: toNumber(sp.page) ?? 1,
    pageSize: 12,
  };

  const [{ items, total, page, totalPages }, brands] = await Promise.all([
    listCategoryProducts(slug, filters),
    getBrandsInCategory(slug),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: `${baseUrl}/categoria/${category.slug}`,
      },
    ],
  };

  // Filtro "onlyOffers" é implícito na página /categoria/ofertas
  const sidebarCurrent = {
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
    brand: sp.brand,
    sort: sp.sort,
    onlyAvailable: sp.onlyAvailable,
    onlyOffers: isOffersPage ? undefined : sp.onlyOffers,
    onlyFeatured: sp.onlyFeatured,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Banner — usa imageUrl/imageMobileUrl da coleção quando definidos.
          Sem imagem, vira hero escuro padrão. */}
      {category.imageUrl ? (
        <section className="relative w-full overflow-hidden bg-brand-950">
          <picture>
            {category.imageMobileUrl && (
              <source media="(max-width: 640px)" srcSet={category.imageMobileUrl} />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.imageUrl}
              alt={category.name}
              loading="eager"
              decoding="async"
              className="h-56 w-full object-cover sm:h-72 md:h-80"
            />
          </picture>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="container-x absolute inset-0 flex flex-col justify-end pb-8 text-white">
            <nav
              aria-label="Trilha"
              className="mb-3 flex items-center gap-1 text-xs text-brand-100/85"
            >
              <Link href="/" className="hover:text-white">Início</Link>
              <ChevronRight size={14} />
              <span className="text-white">{category.name}</span>
            </nav>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{category.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-brand-100/85">{category.description}</p>
          </div>
        </section>
      ) : (
        <section className="bg-brand-950 text-white">
          <div className="container-x py-10">
            <nav aria-label="Trilha" className="mb-3 flex items-center gap-1 text-xs text-brand-100/80">
              <Link href="/" className="hover:text-white">Início</Link>
              <ChevronRight size={14} />
              <span className="text-white">{category.name}</span>
            </nav>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{category.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-brand-100/85">{category.description}</p>
          </div>
        </section>
      )}

      {category.longDescription && (
        <section className="container-x pt-6">
          <p className="max-w-3xl text-sm text-ink-700">{category.longDescription}</p>
        </section>
      )}

      <section className="container-x grid gap-6 py-8 lg:grid-cols-[280px_1fr]">
        <CategorySidebar
          brands={brands}
          current={sidebarCurrent}
          basePath={`/categoria/${slug}`}
          hideOffersFilter={isOffersPage}
        />

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-700">
              <span className="font-extrabold text-ink-900">{total}</span>{' '}
              produto{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}
            </p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ink-100 text-ink-500">
                <SearchIcon size={26} aria-hidden />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink-900">
                Nenhum produto encontrado com esses filtros
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Tente ajustar a faixa de preço, remover marcas ou desativar os filtros rápidos.
              </p>
              <Link href={`/categoria/${slug}`} className="btn-outline mt-5 inline-flex">
                Limpar filtros
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={toLegacyProduct(p)} priority={i < 2} />
                ))}
              </div>
              <Pagination
                basePath={`/categoria/${slug}`}
                query={sp as Record<string, string | undefined>}
                page={page}
                totalPages={totalPages}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
