import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

export const RelatedProducts = ({ products }: { products: Product[] }) => {
  if (!products.length) return null;
  return (
    <section aria-labelledby="related-title">
      <h2 id="related-title" className="text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">
        Você também pode gostar
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
};
