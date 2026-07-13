import Link from 'next/link';
import {
  getAdminProductStats,
  listAdminProducts,
  type AdminProductBoolFilter,
  type AdminProductImageFilter,
  type AdminProductSort,
  type AdminProductStockFilter,
} from '@/lib/db/products';
import { getAllCategories } from '@/lib/db/categories';
import { ProductsSelectableList, type ProductRowData } from './ProductsSelectableList';
import { MoreActionsMenu } from './MoreActionsMenu';

export const dynamic = 'force-dynamic';

// ───────────────────────── constantes ─────────────────────────

const PAGE_SIZE = 25;

const SORT_OPTIONS: { value: AdminProductSort; label: string }[] = [
  { value: 'recent',     label: 'Mais recentes' },
  { value: 'name-asc',   label: 'Nome A → Z' },
  { value: 'price-asc',  label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'stock-asc',  label: 'Menor estoque' },
  { value: 'stock-desc', label: 'Maior estoque' },
];

// ───────────────────────── helpers ─────────────────────────

const isPlaceholderUrl = (url?: string | null) =>
  !url || /placeholder/i.test(url);

const buildQuery = (params: Record<string, string | undefined | null>): string => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

type SearchParams = {
  q?: string;
  categoryId?: string;
  status?: string;
  stock?: string;
  image?: string;
  featured?: string;
  offer?: string;
  sort?: string;
  page?: string;
};

const asStock = (v?: string): AdminProductStockFilter =>
  v === 'in-stock' || v === 'out' ? v : 'all';
const asImage = (v?: string): AdminProductImageFilter =>
  v === 'no-real' ? 'no-real' : 'all';
const asBool = (v?: string): AdminProductBoolFilter => (v === 'yes' ? 'yes' : 'all');
const asSort = (v?: string): AdminProductSort => {
  const allowed: AdminProductSort[] = ['recent', 'name-asc', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc'];
  return (allowed as string[]).includes(v ?? '') ? (v as AdminProductSort) : 'recent';
};

// ─────── Definição das abas rápidas ───────

type QuickTab = {
  key: string;
  label: string;
  count: (stats: Awaited<ReturnType<typeof getAdminProductStats>>) => number;
  params: Record<string, string | undefined>;
};

const QUICK_TABS: QuickTab[] = [
  { key: 'all',       label: 'Todos',         count: (s) => s.total,        params: {} },
  { key: 'published', label: 'Publicados',    count: (s) => s.published,    params: { status: 'ACTIVE' } },
  { key: 'draft',     label: 'Rascunhos',     count: (s) => s.draft,        params: { status: 'DRAFT' } },
  { key: 'out',       label: 'Sem estoque',   count: (s) => s.outOfStock,   params: { stock: 'out' } },
  { key: 'no-image',  label: 'Sem foto',      count: (s) => s.noRealImage,  params: { image: 'no-real' } },
  { key: 'offer',     label: 'Em oferta',     count: (s) => s.inOffer,      params: { offer: 'yes' } },
  { key: 'featured',  label: 'Em destaque',   count: (s) => s.featured,     params: { featured: 'yes' } },
];

/**
 * Uma aba está ativa quando os filtros da URL casam EXATAMENTE com o set da
 * aba. Isso garante que trocar de aba limpa os outros filtros dessa categoria
 * (evita "Publicados" e "Rascunhos" acesos ao mesmo tempo, por exemplo).
 */
const isTabActive = (tab: QuickTab, sp: SearchParams): boolean => {
  const tabKeys = Object.keys(tab.params);
  // Chaves relevantes para tabs (status/stock/image/featured/offer)
  const relevantSpKeys = (['status', 'stock', 'image', 'featured', 'offer'] as const).filter(
    (k) => sp[k] && sp[k] !== 'all',
  );
  if (relevantSpKeys.length !== tabKeys.length) return false;
  for (const k of tabKeys) if (sp[k as keyof SearchParams] !== tab.params[k]) return false;
  return true;
};

// ───────────────────────── página ─────────────────────────

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);

  const stockFilter = asStock(sp.stock);
  const imageFilter = asImage(sp.image);
  const featuredFilter = asBool(sp.featured);
  const offerFilter = asBool(sp.offer);
  const sort = asSort(sp.sort);

  const [paged, categories, stats] = await Promise.all([
    listAdminProducts({
      q: sp.q,
      categoryId: sp.categoryId,
      status: sp.status,
      stock: stockFilter,
      image: imageFilter,
      featured: featuredFilter,
      offer: offerFilter,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    getAllCategories(),
    getAdminProductStats(),
  ]);

  const hasAnyProduct = stats.total > 0;
  const hasAnyFilter = Boolean(
    sp.q || sp.categoryId || sp.status ||
    (stockFilter !== 'all') ||
    (imageFilter !== 'all') ||
    (featuredFilter !== 'all') ||
    (offerFilter !== 'all')
  );

  // Serialização segura pro client component: sem Prisma types no boundary,
  // sem Dates (não usadas na UI), com "hasRealImage" pré-computado.
  const rows: ProductRowData[] = paged.items.map((p) => {
    const first = p.images[0]?.url ?? null;
    const hasRealImage = p.images.some((img) => !isPlaceholderUrl(img.url));
    const onOffer = p.oldPrice !== null && p.oldPrice > p.price;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      status: p.status,
      price: p.price,
      oldPrice: p.oldPrice,
      stock: p.stock,
      featured: p.featured,
      categoryName: p.category?.name ?? '',
      imageUrl: hasRealImage ? first : null,
      hasRealImage,
      onOffer,
      variantCount: p._count?.variants ?? 0,
    };
  });

  // Query base para paginação (preserva todos os filtros/sort atuais)
  const preserveForPage = {
    q: sp.q,
    categoryId: sp.categoryId,
    status: sp.status,
    stock: stockFilter === 'all' ? undefined : stockFilter,
    image: imageFilter === 'all' ? undefined : imageFilter,
    featured: featuredFilter === 'all' ? undefined : featuredFilter,
    offer: offerFilter === 'all' ? undefined : offerFilter,
    sort: sort === 'recent' ? undefined : sort,
  };
  // Query completa (com page) — usada pela exportação CSV pra respeitar filtros.
  const currentQuery = buildQuery({ ...preserveForPage, page: page > 1 ? String(page) : undefined });

  return (
    <div className="space-y-6">
      {/* ─── Cabeçalho ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-ink-500">
            Gerencie os produtos, preços, estoque e visibilidade no ecommerce.
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {paged.total === 1 ? '1 produto encontrado' : `${paged.total} produtos encontrados`}
            {hasAnyProduct && paged.total !== stats.total ? ` · ${stats.total} no total` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MoreActionsMenu currentQuery={currentQuery} />
          <Link href="/admin/produtos/novo" className="btn-primary">+ Novo produto</Link>
        </div>
      </div>

      {/* ─── Cards de resumo ─── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Cadastrados" value={stats.total} hint="Total no banco" />
        <StatCard label="Publicados" value={stats.published} hint="Aparecem na loja" tone={stats.published > 0 ? 'success' : undefined} />
        <StatCard label="Rascunhos" value={stats.draft} hint="Aguardando publicação" tone={stats.draft > 0 ? 'warning' : undefined} />
        <StatCard label="Sem estoque" value={stats.outOfStock} hint='Aparecem como "Sob consulta"' tone={stats.outOfStock > 0 ? 'warning' : undefined} />
        <StatCard label="Sem foto real" value={stats.noRealImage} hint="Usando placeholder padrão" tone={stats.noRealImage > 0 ? 'warning' : undefined} />
        <StatCard label="Em destaque" value={stats.featured} hint="Aparecem na vitrine" />
      </section>

      {/* ─── Abas rápidas ─── */}
      <section className="flex flex-wrap items-center gap-2 overflow-x-auto">
        {QUICK_TABS.map((t) => {
          const active = isTabActive(t, sp);
          // Preserva q/categoryId/sort/page ao trocar de aba; substitui os
          // filtros da aba anterior pelos da nova.
          const href = `/admin/produtos${buildQuery({
            q: sp.q,
            categoryId: sp.categoryId,
            sort: sort === 'recent' ? undefined : sort,
            ...t.params,
          })}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`badge ${active ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
            >
              {t.label} ({t.count(stats)})
            </Link>
          );
        })}
      </section>

      {/* ─── Filtros ─── */}
      <form
        method="get"
        action="/admin/produtos"
        className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="q" className="field-label">Buscar</label>
            <input id="q" name="q" defaultValue={sp.q || ''} placeholder="Nome, SKU ou slug" className="field-input h-10" />
          </div>
          <div>
            <label htmlFor="categoryId" className="field-label">Coleção</label>
            <select id="categoryId" name="categoryId" defaultValue={sp.categoryId || ''} className="field-input h-10">
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="field-label">Status</label>
            <select id="status" name="status" defaultValue={sp.status || ''} className="field-input h-10">
              <option value="">Todos</option>
              <option value="ACTIVE">Publicado</option>
              <option value="DRAFT">Rascunho</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>
          <div>
            <label htmlFor="stock" className="field-label">Estoque</label>
            <select id="stock" name="stock" defaultValue={stockFilter} className="field-input h-10">
              <option value="all">Todos</option>
              <option value="in-stock">Em estoque</option>
              <option value="out">Sem estoque</option>
            </select>
          </div>
          <div>
            <label htmlFor="image" className="field-label">Imagem</label>
            <select id="image" name="image" defaultValue={imageFilter} className="field-input h-10">
              <option value="all">Todos</option>
              <option value="no-real">Sem foto real</option>
            </select>
          </div>
          <div>
            <label htmlFor="featured" className="field-label">Destaque</label>
            <select id="featured" name="featured" defaultValue={featuredFilter} className="field-input h-10">
              <option value="all">Todos</option>
              <option value="yes">Em destaque</option>
            </select>
          </div>
          <div>
            <label htmlFor="offer" className="field-label">Oferta</label>
            <select id="offer" name="offer" defaultValue={offerFilter} className="field-input h-10">
              <option value="all">Todos</option>
              <option value="yes">Em oferta</option>
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
          <Link href="/admin/produtos" className="btn-ghost text-sm">Limpar filtros</Link>
        </div>
      </form>

      {/* ─── Empty states ─── */}
      {paged.items.length === 0 ? (
        hasAnyProduct ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhum produto encontrado com esses filtros.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Tente limpar os filtros ou alterar os critérios de busca.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <Link href="/admin/produtos" className="btn-outline">Limpar filtros</Link>
              <Link href="/admin/produtos" className="btn-primary">Ver todos os produtos</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhum produto cadastrado ainda.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Cadastre seu primeiro produto para começar a montar o catálogo da loja.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <Link href="/admin/produtos/novo" className="btn-primary">Cadastrar produto</Link>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Tabela + cards + barra em massa (client component) */}
          <ProductsSelectableList products={rows} />

          {/* Paginação */}
          {paged.totalPages > 1 && (
            <nav className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink-100 bg-white p-3 shadow-card">
              <p className="text-xs text-ink-500">
                Página {paged.page} de {paged.totalPages} · {paged.total} produtos
              </p>
              <div className="flex items-center gap-2">
                <PageLink
                  label="← Anterior"
                  disabled={paged.page <= 1}
                  href={`/admin/produtos${buildQuery({ ...preserveForPage, page: String(paged.page - 1) })}`}
                />
                <PageLink
                  label="Próxima →"
                  disabled={paged.page >= paged.totalPages}
                  href={`/admin/produtos${buildQuery({ ...preserveForPage, page: String(paged.page + 1) })}`}
                />
              </div>
            </nav>
          )}
        </>
      )}

      {!hasAnyFilter && paged.items.length > 0 && (
        <p className="text-xs text-ink-500">
          Prefira &quot;Desativar&quot; a &quot;Excluir&quot;: produtos desativados somem da loja mas o histórico é preservado.
        </p>
      )}
    </div>
  );
}

// ───────────────────────── componentes ─────────────────────────

const StatCard = ({
  label,
  value,
  hint,
  tone,
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
