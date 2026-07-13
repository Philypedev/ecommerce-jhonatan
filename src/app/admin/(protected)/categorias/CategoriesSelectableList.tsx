'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toaster';
import {
  bulkActivateCategoriesAction,
  bulkDeactivateCategoriesAction,
  bulkDeleteCategoriesAction,
  bulkSetShowInFooterAction,
  bulkSetShowInMenuAction,
  deleteCategoryAction,
} from '@/app/actions/categories';
import { CategoryFormDialog } from './CategoryFormDialog';

// ─────────────────────────── tipos ───────────────────────────

export type CategoryRowData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
  imageUrl: string | null;
  imageMobileUrl: string | null;
  status: string;
  position: number;
  highlight: boolean;
  showInMenu: boolean;
  showOnHome: boolean;
  showInFooter: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedProductCount: number;
  totalProductCount: number;
  isAutomatic: boolean;
};

// ─────────────────────────── sub-componentes ───────────────────────────

const CategoryThumb = ({ category, size }: { category: CategoryRowData; size: 'sm' | 'md' }) => {
  const boxCls = size === 'md' ? 'h-14 w-14 rounded-lg' : 'h-16 w-16 rounded-lg';
  const hasReal = !!category.imageUrl && !/placeholder/i.test(category.imageUrl);
  if (!hasReal) {
    return (
      <div
        className={`grid ${boxCls} shrink-0 place-items-center border border-dashed border-ink-200 bg-ink-100/40 text-[9px] font-semibold uppercase tracking-wide text-ink-500`}
        aria-label="Sem imagem"
      >
        Sem imagem
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={category.imageUrl ?? ''}
      alt={category.name}
      className={`${boxCls} shrink-0 border border-ink-100 object-cover`}
    />
  );
};

const VisibilityBadges = ({ c }: { c: CategoryRowData }) => {
  // "Home" foi removido da lista pública, então não usamos mais showOnHome
  // como sinal visual — só menu e rodapé decidem se a coleção está oculta.
  const hidden = !c.showInMenu && !c.showInFooter;
  if (hidden) return <span className="badge bg-ink-100 text-ink-500">Oculta</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {c.showInMenu && <span className="badge bg-brand-50 text-brand-700">Menu</span>}
      {c.showInFooter && <span className="badge bg-amber-50 text-amber-700">Rodapé</span>}
    </div>
  );
};

const TypeBadge = ({ c }: { c: CategoryRowData }) =>
  c.isAutomatic ? (
    <div className="flex flex-col gap-1">
      <span className="badge bg-brand-100 text-brand-800">Automática</span>
      <span className="text-[10px] text-ink-500">Produtos com preço antigo</span>
    </div>
  ) : (
    <span className="badge bg-ink-100 text-ink-700">Manual</span>
  );

// ─────────────────────────── ações por linha ───────────────────────────

const RowActions = ({ category }: { category: CategoryRowData }) => {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const handleDelete = async () => {
    if (category.totalProductCount > 0) {
      toast.error(
        `Esta coleção tem ${category.totalProductCount} produto(s). Mova ou exclua os produtos antes de remover.`,
      );
      return;
    }
    const ok = await confirm({
      title: `Excluir a coleção "${category.name}"?`,
      description: 'A coleção será removida permanentemente. Prefira desativar — assim a coleção some da loja mas fica preservada.',
      confirmLabel: 'Excluir mesmo assim',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      try {
        await deleteCategoryAction(category.id);
        toast.success('Coleção excluída.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao excluir.');
      }
    });
  };

  const smallBtn = 'rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <CategoryFormDialog
        mode="edit"
        category={category}
        productCount={category.totalProductCount}
      />
      {category.status === 'ACTIVE' && (
        <Link
          href={`/categoria/${category.slug}`}
          target="_blank"
          rel="noreferrer"
          className={`${smallBtn} border-ink-300 bg-white text-ink-900 hover:bg-ink-100`}
        >
          Ver na loja
        </Link>
      )}
      <Link
        href={`/admin/produtos?categoryId=${category.id}`}
        className={`${smallBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}
      >
        Ver produtos
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`${smallBtn} border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100`}
      >
        Excluir
      </button>
    </div>
  );
};

// ─────────────────────────── componente principal ───────────────────────────

type BulkResult = { ok: true; count: number } | { ok: false; error: string };

export const CategoriesSelectableList = ({ categories }: { categories: CategoryRowData[] }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const allIds = useMemo(() => categories.map((c) => c.id), [categories]);
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

  const runBulk = (
    fn: (ids: string[]) => Promise<BulkResult>,
    successMsg: (n: number) => string,
  ) => {
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

  const onActivate    = () => runBulk((ids) => bulkActivateCategoriesAction(ids), (n) => `${n} coleção(ões) ativada(s).`);
  const onDeactivate  = () => runBulk((ids) => bulkDeactivateCategoriesAction(ids), (n) => `${n} coleção(ões) desativada(s).`);
  const onShowMenu    = () => runBulk((ids) => bulkSetShowInMenuAction(ids, true),  (n) => `${n} coleção(ões) marcada(s) para o menu.`);
  const onHideMenu    = () => runBulk((ids) => bulkSetShowInMenuAction(ids, false), (n) => `${n} coleção(ões) ocultada(s) do menu.`);
  // "Exibir/Ocultar da home" foram removidos — a home não mostra mais lista
  // de categorias. A server action `bulkSetShowOnHomeAction` continua sendo
  // exportada em `actions/categories.ts` para não quebrar contratos antigos,
  // mas nenhuma UI a chama mais.
  const onShowFooter  = () => runBulk((ids) => bulkSetShowInFooterAction(ids, true),  (n) => `${n} coleção(ões) marcada(s) para o rodapé.`);
  const onHideFooter  = () => runBulk((ids) => bulkSetShowInFooterAction(ids, false), (n) => `${n} coleção(ões) ocultada(s) do rodapé.`);

  const onDelete = async () => {
    if (selected.size === 0) return;
    const ok = await confirm({
      title: `Excluir ${selected.size} coleção(ões) definitivamente?`,
      description:
        'Prefira "Desativar em massa" — coleções desativadas somem da loja mas ficam preservadas. Coleções com produtos vinculados não podem ser excluídas.',
      confirmLabel: 'Excluir mesmo assim',
      destructive: true,
    });
    if (!ok) return;
    runBulk((ids) => bulkDeleteCategoriesAction(ids), (n) => `${n} coleção(ões) excluída(s).`);
  };

  const bulkBtn = 'rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40';

  return (
    <>
      {/* Barra sticky com contagem + ações */}
      {anyChecked && (
        <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-brand-200 bg-brand-50/90 p-3 shadow-cardHover backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">
              {selected.size} {selected.size === 1 ? 'coleção selecionada' : 'coleções selecionadas'}
            </p>
            <button type="button" onClick={clearSelection} className="text-xs text-ink-500 hover:underline">
              Limpar seleção
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button type="button" disabled={pending} onClick={onActivate}   className={`${bulkBtn} border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50`}>Ativar</button>
              <button type="button" disabled={pending} onClick={onDeactivate} className={`${bulkBtn} border-amber-300 bg-white text-amber-800 hover:bg-amber-50`}>Desativar</button>
              <button type="button" disabled={pending} onClick={onShowMenu}   className={`${bulkBtn} border-brand-300 bg-white text-brand-700 hover:bg-brand-50`}>Exibir no menu</button>
              <button type="button" disabled={pending} onClick={onHideMenu}   className={`${bulkBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}>Ocultar do menu</button>
              <button type="button" disabled={pending} onClick={onShowFooter} className={`${bulkBtn} border-brand-300 bg-white text-brand-700 hover:bg-brand-50`}>Exibir no rodapé</button>
              <button type="button" disabled={pending} onClick={onHideFooter} className={`${bulkBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}>Ocultar do rodapé</button>
              <button type="button" disabled={pending} onClick={onDelete}     className={`${bulkBtn} border-rose-300 bg-white text-rose-700 hover:bg-rose-50`}>Excluir</button>
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
                  aria-label="Selecionar todas"
                  className="h-4 w-4 rounded border-ink-300 accent-brand-700"
                />
              </th>
              <th className="px-4 py-3">Coleção</th>
              <th className="px-4 py-3">Produtos</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Exibição</th>
              <th className="px-4 py-3">Posição</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {categories.map((c) => {
              const checked = selected.has(c.id);
              const withoutProducts = c.publishedProductCount === 0;
              return (
                <tr key={c.id} className={checked ? 'bg-brand-50/40' : undefined}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`Selecionar ${c.name}`}
                      className="h-4 w-4 rounded border-ink-300 accent-brand-700"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <CategoryThumb category={c} size="md" />
                      <div className="min-w-0">
                        <p className="line-clamp-1 font-medium text-ink-900">{c.name}</p>
                        <p className="line-clamp-1 text-xs text-ink-500">{c.description || '—'}</p>
                        <p className="mt-0.5 truncate font-mono text-[10px] text-ink-300">/{c.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink-900">
                      {c.totalProductCount} {c.totalProductCount === 1 ? 'produto' : 'produtos'}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {c.publishedProductCount} {c.publishedProductCount === 1 ? 'ativo' : 'ativos'}
                    </p>
                    {withoutProducts && c.status === 'ACTIVE' && (
                      <span className="mt-1 inline-flex badge bg-amber-100 text-amber-700">
                        Sem produtos
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3"><TypeBadge c={c} /></td>
                  <td className="px-4 py-3"><VisibilityBadges c={c} /></td>
                  <td className="px-4 py-3 text-ink-700">
                    {c.position > 0 ? c.position : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-700'}`}>
                      {c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RowActions category={c} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <ul className="grid gap-3 md:hidden">
        {categories.map((c) => {
          const checked = selected.has(c.id);
          const withoutProducts = c.publishedProductCount === 0;
          return (
            <li
              key={c.id}
              className={`rounded-2xl border p-4 shadow-card ${checked ? 'border-brand-300 bg-brand-50/40' : 'border-ink-100 bg-white'}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(c.id)}
                  aria-label={`Selecionar ${c.name}`}
                  className="mt-1 h-4 w-4 rounded border-ink-300 accent-brand-700"
                />
                <CategoryThumb category={c} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium text-ink-900">{c.name}</p>
                  <p className="line-clamp-2 text-xs text-ink-500">{c.description || '—'}</p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-ink-300">/{c.slug}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-ink-900">
                    {c.totalProductCount} {c.totalProductCount === 1 ? 'produto' : 'produtos'}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {c.publishedProductCount} {c.publishedProductCount === 1 ? 'ativo' : 'ativos'} · Posição {c.position > 0 ? c.position : '—'}
                  </p>
                </div>
                <span className={`badge ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-700'}`}>
                  {c.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <TypeBadge c={c} />
                <VisibilityBadges c={c} />
                {withoutProducts && c.status === 'ACTIVE' && (
                  <span className="badge bg-amber-100 text-amber-700">
                    Sem produtos
                  </span>
                )}
              </div>
              <div className="mt-3">
                <RowActions category={c} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
};
