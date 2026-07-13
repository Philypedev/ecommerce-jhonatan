import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { getProductBySlug, getActiveProducts, getRelatedProducts } from '@/lib/db/products';
import { toLegacyProduct } from '@/lib/db/adapters';
import { ProductInfoSection } from '@/components/product/ProductInfoSection';
import { ProductBenefits } from '@/components/product/ProductBenefits';
import { ProductSpecifications } from '@/components/product/ProductSpecifications';
import { FAQ } from '@/components/product/FAQ';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { ChevronRight } from '@/components/ui/Icon';
import { EventTracker } from '@/components/analytics/EventTracker';

export const revalidate = 60;

type Params = { slug: string };

export async function generateStaticParams() {
  const list = await getActiveProducts();
  return list.map((p) => ({ slug: p.slug }));
}

export const generateMetadata = async ({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> => {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Produto não encontrado' };

  return {
    title: product.metaTitle || product.name,
    description: product.metaDescription || product.shortDescription,
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription,
      images: product.images[0]
        ? [{ url: product.images[0].url, alt: product.images[0].alt }]
        : undefined,
      type: 'website',
    },
  };
};

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const dbProduct = await getProductBySlug(slug);
  if (!dbProduct) notFound();

  const product = toLegacyProduct(dbProduct);
  const related = (await getRelatedProducts(dbProduct, 4)).map(toLegacyProduct);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images.map((i) => i.src),
    description: product.shortDescription,
    sku: product.sku,
    brand: { '@type': 'Brand', name: product.brand },
    offers: {
      '@type': 'Offer',
      url: `${baseUrl}/produto/${product.slug}`,
      priceCurrency: 'BRL',
      price: product.price.toFixed(2),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventTracker
        event="ViewContent"
        params={{
          content_name: product.name,
          content_ids: [product.sku],
          content_type: 'product',
          currency: 'BRL',
          value: product.price,
          content_category: dbProduct.category.name,
        }}
      />

      <div className="container-x pt-6">
        <nav aria-label="Trilha" className="flex items-center gap-1 text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-900">Início</Link>
          <ChevronRight size={14} />
          <Link href={`/categoria/${dbProduct.category.slug}`} className="hover:text-ink-900">
            {dbProduct.category.name}
          </Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1 text-ink-700">{product.name}</span>
        </nav>
      </div>

      <section className="container-x grid gap-10 py-8 md:grid-cols-2 md:gap-12 md:py-12">
        <ProductInfoSection product={product} />
      </section>

      {product.description && (
        <section className="container-x py-10">
          <article className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-900">Sobre o produto</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {product.description}
            </p>
          </article>
        </section>
      )}

      {product.benefits.length > 0 && (
        <section className="container-x pb-10">
          <ProductBenefits items={product.benefits} />
        </section>
      )}

      <section className="container-x pb-10">
        <ProductSpecifications product={product} />
      </section>

      <section className="container-x pb-10">
        <FAQ items={product.faq} />
      </section>

      {related.length > 0 && (
        <section className="container-x pb-20">
          <RelatedProducts products={related} />
        </section>
      )}
    </>
  );
}
