'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toaster';
import {
  bulkActivateProductsAction,
  bulkDeactivateProductsAction,
  bulkDeleteProductsAction,
  bulkSetFeaturedAction,
} from '@/app/actions/products';
import { ProductsListActions } from './ProductsListActions';

// ─────────────────────────── tipos ───────────────────────────

export type ProductRowData = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  status: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  featured: boolean;
  categoryName: string;
  imageUrl: string | null;
  hasRealImage: boolean;
  onOffer: boolean;
  variantCount: number;
};

const LOW_STOCK_THRESHOLD = 5;
const statusBadge: Record<string, string> = {
  ACTIVE:   'bg-emerald-100 text-emerald-700',
  DRAFT:    'bg-amber-100 text-amber-700',
  INACTIVE: 'bg-ink-100 text-ink-700',
};
const statusLabel: Record<string, string> = {
  ACTIVE: 'Publicado',
  DRAFT: 'Rascunho',
  INACTIVE: 'Inativo',
};

// ─────────────────────────── sub-componentes ───────────────────────────

const ProductThumb = ({ product, size }: { product: ProductRowData; size: 'sm' | 'md' }) => {
  const boxCls = size === 'md' ? 'h-14 w-14 rounded-lg' : 'h-16 w-16 rounded-lg';
  if (!product.hasRealImage) {
    return (
      <div
        className={`grid ${boxCls} shrink-0 place-items-center border border-dashed border-ink-200 bg-ink-100/40 text-[9px] font-semibold uppercase tracking-wide text-ink-500`}
        aria-label="Sem foto real"
      >
        Sem foto
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl ?? ''}
      alt={product.name}
      className={`${boxCls} shrink-0 border border-ink-100 object-cover`}
    />
  );
};

const PriceCell = ({ price, oldPrice }: { price: number; oldPrice: number | null }) => {
  const onOffer = oldPrice !== null && oldPrice > price;
  return (
    <div className="flex flex-col">
      <span className="font-semibold text-ink-900">{formatCurrency(price)}</span>
      {onOffer && (
        <span className="text-[10px] text-ink-500 line-through">{formatCurrency(oldPrice)}</span>
      )}
    </div>
  );
};

const StockCell = ({ stock }: { stock: number }) => {
  if (stock <= 0) {
    return (
      <div>
        <span className="badge bg-rose-100 text-rose-700">Sob consulta</span>
        <p className="mt-1 text-[11px] text-ink-500">Estoque {stock}</p>
      </div>
    );
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <div>
        <span className="badge bg-amber-100 text-amber-700">Estoque baixo</span>
        <p className="mt-1 text-[11px] text-ink-500">Restam {stock}</p>
      </div>
    );
  }
  return <span className="font-medium text-ink-700">{stock}</span>;
};

const VisibilityCell = ({ product }: { product: ProductRowData }) => (
  <div className="flex flex-wrap gap-1">
    <span className={`badge ${statusBadge[product.status]}`}>
      {statusLabel[product.status] ?? product.status}
    </span>
    {product.featured && <span className="badge bg-brand-50 text-brand-700">Destaque</span>}
    {product.onOffer && <span className="badge bg-rose-100 text-rose-700">Oferta</span>}
    {product.variantCount > 0 && (
      <span className="badge bg-indigo-100 text-indigo-700" title={`${product.variantCount} variantes cadastradas`}>
        Com variações
      </span>
    )}
    {!product.hasRealImage && <span className="badge bg-amber-100 text-amber-700">Sem foto</span>}
  </div>
);

// ─────────────────────────── componente principal ───────────────────────────

export const ProductsSelectableList = ({ products }: { products: ProductRowData[] }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const allIds = useMemo(() => products.map((p) => p.id), [products]);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const anyChecked = selected.size > 0;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => {
      if (allIds.every((id) => prev.has(id))) return new Set();
      return new Set(allIds);
    });
  };
  const clearSelection = () => setSelected(new Set());

  const runBulk = (fn: (ids: string[]) => Promise<{ ok: true; count: number } | { ok: false; error: string }>, successMsg: (n: number) => string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    start(async () => {
      try {
        const result = await fn(ids);
        if (result.ok) {
          toast.success(successMsg(result.count));
          clearSelection();
        } else {
          toast.error(result.error);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível concluir a ação.');
      }
    });
  };

  const onActivate    = () => runBulk((ids) => bulkActivateProductsAction(ids), (n) => `${n} produto(s) ativado(s).`);
  const onDeactivate  = () => runBulk((ids) => bulkDeactivateProductsAction(ids), (n) => `${n} produto(s) desativado(s).`);
  const onFeature     = () => runBulk((ids) => bulkSetFeaturedAction(ids, true), (n) => `${n} produto(s) marcado(s) como destaque.`);
  const onUnfeature   = () => runBulk((ids) => bulkSetFeaturedAction(ids, false), (n) => `${n} produto(s) removido(s) do destaque.`);

  const onDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Excluir ${selected.size} produto(s) definitivamente?`,
      description:
        'Prefira "Desativar em massa" — produtos desativados somem da loja mas o histórico é preservado. Excluir remove imagens, especificações e FAQ juntos, sem volta. Pedidos antigos não são afetados.',
      confirmLabel: 'Excluir mesmo assim',
      destructive: true,
    });
    if (!ok) return;
    runBulk((ids) => bulkDeleteProductsAction(ids), (n) => `${n} produto(s) excluído(s).`);
  };

  const bulkBtn = 'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40';

  return (
    <>
      {/* Barra de ações em massa (sticky no topo do container quando há seleção) */}
      {anyChecked && (
        <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-brand-200 bg-brand-50/90 p-3 shadow-cardHover backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">
              {selected.size} {selected.size === 1 ? 'produto selecionado' : 'produtos selecionados'}
            </p>
            <button type="button" onClick={clearSelection} className="text-xs text-ink-500 hover:underline">
              Limpar seleção
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button type="button" disabled={pending} onClick={onActivate} className={`${bulkBtn} border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50`}>Ativar</button>
              <button type="button" disabled={pending} onClick={onDeactivate} className={`${bulkBtn} border-amber-300 bg-white text-amber-800 hover:bg-amber-50`}>Desativar</button>
              <button type="button" disabled={pending} onClick={onFeature} className={`${bulkBtn} border-brand-300 bg-white text-brand-700 hover:bg-brand-50`}>Marcar destaque</button>
              <button type="button" disabled={pending} onClick={onUnfeature} className={`${bulkBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}>Remover destaque</button>
              <button type="button" disabled={pending} onClick={onDelete} className={`${bulkBtn} border-rose-300 bg-white text-rose-700 hover:bg-rose-50`}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela — desktop */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="border-b border-ink-100 bg-ink-100/40 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                  className="h-4 w-4 rounded border-ink-300 accent-brand-700"
                />
              </th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Coleção</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3">Estoque</th>
              <th className="px-4 py-3">Visibilidade</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {products.map((p) => {
              const checked = selected.has(p.id);
              return (
                <tr key={p.id} className={checked ? 'bg-brand-50/40' : undefined}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(p.id)}
                      aria-label={`Selecionar ${p.name}`}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb product={p} size="md" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 font-medium text-ink-900">{p.name}</p>
                        <p className="text-xs text-ink-500">SKU {p.sku}</p>
                        <p className="truncate font-mono text-[10px] text-ink-300">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-700">{p.categoryName}</td>
                  <td className="px-4 py-3"><PriceCell price={p.price} oldPrice={p.oldPrice} /></td>
                  <td className="px-4 py-3"><StockCell stock={p.stock} /></td>
                  <td className="px-4 py-3"><VisibilityCell product={p} /></td>
                  <td className="px-4 py-3">
                    <ProductsListActions
                      productId={p.id}
                      slug={p.slug}
                      status={p.status}
                      isPublic={p.status === 'ACTIVE'}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <ul className="grid gap-3 md:hidden">
        {products.map((p) => {
          const checked = selected.has(p.id);
          return (
            <li key={p.id} className={`rounded-2xl border p-4 shadow-card ${checked ? 'border-brand-300 bg-brand-50/40' : 'border-ink-100 bg-white'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(p.id)}
                  aria-label={`Selecionar ${p.name}`}
                  className="mt-1 h-4 w-4 rounded border-ink-300 accent-brand-700"
                />
                <ProductThumb product={p} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium text-ink-900">{p.name}</p>
                  <p className="text-xs text-ink-500">SKU {p.sku}</p>
                  <p className="mt-0.5 text-[11px] text-ink-500">{p.categoryName}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <PriceCell price={p.price} oldPrice={p.oldPrice} />
                <StockCell stock={p.stock} />
              </div>
              <div className="mt-3">
                <VisibilityCell product={p} />
              </div>
              <div className="mt-3">
                <ProductsListActions
                  productId={p.id}
                  slug={p.slug}
                  status={p.status}
                  isPublic={p.status === 'ACTIVE'}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};
