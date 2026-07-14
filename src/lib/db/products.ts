import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Hidrata TUDO que a PDP e o admin edit precisam. Listagens (categoria, busca,
// destaques) tolerariam um include menor, mas em SQLite as três queries extras
// de variações são desprezíveis e simplificam o tipo compartilhado.
const fullInclude = {
  images: { orderBy: { position: 'asc' } },
  specifications: { orderBy: { position: 'asc' } },
  faq: { orderBy: { position: 'asc' } },
  benefits: { orderBy: { position: 'asc' } },
  category: true,
  variantOptions: {
    orderBy: { position: 'asc' as const },
    include: { values: { orderBy: { position: 'asc' as const } } },
  },
  variants: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof fullInclude }>;

/**
 * Anexa `imageUrl` (raw SQL) aos `ProductVariantValue` retornados pelo Prisma.
 * O Prisma client atual ainda não conhece essa coluna (regenerate travado pela
 * DLL no Windows), então cada loader que precisa da PDP chama esse helper.
 *
 * Custo: 1 query extra por chamada, mesmo para dezenas de produtos — usamos
 * um único IN(cuid...) sobre a tabela.
 */
const attachValueImages = async (products: ProductWithRelations[]): Promise<void> => {
  const productIds = products.map((p) => p.id);
  if (productIds.length === 0) return;
  const rows = await prisma.$queryRaw<Array<{ id: string; imageUrl: string | null }>>`
    SELECT vv.id, vv.imageUrl
    FROM ProductVariantValue vv
    JOIN ProductVariantOption vo ON vo.id = vv.optionId
    WHERE vo.productId IN (${Prisma.join(productIds)})
  `;
  const byId = new Map(rows.map((r) => [r.id, r.imageUrl]));
  for (const p of products) {
    for (const opt of p.variantOptions) {
      for (const v of opt.values) {
        (v as { imageUrl?: string | null }).imageUrl = byId.get(v.id) ?? null;
      }
    }
  }
};

const attachOne = async (product: ProductWithRelations | null): Promise<void> => {
  if (product) await attachValueImages([product]);
};

/**
 * Vitrine "Novidades para sua viagem" da home.
 *
 * REGRA (estrita — sem fallback): só entram produtos que atendem AS TRÊS
 * condições ao mesmo tempo:
 *   - `status = 'ACTIVE'` (publicação está ligada)
 *   - `featured = true` (checkbox "Destacar na home" está marcado)
 *   - `categoryId = featuredCategoryId` (coleção configurada em
 *     StoreSettings.featuredCategoryId — escolhida no admin em
 *     /admin/conteudo-home)
 *
 * Se `featuredCategoryId` for null (admin não escolheu coleção) OU nenhum
 * produto satisfaz as 3 regras, devolve `[]` e o `<FeaturedProducts>`
 * renderiza null (a seção some). NUNCA completamos com produtos não
 * destacados ou de outra coleção — as três regras são independentes e
 * cumulativas.
 *
 * Parâmetros:
 *   `featuredCategoryId`: injetado pela home page (que já lê StoreSettings)
 *     — mantém esta função pura/testável sem hard-dep de settings.
 */
export const getFeaturedProducts = async (
  featuredCategoryId: string | null,
  limit = 8,
): Promise<ProductWithRelations[]> => {
  if (!featuredCategoryId) return [];

  const items = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      featured: true,
      categoryId: featuredCategoryId,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: fullInclude,
  });
  await attachValueImages(items);
  return items;
};

export const getActiveProducts = async (): Promise<ProductWithRelations[]> =>
  prisma.product.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { updatedAt: 'desc' },
    include: fullInclude,
  });

export const getProductsByCategory = async (
  categorySlug: string,
): Promise<ProductWithRelations[]> =>
  prisma.product.findMany({
    where: { status: 'ACTIVE', category: { slug: categorySlug } },
    orderBy: { updatedAt: 'desc' },
    include: fullInclude,
  });

/** Para a página /categoria/ofertas: traz produtos com oldPrice > price. */
export const getDiscountedProducts = async (): Promise<ProductWithRelations[]> => {
  const all = await getActiveProducts();
  return all.filter((p) => p.oldPrice && p.oldPrice > p.price);
};

export const getProductBySlug = async (
  slug: string,
): Promise<ProductWithRelations | null> => {
  const p = await prisma.product.findFirst({
    where: { slug, status: { not: 'INACTIVE' } },
    include: fullInclude,
  });
  await attachOne(p);
  return p;
};

export const getProductById = async (
  id: string,
): Promise<ProductWithRelations | null> => {
  const p = await prisma.product.findUnique({ where: { id }, include: fullInclude });
  await attachOne(p);
  return p;
};

/** Relacionados: mesma categoria, exceto o próprio. */
export const getRelatedProducts = async (
  product: ProductWithRelations,
  limit = 4,
): Promise<ProductWithRelations[]> =>
  prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    take: limit,
    orderBy: { updatedAt: 'desc' },
    include: fullInclude,
  });

export type ProductSort = 'recent' | 'price-asc' | 'price-desc' | 'featured' | 'manual';

export type ProductFilters = {
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  onlyAvailable?: boolean;
  onlyOffers?: boolean;
  onlyFeatured?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

const orderByForSort = (sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] => {
  switch (sort) {
    case 'price-asc':
      return [{ price: 'asc' }, { updatedAt: 'desc' }];
    case 'price-desc':
      return [{ price: 'desc' }, { updatedAt: 'desc' }];
    case 'featured':
      return [{ featured: 'desc' }, { updatedAt: 'desc' }];
    case 'manual':
      // O Prisma client ainda não conhece a coluna `position` (db push sem
      // generate). A ordenação manual é feita em memória depois do findMany —
      // aqui só damos um critério razoável para o caso de fallback.
      return [{ updatedAt: 'desc' }];
    case 'recent':
    default:
      return [{ updatedAt: 'desc' }];
  }
};

/** Busca `position` por id via SQL raw (coluna nova ainda não no Prisma client). */
const fetchProductPositions = async (ids: string[]): Promise<Map<string, number>> => {
  if (ids.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ id: string; position: number }>>`
    SELECT "id", "position" FROM "Product"
  `;
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.id, r.position ?? 0);
  return map;
};

const buildProductWhere = (
  base: Prisma.ProductWhereInput,
  f: ProductFilters,
): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = { ...base };
  if (typeof f.minPrice === 'number' || typeof f.maxPrice === 'number') {
    where.price = {};
    if (typeof f.minPrice === 'number') (where.price as Prisma.FloatFilter).gte = f.minPrice;
    if (typeof f.maxPrice === 'number') (where.price as Prisma.FloatFilter).lte = f.maxPrice;
  }
  if (f.brand) where.brand = { contains: f.brand };
  if (f.onlyAvailable) where.stock = { gt: 0 };
  if (f.onlyOffers) where.oldPrice = { not: null };
  if (f.onlyFeatured) where.featured = true;
  return where;
};

export type PaginatedProducts = {
  items: ProductWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Lista paginada e filtrada para a categoria.
 * "onlyOffers" usa um filtro DB grosseiro (oldPrice not null) e refina em memória
 * para `oldPrice > price`. Isso reduz drasticamente o conjunto antes de paginar
 * sem precisar de raw SQL.
 */
export const listCategoryProducts = async (
  categorySlug: string,
  filters: ProductFilters = {},
): Promise<PaginatedProducts> => {
  const pageSize = filters.pageSize ?? 12;
  const page = Math.max(1, filters.page ?? 1);
  const sort = filters.sort ?? 'recent';

  const baseWhere: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
    ...(categorySlug === 'ofertas'
      ? { oldPrice: { not: null } }
      : { category: { slug: categorySlug } }),
  };

  const where = buildProductWhere(baseWhere, filters);
  const orderBy = orderByForSort(sort);

  if (filters.onlyOffers) {
    // Trazemos tudo, refinamos em JS para `oldPrice > price` e paginamos manualmente.
    const all = await prisma.product.findMany({ where, orderBy, include: fullInclude });
    const refined = all.filter((p) => p.oldPrice !== null && (p.oldPrice ?? 0) > p.price);
    const total = refined.length;
    const start = (page - 1) * pageSize;
    return {
      items: refined.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  if (sort === 'manual') {
    // Ordenação manual via coluna `position` (que o Prisma client ainda não
    // conhece). Buscamos tudo, ordenamos em JS e paginamos.
    const all = await prisma.product.findMany({ where, include: fullInclude });
    const positions = await fetchProductPositions(all.map((p) => p.id));
    const sorted = [...all].sort((a, b) => {
      const pa = positions.get(a.id) ?? 0;
      const pb = positions.get(b.id) ?? 0;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      include: fullInclude,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

/** Lista produtos de uma categoria para o admin (independente de status). */
export const listProductsByCategoryAdmin = async (categoryId: string) =>
  prisma.product.findMany({
    where: { categoryId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      price: true,
      stock: true,
      status: true,
      featured: true,
    },
  });

/** Marcas distintas para o filtro de marca de uma categoria. */
export const getBrandsInCategory = async (categorySlug: string): Promise<string[]> => {
  const where: Prisma.ProductWhereInput =
    categorySlug === 'ofertas'
      ? { status: 'ACTIVE', oldPrice: { not: null } }
      : { status: 'ACTIVE', category: { slug: categorySlug } };

  const rows = await prisma.product.findMany({
    where,
    select: { brand: true },
    distinct: ['brand'],
  });
  return rows.map((r) => r.brand).filter((b) => b && b.trim().length > 0);
};

/**
 * Busca pública para a página /busca. SQLite faz LIKE case-insensitive em
 * ASCII por padrão, então não precisamos de mode:'insensitive' (que aliás
 * não é suportado em SQLite via Prisma).
 */
export const searchProducts = async (
  q: string,
  sort: ProductSort = 'featured',
): Promise<ProductWithRelations[]> => {
  const query = q.trim();
  if (query.length < 2) return [];

  return prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: query } },
        { sku: { contains: query } },
        { brand: { contains: query } },
        { shortDescription: { contains: query } },
        { category: { name: { contains: query } } },
      ],
    },
    orderBy: orderByForSort(sort),
    take: 60,
    include: fullInclude,
  });
};

export const getAllProductsAdmin = async (search?: string, categoryId?: string, status?: string) =>
  prisma.product.findMany({
    where: {
      AND: [
        search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
                { slug: { contains: search } },
              ],
            }
          : {},
        categoryId ? { categoryId } : {},
        status ? { status } : {},
      ],
    },
    orderBy: { updatedAt: 'desc' },
    include: { category: true, images: { orderBy: { position: 'asc' }, take: 1 } },
  });

// ─────────────────────── Admin: listagem paginada ───────────────────────

export type AdminProductStockFilter = 'all' | 'in-stock' | 'out';
export type AdminProductImageFilter = 'all' | 'no-real';
export type AdminProductBoolFilter = 'all' | 'yes';
export type AdminProductSort =
  | 'recent'
  | 'name-asc'
  | 'price-asc'
  | 'price-desc'
  | 'stock-asc'
  | 'stock-desc';

export type AdminProductFilters = {
  q?: string;
  categoryId?: string;
  status?: string;
  stock?: AdminProductStockFilter;
  image?: AdminProductImageFilter;
  featured?: AdminProductBoolFilter;
  offer?: AdminProductBoolFilter;
  sort?: AdminProductSort;
  page?: number;
  pageSize?: number;
};

const adminInclude = {
  category: true,
  images: { orderBy: { position: 'asc' } as const, take: 3 },
  _count: { select: { variants: true } },
} satisfies Prisma.ProductInclude;

export type AdminProductRow = Prisma.ProductGetPayload<{ include: typeof adminInclude }>;

const buildAdminWhere = (f: AdminProductFilters): Prisma.ProductWhereInput => {
  const AND: Prisma.ProductWhereInput[] = [];
  if (f.q) {
    AND.push({
      OR: [
        { name: { contains: f.q } },
        { sku: { contains: f.q } },
        { slug: { contains: f.q } },
      ],
    });
  }
  if (f.categoryId) AND.push({ categoryId: f.categoryId });
  if (f.status) AND.push({ status: f.status });
  if (f.stock === 'in-stock') AND.push({ stock: { gt: 0 } });
  if (f.stock === 'out') AND.push({ stock: { lte: 0 } });
  if (f.featured === 'yes') AND.push({ featured: true });
  if (f.offer === 'yes') AND.push({ oldPrice: { not: null } });
  if (f.image === 'no-real') {
    // "Sem foto real" — nenhuma imagem cujo URL não contenha 'placeholder'.
    // Cobre também produtos sem nenhuma imagem.
    AND.push({
      NOT: { images: { some: { url: { not: { contains: 'placeholder' } } } } },
    });
  }
  return AND.length > 0 ? { AND } : {};
};

const adminOrderBy = (
  sort: AdminProductSort,
): Prisma.ProductOrderByWithRelationInput[] => {
  switch (sort) {
    case 'name-asc':   return [{ name: 'asc' }];
    case 'price-asc':  return [{ price: 'asc' }, { updatedAt: 'desc' }];
    case 'price-desc': return [{ price: 'desc' }, { updatedAt: 'desc' }];
    case 'stock-asc':  return [{ stock: 'asc' }, { updatedAt: 'desc' }];
    case 'stock-desc': return [{ stock: 'desc' }, { updatedAt: 'desc' }];
    case 'recent':
    default:           return [{ updatedAt: 'desc' }];
  }
};

export type PaginatedAdminProducts = {
  items: AdminProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const listAdminProducts = async (
  filters: AdminProductFilters = {},
): Promise<PaginatedAdminProducts> => {
  const pageSize = filters.pageSize ?? 25;
  const page = Math.max(1, filters.page ?? 1);
  const sort = filters.sort ?? 'recent';
  const where = buildAdminWhere(filters);
  const orderBy = adminOrderBy(sort);
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      include: adminInclude,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

/**
 * Estatísticas do catálogo — cards de topo da listagem admin. Tudo do banco,
 * sem mock. "Sem foto real" e "Sem estoque" só contam produtos ACTIVE, porque
 * é a visibilidade que impacta o cliente final.
 */
export const getAdminProductStats = async (): Promise<{
  total: number;
  published: number;
  draft: number;
  outOfStock: number;
  noRealImage: number;
  featured: number;
  inOffer: number;
}> => {
  const [total, published, draft, outOfStock, noRealImage, featured, inOffer] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'DRAFT' } }),
    prisma.product.count({ where: { status: 'ACTIVE', stock: { lte: 0 } } }),
    prisma.product.count({
      where: {
        status: 'ACTIVE',
        NOT: { images: { some: { url: { not: { contains: 'placeholder' } } } } },
      },
    }),
    prisma.product.count({ where: { featured: true } }),
    prisma.product.count({ where: { oldPrice: { not: null } } }),
  ]);
  return { total, published, draft, outOfStock, noRealImage, featured, inOffer };
};
