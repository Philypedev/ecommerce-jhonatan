'use client';

import { useState } from 'react';

type Props = {
  brands: string[];
  current: {
    minPrice?: string;
    maxPrice?: string;
    brand?: string;
    sort?: string;
    onlyAvailable?: string;
    onlyOffers?: string;
    onlyFeatured?: string;
  };
  basePath: string;
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'featured', label: 'Em destaque' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'manual', label: 'Ordem manual' },
];

export const CategoryFilters = ({ brands, current, basePath }: Props) => {
  const [open, setOpen] = useState(false);

  const activeCount = [
    current.minPrice,
    current.maxPrice,
    current.brand,
    current.onlyAvailable,
    current.onlyOffers,
    current.onlyFeatured,
  ].filter(Boolean).length;

  // GET form: o browser cuida da URL ao submeter
  const formId = 'category-filters-form';

  return (
    <div className="space-y-3">
      {/* Topbar com sort + toggle de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-3 shadow-card">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100 md:hidden"
          aria-expanded={open}
          aria-controls={formId}
        >
          {open ? 'Ocultar filtros' : 'Filtros'}
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-900 px-1 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>

        <form
          method="get"
          action={basePath}
          className="ml-auto inline-flex items-center gap-2 text-sm"
        >
          {/* Preserva os outros filtros ao trocar de sort */}
          {current.minPrice && <input type="hidden" name="minPrice" value={current.minPrice} />}
          {current.maxPrice && <input type="hidden" name="maxPrice" value={current.maxPrice} />}
          {current.brand && <input type="hidden" name="brand" value={current.brand} />}
          {current.onlyAvailable && <input type="hidden" name="onlyAvailable" value="1" />}
          {current.onlyOffers && <input type="hidden" name="onlyOffers" value="1" />}
          {current.onlyFeatured && <input type="hidden" name="onlyFeatured" value="1" />}

          <label htmlFor="sort" className="hidden text-ink-500 sm:inline">Ordenar:</label>
          <select
            id="sort"
            name="sort"
            defaultValue={current.sort || 'recent'}
            onChange={(e) => e.currentTarget.form?.submit()}
            className="rounded-md border border-ink-300 bg-white px-3 py-2 text-sm font-medium text-ink-900 focus:border-brand-700 focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </form>
      </div>

      {/* Form de filtros */}
      <form
        id={formId}
        method="get"
        action={basePath}
        className={`rounded-2xl border border-ink-100 bg-white p-5 shadow-card ${
          open ? 'block' : 'hidden'
        } md:block`}
      >
        {/* preserva sort */}
        {current.sort && <input type="hidden" name="sort" value={current.sort} />}

        <div className="grid gap-5 md:grid-cols-4">
          <div>
            <p className="field-label">Preço</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                name="minPrice"
                defaultValue={current.minPrice || ''}
                placeholder="Mín."
                className="field-input"
              />
              <span className="text-sm text-ink-500">até</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                name="maxPrice"
                defaultValue={current.maxPrice || ''}
                placeholder="Máx."
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="brand" className="field-label">Marca</label>
            <select
              id="brand"
              name="brand"
              defaultValue={current.brand || ''}
              className="field-input"
            >
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <p className="field-label">Filtros rápidos</p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-900 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50/40">
                <input
                  type="checkbox"
                  name="onlyAvailable"
                  value="1"
                  defaultChecked={!!current.onlyAvailable}
                />
                Em estoque
              </label>
              <label className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-900 has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50/60">
                <input
                  type="checkbox"
                  name="onlyOffers"
                  value="1"
                  defaultChecked={!!current.onlyOffers}
                />
                Em oferta
              </label>
              <label className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-900 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/60">
                <input
                  type="checkbox"
                  name="onlyFeatured"
                  value="1"
                  defaultChecked={!!current.onlyFeatured}
                />
                Em destaque
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary">Aplicar filtros</button>
          <a href={basePath} className="btn-ghost text-sm">Limpar</a>
        </div>
      </form>
    </div>
  );
};
