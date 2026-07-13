import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import { ChevronRight } from '@/components/ui/Icon';
import type { Product } from '@/types';

export const FeaturedProducts = ({ products }: { products: Product[] }) => {
  if (products.length === 0) return null;

  return (
    <section id="produtos" className="container-x py-14 md:py-20" aria-labelledby="produtos-title">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Novidades
          </p>
          <h2 id="produtos-title" className="mt-1 text-balance text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
            Novidades para sua viagem
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-500">
            Escolhas úteis para viajar com mais praticidade, segurança e conforto.
          </p>
        </div>
        <Link href="/categoria/ofertas" className="hidden text-sm font-semibold text-brand-700 hover:text-brand-900 md:inline-flex md:items-center md:gap-1">
          Ver todos <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 2} />
        ))}
      </div>
    </section>
  );
};
