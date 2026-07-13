import type { Metadata } from 'next';
import Link from 'next/link';
import { searchProducts, type ProductSort } from '@/lib/db/products';
import { getHomeCategories } from '@/lib/db/categories';
import { toLegacyProduct } from '@/lib/db/adapters';
import { ProductCard } from '@/components/product/ProductCard';
import { EventTracker } from '@/components/analytics/EventTracker';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { SearchIcon } from '@/components/ui/Icon';
import { SortSelect } from '@/components/product/SortSelect';

export const dynamic = 'force-dynamic';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Em destaque' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
];

const VALID_SORTS: ProductSort[] = ['recent', 'price-asc', 'price-desc', 'featured'];

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> => {
  const { q } = await searchParams;
  const term = (q || '').trim();
  return {
    title: term ? `Busca: ${term}` : 'Buscar produtos',
    description: term
      ? `Resultados da busca por "${term}".`
      : 'Pesquise produtos no catálogo TravelTech.',
    robots: { index: false, follow: true },
  };
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort: rawSort } = await searchParams;
  const term = (q || '').trim();
  const sort = (VALID_SORTS as string[]).includes(rawSort ?? '')
    ? (rawSort as ProductSort)
    : 'featured';

  const [results, suggestedCategories] = await Promise.all([
    term.length >= 2 ? searchProducts(term, sort) : Promise.resolve([]),
    getHomeCategories(),
  ]);

  return (
    <>
      <section className="bg-brand-950 text-white">
        <div className="container-x py-10">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {term ? `Resultados para "${term}"` : 'Buscar produtos'}
          </h1>
          <p className="mt-2 text-sm text-brand-100/85">
            {term.length === 0
              ? 'Use a barra de busca no topo para pesquisar produtos por nome, marca, SKU ou categoria.'
              : term.length < 2
                ? 'Use ao menos 2 caracteres para buscar.'
                : `${results.length} produto${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}.`}
          </p>
        </div>
      </section>

      {term.length >= 2 && (
        <EventTracker
          event="Search"
          params={{ search_string: term, results: results.length }}
        />
      )}

      <section className="container-x py-10">
        {results.length > 0 && (
          <form
            method="get"
            action="/busca"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-card"
          >
            <input type="hidden" name="q" value={term} />
            <p className="text-sm font-medium text-ink-700">
              {results.length} resultado{results.length === 1 ? '' : 's'} para{' '}
              <span className="font-bold text-ink-900">&quot;{term}&quot;</span>
            </p>
            <div className="inline-flex items-center gap-2 text-sm">
              <label htmlFor="sort" className="hidden text-ink-500 sm:inline">Ordenar:</label>
              <SortSelect
                id="sort"
                name="sort"
                defaultValue={sort}
                options={SORT_OPTIONS}
              />
            </div>
          </form>
        )}

        {results.length === 0 ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-md rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ink-100 text-ink-500">
                <SearchIcon size={28} />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink-900">
                {term.length < 2 ? 'O que você procura?' : 'Nenhum produto encontrado'}
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                {term.length < 2
                  ? 'Digite uma palavra-chave para começar (nome, marca, SKU ou categoria).'
                  : 'Tente outra palavra ou explore nossas categorias abaixo.'}
              </p>
              <Link href="/" className="btn-primary mt-6 inline-flex">
                Voltar para a loja
              </Link>
            </div>

            {suggestedCategories.length > 0 && (
              <div>
                <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-[0.18em] text-brand-700">
                  Explore nossas categorias
                </h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {suggestedCategories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/categoria/${c.slug}`}
                        className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-ink-100 bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-700/30 hover:shadow-card"
                      >
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-700 group-hover:text-white">
                          <CategoryIcon name={c.icon} size={24} />
                        </span>
                        <span className="text-sm font-semibold text-ink-900">{c.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p, i) => (
              <ProductCard key={p.id} product={toLegacyProduct(p)} priority={i < 2} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
