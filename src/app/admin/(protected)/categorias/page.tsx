import Link from 'next/link';
import {
  getAdminCategoriesData,
  type AdminCategoriesStats,
  type AdminCategoryProductsFilter,
  type AdminCategorySort,
  type AdminCategoryVisibilityFilter,
} from '@/lib/db/categories';
import { CategoryFormDialog } from './CategoryFormDialog';
import {
  CategoriesSelectableList,
  type CategoryRowData,
} from './CategoriesSelectableList';

export const dynamic = 'force-dynamic';

// ───────────────────────── constantes ─────────────────────────

const PAGE_SIZE = 25;

const SORT_OPTIONS: { value: AdminCategorySort; label: string }[] = [
  { value: 'position',      label: 'Posição' },
  { value: 'name-asc',      label: 'Nome A → Z' },
  { value: 'recent',        label: 'Mais recentes' },
  { value: 'products-desc', label: 'Mais produtos' },
  { value: 'products-asc',  label: 'Menos produtos' },
];

// ───────────────────────── helpers ─────────────────────────

const buildQuery = (params: Record<string, string | undefined | null>): string => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

type SearchParams = {
  q?: string;
  status?: string;
  visibility?: string;
  products?: string;
  sort?: string;
  page?: string;
};

const asVisibility = (v?: string): AdminCategoryVisibilityFilter =>
  v === 'menu' || v === 'footer' || v === 'hidden' ? v : 'all';
const asProducts = (v?: string): AdminCategoryProductsFilter =>
  v === 'with-products' || v === 'without-products' ? v : 'all';
const asSort = (v?: string): AdminCategorySort => {
  const allowed: AdminCategorySort[] = ['position', 'name-asc', 'recent', 'products-desc', 'products-asc'];
  return (allowed as string[]).includes(v ?? '') ? (v as AdminCategorySort) : 'position';
};

// ─────── Abas rápidas ───────

type QuickTab = {
  key: string;
  label: string;
  count: (s: AdminCategoriesStats) => number;
  params: Record<string, string | undefined>;
};

const QUICK_TABS: QuickTab[] = [
  { key: 'all',     label: 'Todas',        count: (s) => s.total,     params: {} },
  { key: 'active',  label: 'Ativas',       count: (s) => s.active,    params: { status: 'ACTIVE' } },
  { key: 'inactive',label: 'Inativas',     count: (s) => s.inactive,  params: { status: 'INACTIVE' } },
  { key: 'menu',    label: 'No menu',      count: (s) => s.inMenu,    params: { visibility: 'menu' } },
  { key: 'empty',   label: 'Sem produtos', count: (s) => s.withoutPublishedProducts, params: { products: 'without-products' } },
];

const isTabActive = (tab: QuickTab, sp: SearchParams): boolean => {
  const relevantKeys = (['status', 'visibility', 'products'] as const).filter(
    (k) => sp[k] && sp[k] !== 'all',
  );
  const tabKeys = Object.keys(tab.params);
  if (relevantKeys.length !== tabKeys.length) return false;
  for (const k of tabKeys) if (sp[k as keyof SearchParams] !== tab.params[k]) return false;
  return true;
};

// ─────────────────────── página ───────────────────────

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  const visibilityFilter = asVisibility(sp.visibility);
  const productsFilter = asProducts(sp.products);
  const sort = asSort(sp.sort);

  const paged = await getAdminCategoriesData({
    q: sp.q,
    status: sp.status,
    visibility: visibilityFilter,
    products: productsFilter,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const hasAnyCategory = paged.stats.total > 0;
  const hasAnyFilter = Boolean(
    sp.q || sp.status ||
    (visibilityFilter !== 'all') ||
    (productsFilter !== 'all')
  );

  // Serialização para o client component
  const rows: CategoryRowData[] = paged.items.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    longDescription: c.longDescription,
    icon: c.icon,
    imageUrl: c.imageUrl,
    imageMobileUrl: c.imageMobileUrl,
    status: c.status,
    position: c.position,
    highlight: c.highlight,
    showInMenu: c.showInMenu,
    showOnHome: c.showOnHome,
    showInFooter: c.showInFooter,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    publishedProductCount: c.publishedProductCount,
    totalProductCount: c.totalProductCount,
    isAutomatic: c.isAutomatic,
  }));

  const preserveForPage = {
    q: sp.q,
    status: sp.status,
    visibility: visibilityFilter === 'all' ? undefined : visibilityFilter,
    products: productsFilter === 'all' ? undefined : productsFilter,
    sort: sort === 'position' ? undefined : sort,
  };

  return (
    <div className="space-y-6">
      {/* ─── Cabeçalho ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">Coleções</h1>
          <p className="mt-1 text-sm text-ink-500">
            Organize os produtos da loja por coleções, campanhas e categorias de navegação.
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {paged.total === 1 ? '1 coleção encontrada' : `${paged.total} coleções encontradas`}
            {hasAnyCategory && paged.total !== paged.stats.total ? ` · ${paged.stats.total} no total` : ''}
          </p>
        </div>
        <CategoryFormDialog mode="new" />
      </div>

      {/* ─── Cards de resumo ─── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Cadastradas"       value={paged.stats.total} hint="Total no banco" />
        <StatCard label="Ativas"            value={paged.stats.active} hint="Aparecem na loja" tone={paged.stats.active > 0 ? 'success' : undefined} />
        <StatCard label="Inativas"          value={paged.stats.inactive} hint="Ocultas dos clientes" tone={paged.stats.inactive > 0 ? 'warning' : undefined} />
        <StatCard label="No menu"           value={paged.stats.inMenu} hint="Aparecem no menu principal" />
        <StatCard label="Sem produtos"      value={paged.stats.withoutPublishedProducts} hint="Ativas mas vazias" tone={paged.stats.withoutPublishedProducts > 0 ? 'warning' : undefined} />
      </section>

      {/* ─── Abas rápidas ─── */}
      <section className="flex flex-wrap items-center gap-2 overflow-x-auto">
        {QUICK_TABS.map((t) => {
          const active = isTabActive(t, sp);
          const href = `/admin/categorias${buildQuery({
            q: sp.q,
            sort: sort === 'position' ? undefined : sort,
            ...t.params,
          })}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`badge ${active ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
            >
              {t.label} ({t.count(paged.stats)})
            </Link>
          );
        })}
      </section>

      {/* ─── Filtros ─── */}
      <form
        method="get"
        action="/admin/categorias"
        className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="q" className="field-label">Buscar</label>
            <input id="q" name="q" defaultValue={sp.q || ''} placeholder="Nome, slug ou descrição" className="field-input h-10" />
          </div>
          <div>
            <label htmlFor="status" className="field-label">Status</label>
            <select id="status" name="status" defaultValue={sp.status || ''} className="field-input h-10">
              <option value="">Todos</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Inativas</option>
            </select>
          </div>
          <div>
            <label htmlFor="visibility" className="field-label">Exibição</label>
            <select id="visibility" name="visibility" defaultValue={visibilityFilter} className="field-input h-10">
              <option value="all">Todas</option>
              <option value="menu">Menu principal</option>
              <option value="footer">Rodapé</option>
              <option value="hidden">Ocultas</option>
            </select>
          </div>
          <div>
            <label htmlFor="products" className="field-label">Produtos</label>
            <select id="products" name="products" defaultValue={productsFilter} className="field-input h-10">
              <option value="all">Todas</option>
              <option value="with-products">Com produtos</option>
              <option value="without-products">Sem produtos</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="field-label">Ordenar por</label>
            <select id="sort" name="sort" defaultValue={sort} className="field-input h-10">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary">Filtrar</button>
          <Link href="/admin/categorias" className="btn-ghost text-sm">Limpar filtros</Link>
        </div>
      </form>

      {/* ─── Empty states ─── */}
      {paged.items.length === 0 ? (
        hasAnyCategory ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhuma coleção encontrada com esses filtros.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Tente limpar os filtros ou alterar os critérios de busca.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <Link href="/admin/categorias" className="btn-outline">Limpar filtros</Link>
              <Link href="/admin/categorias" className="btn-primary">Ver todas as coleções</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhuma coleção cadastrada ainda.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Crie coleções para organizar os produtos e facilitar a navegação da loja.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <CategoryFormDialog mode="new" />
            </div>
          </div>
        )
      ) : (
        <>
          <CategoriesSelectableList categories={rows} />

          {paged.totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-3 shadow-card">
              <p className="text-xs text-ink-500">
                Página {paged.page} de {paged.totalPages} · {paged.total} coleções
              </p>
              <div className="flex items-center gap-2">
                <PageLink
                  label="← Anterior"
                  disabled={paged.page <= 1}
                  href={`/admin/categorias${buildQuery({ ...preserveForPage, page: String(paged.page - 1) })}`}
                />
                <PageLink
                  label="Próxima →"
                  disabled={paged.page >= paged.totalPages}
                  href={`/admin/categorias${buildQuery({ ...preserveForPage, page: String(paged.page + 1) })}`}
                />
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

// ───────────────────── componentes auxiliares ─────────────────────

const StatCard = ({
  label, value, hint, tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'warning' | 'success';
}) => (
  <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {tone === 'warning' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
      {tone === 'success' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />}
      {label}
    </p>
    <p className="mt-1 text-2xl font-extrabold text-ink-900">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
  </div>
);

const PageLink = ({ label, href, disabled }: { label: string; href: string; disabled: boolean }) => {
  const cls = 'rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold';
  if (disabled) {
    return <span className={`${cls} pointer-events-none opacity-40 text-ink-500`}>{label}</span>;
  }
  return (
    <Link href={href} className={`${cls} text-ink-900 hover:bg-ink-100`}>
      {label}
    </Link>
  );
};
