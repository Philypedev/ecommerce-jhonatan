import { prisma } from '@/lib/prisma';
import type { Category } from './types';
import {
  getActiveProductsByCategoryId,
  type ProductWithRelations,
} from './products';

/**
 * O Prisma Client em runtime ignora colunas adicionadas via
 * `prisma db push --skip-generate`. Buscamos os campos extras via SQL raw e
 * mesclamos no resultado. Quando `npx prisma generate` rodar, esta
 * enriquecimento fica redundante mas inofensivo.
 */
type CategoryExtras = {
  id: string;
  longDescription: string;
  imageMobileUrl: string | null;
  showInMenu: boolean | number;
  showOnHome: boolean | number;
  showInFooter: boolean | number;
};

const enrich = async <T extends { id: string }>(rows: T[]): Promise<Category[]> => {
  if (rows.length === 0) return [] as Category[];
  const extras = await prisma.$queryRaw<CategoryExtras[]>`
    SELECT "id", "longDescription", "imageMobileUrl",
           "showInMenu", "showOnHome", "showInFooter"
    FROM "Category"
  `;
  const map = new Map(extras.map((e) => [e.id, e]));
  return rows.map((r) => {
    const ex = map.get(r.id);
    return {
      ...r,
      longDescription: ex?.longDescription ?? '',
      imageMobileUrl: ex?.imageMobileUrl ?? null,
      // SQLite retorna boolean como 0/1 — normalizamos.
      showInMenu: ex ? Boolean(ex.showInMenu) : true,
      showOnHome: ex ? Boolean(ex.showOnHome) : true,
      showInFooter: ex ? Boolean(ex.showInFooter) : true,
    } as unknown as Category;
  });
};

/**
 * Ordenação pública padrão: posição (asc) → nome (asc como desempate).
 * `highlight` deixou de participar da ordenação — antes ele forçava coleções
 * "estreladas" a subir e mascarava mudanças de posição feitas pelo admin.
 */
export const getPublicCategories = async (): Promise<Category[]> => {
  const rows = await prisma.category.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
  return enrich(rows);
};

/**
 * Renumera todas as coleções sequencialmente começando em 1, opcionalmente
 * inserindo `preferredId` na posição `preferredPos` (1-based) primeiro — as
 * demais escorregam de acordo.
 *
 * Exemplo:
 *   Antes: A(1) B(2) C(3)
 *   normalizeCategoryPositions('C', 1) → C(1) A(2) B(3)
 *
 * Idempotente: chamar sem args só renumera (útil após delete).
 */
export const normalizeCategoryPositions = async (
  preferredId: string | null = null,
  preferredPos: number | null = null,
): Promise<void> => {
  const all = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, position: true },
  });

  const ordered = [...all];
  if (preferredId && preferredPos !== null) {
    const idx = ordered.findIndex((c) => c.id === preferredId);
    if (idx >= 0) {
      const [item] = ordered.splice(idx, 1);
      const targetIdx = Math.max(0, Math.min(preferredPos - 1, ordered.length));
      ordered.splice(targetIdx, 0, item);
    }
  }

  // Só grava linhas cuja posição mudou — evita writes desnecessários.
  for (let i = 0; i < ordered.length; i++) {
    const desired = i + 1;
    if (ordered[i].position !== desired) {
      await prisma.category.update({
        where: { id: ordered[i].id },
        data: { position: desired },
      });
    }
  }
};

/**
 * Coleções ATIVAS que têm pelo menos 1 produto ACTIVE — usado como filtro
 * complementar no menu/footer/home. Sem esse filtro, o admin marcar
 * showInMenu=true numa coleção vazia deixaria o usuário clicar e cair em
 * página sem produtos (UX ruim). O admin ainda vê a coleção normalmente
 * em /admin/categorias com o badge "Sem produtos".
 */
const withActiveProducts = async (cats: Category[]): Promise<Category[]> => {
  if (cats.length === 0) return cats;
  const counts = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { status: 'ACTIVE', categoryId: { in: cats.map((c) => c.id) } },
    _count: { id: true },
  });
  const withProducts = new Set(counts.map((r) => r.categoryId!));
  return cats.filter((c) => withProducts.has(c.id));
};

export const getMenuCategories = async (): Promise<Category[]> => {
  const all = await getPublicCategories();
  return withActiveProducts(all.filter((c) => c.showInMenu));
};

export const getHomeCategories = async (): Promise<Category[]> => {
  const all = await getPublicCategories();
  return withActiveProducts(all.filter((c) => c.showOnHome));
};

export type HomeCollection = {
  category: Category;
  products: ProductWithRelations[];
};

/**
 * Vitrines Shopify-style da home — uma por coleção. Regra:
 *   - toda coleção `status='ACTIVE'` com >= 1 produto `status='ACTIVE'`
 *     dentro entra na home. `showOnHome` NÃO filtra: se o admin
 *     esqueceu de marcar mas a coleção tem produto ativo, ela ainda
 *     aparece.
 *   - `showOnHome=true` apenas PRIORIZA a ordem — vem antes das
 *     coleções sem o flag. Empate resolvido por `position ASC` (o
 *     `getPublicCategories` já retorna nessa ordem).
 *
 * Produtos de cada seção vêm por `getActiveProductsByCategoryId`, que
 * ordena `featured DESC, position ASC, updatedAt DESC`. Coleções vazias
 * somem (defesa em profundidade contra estado alterando entre queries).
 */
export const getHomeCollections = async (
  perCollectionLimit = 8,
): Promise<HomeCollection[]> => {
  const all = await getPublicCategories();
  const eligible = await withActiveProducts(all);
  const prioritized = [...eligible].sort((a, b) => {
    const aFlag = a.showOnHome ? 0 : 1;
    const bFlag = b.showOnHome ? 0 : 1;
    if (aFlag !== bFlag) return aFlag - bFlag;
    return 0;
  });
  const enriched = await Promise.all(
    prioritized.map(async (category) => ({
      category,
      products: await getActiveProductsByCategoryId(category.id, perCollectionLimit),
    })),
  );
  return enriched.filter((c) => c.products.length > 0);
};

export const getFooterCategories = async (): Promise<Category[]> => {
  const all = await getPublicCategories();
  return withActiveProducts(all.filter((c) => c.showInFooter));
};

export const getAllCategories = async (): Promise<Category[]> => {
  const rows = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
  return enrich(rows);
};

export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  const row = await prisma.category.findUnique({ where: { slug } });
  if (!row) return null;
  const [enriched] = await enrich([row]);
  return enriched ?? null;
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const row = await prisma.category.findUnique({ where: { id } });
  if (!row) return null;
  const [enriched] = await enrich([row]);
  return enriched ?? null;
};

// ─────────────────────── Admin: listagem paginada + stats ───────────────────────

/** Slugs de coleções que a loja trata como automáticas (regra dinâmica). */
const AUTOMATIC_CATEGORY_SLUGS = new Set(['ofertas']);

export type AdminCategoryVisibilityFilter =
  | 'all' | 'menu' | 'home' | 'footer' | 'hidden';
export type AdminCategoryProductsFilter =
  | 'all' | 'with-products' | 'without-products';
export type AdminCategorySort =
  | 'position' | 'name-asc' | 'recent' | 'products-desc' | 'products-asc';

export type AdminCategoryFilters = {
  q?: string;
  status?: string;
  visibility?: AdminCategoryVisibilityFilter;
  products?: AdminCategoryProductsFilter;
  sort?: AdminCategorySort;
  page?: number;
  pageSize?: number;
};

export type AdminCategoryRow = Category & {
  publishedProductCount: number;
  totalProductCount: number;
  isAutomatic: boolean;
};

export type AdminCategoriesStats = {
  total: number;
  active: number;
  inactive: number;
  inMenu: number;
  onHome: number;
  withoutPublishedProducts: number;
};

export type AdminCategoriesPage = {
  items: AdminCategoryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: AdminCategoriesStats;
};

/**
 * Uma única leitura do banco pra tudo: coleções + contagens + stats. A
 * escala de "coleções" costuma ser pequena (dezenas), então filtramos e
 * paginamos em memória. Isso evita raw SQL pra colunas showIn* (que ainda
 * não estão no Prisma client).
 */
export const getAdminCategoriesData = async (
  filters: AdminCategoryFilters,
): Promise<AdminCategoriesPage> => {
  const pageSize = filters.pageSize ?? 25;
  const page = Math.max(1, filters.page ?? 1);
  const sort = filters.sort ?? 'position';

  // 1. Puxa todas as categorias + enriquece campos extras.
  const rawRows = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });
  const enriched = await enrich(rawRows);

  // 2. Contagens por categoria (por status separadamente pra "sem publicados").
  const countsAll = await prisma.product.groupBy({
    by: ['categoryId'],
    _count: { id: true },
  });
  const countsPublished = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { status: 'ACTIVE' },
    _count: { id: true },
  });
  const totalByCat = new Map(countsAll.map((r) => [r.categoryId, r._count.id]));
  const pubByCat = new Map(countsPublished.map((r) => [r.categoryId, r._count.id]));

  // 3. Enriquece cada linha com contagens + flag "automática".
  const allRows: AdminCategoryRow[] = enriched.map((c) => ({
    ...c,
    publishedProductCount: pubByCat.get(c.id) ?? 0,
    totalProductCount: totalByCat.get(c.id) ?? 0,
    isAutomatic: AUTOMATIC_CATEGORY_SLUGS.has(c.slug),
  }));

  // 4. Stats — sempre calculadas sobre o conjunto TOTAL (ignora filtros da tab).
  const stats: AdminCategoriesStats = {
    total: allRows.length,
    active: allRows.filter((c) => c.status === 'ACTIVE').length,
    inactive: allRows.filter((c) => c.status === 'INACTIVE').length,
    inMenu: allRows.filter((c) => c.showInMenu).length,
    onHome: allRows.filter((c) => c.showOnHome).length,
    withoutPublishedProducts: allRows.filter(
      (c) => c.status === 'ACTIVE' && c.publishedProductCount === 0,
    ).length,
  };

  // 5. Aplica filtros.
  let filtered = allRows;
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }
  if (filters.status) filtered = filtered.filter((c) => c.status === filters.status);
  switch (filters.visibility) {
    case 'menu':   filtered = filtered.filter((c) => c.showInMenu); break;
    case 'home':   filtered = filtered.filter((c) => c.showOnHome); break;
    case 'footer': filtered = filtered.filter((c) => c.showInFooter); break;
    case 'hidden': filtered = filtered.filter((c) => !c.showInMenu && !c.showOnHome && !c.showInFooter); break;
    // 'all' ou undefined: nada
  }
  switch (filters.products) {
    case 'with-products':    filtered = filtered.filter((c) => c.publishedProductCount > 0); break;
    case 'without-products': filtered = filtered.filter((c) => c.publishedProductCount === 0); break;
  }

  // 6. Ordenação.
  const sortedItems = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'name-asc':      return a.name.localeCompare(b.name);
      case 'recent':        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case 'products-desc': return b.publishedProductCount - a.publishedProductCount;
      case 'products-asc':  return a.publishedProductCount - b.publishedProductCount;
      case 'position':
      default:              return (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name);
    }
  });

  // 7. Paginação.
  const total = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const items = sortedItems.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages, stats };
};
