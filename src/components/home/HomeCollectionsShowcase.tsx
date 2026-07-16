import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronRight } from '@/components/ui/Icon';
import type { Product } from '@/types';

export type HomeCollectionData = {
  slug: string;
  name: string;
  description: string;
  products: Product[];
};

type Props = {
  collections: HomeCollectionData[];
};

/**
 * Vitrines Shopify-style: uma section por coleção ACTIVE marcada
 * "Exibir na home", contendo os produtos ACTIVE dessa coleção. A
 * página inicial fica automaticamente povoada sem exigir marcação
 * "Destacar na home" nos produtos.
 */
export const HomeCollectionsShowcase = ({ collections }: Props) => {
  if (collections.length === 0) return null;

  return (
    <>
      {collections.map((collection) => (
        <section
          key={collection.slug}
          className="container-x py-14 md:py-20"
          aria-labelledby={`colecao-${collection.slug}-title`}
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                Coleção
              </p>
              <h2
                id={`colecao-${collection.slug}-title`}
                className="mt-1 text-balance text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl"
              >
                {collection.name}
              </h2>
              {collection.description && (
                <p className="mt-1 max-w-xl text-sm text-ink-500">
                  {collection.description}
                </p>
              )}
            </div>
            <Link
              href={`/categoria/${collection.slug}`}
              className="hidden text-sm font-semibold text-brand-700 hover:text-brand-900 md:inline-flex md:items-center md:gap-1"
            >
              Ver todos <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {collection.products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>

          <div className="mt-6 md:hidden">
            <Link
              href={`/categoria/${collection.slug}`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"
            >
              Ver todos os {collection.name.toLowerCase()} <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      ))}
    </>
  );
};
