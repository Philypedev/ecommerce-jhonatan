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
  /** Se true, esconde o filtro "Em oferta" (página /categoria/ofertas) */
  hideOffersFilter?: boolean;
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'featured', label: 'Em destaque' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'manual', label: 'Ordem manual' },
];

const FilterForm = ({
  brands,
  current,
  basePath,
  hideOffersFilter,
  formId,
}: Props & { formId: string }) => (
  <form id={formId} method="get" action={basePath} className="space-y-5">
    {current.sort && <input type="hidden" name="sort" value={current.sort} />}

    <div>
      <p className="field-label">Ordenar por</p>
      <select
        name="sort"
        defaultValue={current.sort || 'recent'}
        className="field-input"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>

    <div>
      <p className="field-label">Preço</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          name="minPrice"
          defaultValue={current.minPrice || ''}
          placeholder="Mín."
          className="field-input"
        />
        <span className="text-sm text-ink-500">—</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          name="maxPrice"
          defaultValue={current.maxPrice || ''}
          placeholder="Máx."
          className="field-input"
        />
      </div>
    </div>

    <div>
      <label className="field-label" htmlFor={`${formId}-brand`}>
        Marca
      </label>
      <select
        id={`${formId}-brand`}
        name="brand"
        defaultValue={current.brand || ''}
        className="field-input"
      >
        <option value="">Todas</option>
        {brands.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
    </div>

    <div>
      <p className="field-label">Disponibilidade e destaques</p>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-100 bg-white p-2 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/40">
          <input
            type="checkbox"
            name="onlyAvailable"
            value="1"
            defaultChecked={!!current.onlyAvailable}
          />
          Em estoque
        </label>
        {!hideOffersFilter && (
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-100 bg-white p-2 text-sm has-[:checked]:border-rose-500 has-[:checked]:bg-rose-50/40">
            <input
              type="checkbox"
              name="onlyOffers"
              value="1"
              defaultChecked={!!current.onlyOffers}
            />
            Em oferta
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-100 bg-white p-2 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50/40">
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

    <div className="flex flex-col gap-2 pt-1">
      <button type="submit" className="btn-primary w-full">
        Aplicar filtros
      </button>
      <a href={basePath} className="btn-ghost w-full text-sm">
        Limpar filtros
      </a>
    </div>
  </form>
);

export const CategorySidebar = (props: Props) => {
  const [open, setOpen] = useState(false);

  const activeCount = [
    props.current.minPrice,
    props.current.maxPrice,
    props.current.brand,
    props.current.onlyAvailable,
    props.current.onlyOffers,
    props.current.onlyFeatured,
  ].filter(Boolean).length;

  return (
    <>
      {/* Botão para abrir filtros no mobile */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md border border-ink-300 bg-white px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-900 px-1 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden h-fit rounded-2xl border border-ink-100 bg-white p-5 shadow-card lg:block">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">Filtros</h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-brand-900 px-2 py-0.5 text-[11px] font-bold text-white">
              {activeCount} {activeCount === 1 ? 'ativo' : 'ativos'}
            </span>
          )}
        </header>
        <FilterForm {...props} formId="filters-desktop" />
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end lg:hidden"
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="Fechar filtros"
          />
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <h2 className="inline-flex items-center gap-2 text-base font-bold text-ink-900">
                Filtros
                {activeCount > 0 && (
                  <span className="rounded-full bg-brand-900 px-2 py-0.5 text-[11px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-md hover:bg-ink-100"
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterForm {...props} formId="filters-mobile" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
