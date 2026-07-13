import { prisma } from '@/lib/prisma';

/**
 * Auditoria de SEO — helpers que percorrem produtos ativos, coleções ativas
 * e páginas institucionais, identificando problemas reais (falta de
 * metaTitle/Description, títulos longos demais, imagens placeholder etc.).
 *
 * Tudo lido do banco. Zero mock. Se um item não tem SEO, ele APARECE aqui —
 * senão, some. É essa a garantia da tela /admin/seo.
 */

// Limites SEO — Google exibe até ~55–60 chars no título e ~155–160 na descrição.
export const SEO_TITLE_IDEAL = 60;
export const SEO_TITLE_MAX = 65; // acima disso, o Google trunca
export const SEO_DESC_IDEAL = 160;
export const SEO_DESC_MAX = 170;

export const SEO_TITLE_MIN = 25;
export const SEO_DESC_MIN = 60;

// Estado por campo — "ideal" | "ok" | "long" | "short" | "empty"
export type SeoFieldState = 'ideal' | 'ok' | 'long' | 'short' | 'empty';

export const titleState = (v: string | null | undefined): SeoFieldState => {
  const s = (v ?? '').trim();
  if (!s) return 'empty';
  const n = s.length;
  if (n > SEO_TITLE_MAX) return 'long';
  if (n < SEO_TITLE_MIN) return 'short';
  if (n <= SEO_TITLE_IDEAL) return 'ideal';
  return 'ok';
};

export const descState = (v: string | null | undefined): SeoFieldState => {
  const s = (v ?? '').trim();
  if (!s) return 'empty';
  const n = s.length;
  if (n > SEO_DESC_MAX) return 'long';
  if (n < SEO_DESC_MIN) return 'short';
  if (n <= SEO_DESC_IDEAL) return 'ideal';
  return 'ok';
};

const hasReal = (v: string | null | undefined) => !!(v ?? '').trim();

const isPlaceholderUrl = (url?: string | null) => !url || /placeholder/i.test(url);

// ────────────────────────── stats por tipo ──────────────────────────

export type SeoStats = {
  productsTotal: number;
  productsWithSeo: number;
  categoriesTotal: number;
  categoriesWithSeo: number;
  pagesTotal: number;
  pagesWithSeo: number;
};

/**
 * Um item "tem SEO" se possui metaTitle E metaDescription não vazios.
 * Não valida comprimento — só presença. Para "publicáveis" no dashboard.
 */
export const getSeoStats = async (): Promise<SeoStats> => {
  const [productsTotal, productsWithSeo, categoriesTotal, categoriesWithSeo, pages] =
    await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          metaTitle: { not: null },
          metaDescription: { not: null },
          NOT: [{ metaTitle: '' }, { metaDescription: '' }],
        },
      }),
      prisma.category.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count({
        where: {
          status: 'ACTIVE',
          metaTitle: { not: null },
          metaDescription: { not: null },
          NOT: [{ metaTitle: '' }, { metaDescription: '' }],
        },
      }),
      prisma.pageContent.findMany({
        select: { metaTitle: true, metaDescription: true },
      }),
    ]);

  const pagesTotal = pages.length;
  const pagesWithSeo = pages.filter(
    (p) => hasReal(p.metaTitle) && hasReal(p.metaDescription),
  ).length;

  return {
    productsTotal,
    productsWithSeo,
    categoriesTotal,
    categoriesWithSeo,
    pagesTotal,
    pagesWithSeo,
  };
};

// ─────────────────────────── lista de auditoria ───────────────────────────

export type SeoAuditIssueCode =
  | 'no-title'
  | 'no-description'
  | 'no-image'
  | 'title-long'
  | 'description-long';

export type SeoAuditIssue = {
  code: SeoAuditIssueCode;
  label: string;
  hint: string;
  tooltip: string;
};

export type SeoAuditItem = {
  type: 'product' | 'category' | 'page';
  id: string;
  name: string;
  slug: string;
  editHref: string;
  issues: SeoAuditIssue[];
};

const ISSUE_COPY: Record<SeoAuditIssueCode, { label: string; hint: string; tooltip: string }> = {
  'no-title': {
    label: 'Sem título SEO',
    hint: 'Esse texto ajuda o Google a entender a página.',
    tooltip: 'O título ajuda o Google a entender do que se trata a página.',
  },
  'no-description': {
    label: 'Sem descrição SEO',
    hint: 'Essa descrição aparece nos resultados de busca.',
    tooltip: 'A descrição ajuda a explicar a página nos resultados de busca.',
  },
  'no-image': {
    label: 'Sem imagem real',
    hint: 'Itens com imagem real ficam melhores ao compartilhar em WhatsApp e redes.',
    tooltip: 'Itens com imagem real ficam melhores na loja e também quando o link é compartilhado.',
  },
  'title-long': {
    label: 'Título SEO longo demais',
    hint: 'O Google costuma truncar títulos com mais de 65 caracteres.',
    tooltip: 'Títulos muito longos podem ser cortados pelo Google nos resultados de busca.',
  },
  'description-long': {
    label: 'Descrição SEO longa demais',
    hint: 'Descrições longas são cortadas nos resultados de busca.',
    tooltip: 'Descrições muito longas podem ser cortadas nos resultados de busca.',
  },
};

const buildIssue = (code: SeoAuditIssueCode): SeoAuditIssue => ({
  code,
  ...ISSUE_COPY[code],
});

/**
 * Percorre produtos ativos, coleções ativas e páginas institucionais e
 * agrupa os problemas POR entidade — cada item aparece uma vez com todas as
 * pendências dentro. Limite defensivo pra não estourar a UI se o catálogo
 * for muito grande.
 */
export const getSeoAuditItems = async (limit = 40): Promise<SeoAuditItem[]> => {
  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, name: true, slug: true,
        metaTitle: true, metaDescription: true,
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
      },
    }),
    prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true, name: true, slug: true,
        metaTitle: true, metaDescription: true,
        imageUrl: true,
      },
    }),
    prisma.pageContent.findMany({
      select: { id: true, slug: true, title: true, metaTitle: true, metaDescription: true },
    }),
  ]);

  const items: SeoAuditItem[] = [];

  for (const p of products) {
    const issues: SeoAuditIssue[] = [];
    const tState = titleState(p.metaTitle);
    const dState = descState(p.metaDescription);
    if (tState === 'empty') issues.push(buildIssue('no-title'));
    else if (tState === 'long') issues.push(buildIssue('title-long'));
    if (dState === 'empty') issues.push(buildIssue('no-description'));
    else if (dState === 'long') issues.push(buildIssue('description-long'));
    if (p.images.every((img) => isPlaceholderUrl(img.url))) issues.push(buildIssue('no-image'));
    if (issues.length > 0) {
      items.push({
        type: 'product', id: p.id, name: p.name, slug: p.slug,
        editHref: `/admin/produtos/${p.id}`,
        issues,
      });
    }
  }

  for (const c of categories) {
    const issues: SeoAuditIssue[] = [];
    const tState = titleState(c.metaTitle);
    const dState = descState(c.metaDescription);
    if (tState === 'empty') issues.push(buildIssue('no-title'));
    else if (tState === 'long') issues.push(buildIssue('title-long'));
    if (dState === 'empty') issues.push(buildIssue('no-description'));
    else if (dState === 'long') issues.push(buildIssue('description-long'));
    if (isPlaceholderUrl(c.imageUrl)) issues.push(buildIssue('no-image'));
    if (issues.length > 0) {
      items.push({
        type: 'category', id: c.id, name: c.name, slug: c.slug,
        editHref: `/admin/categorias`,
        issues,
      });
    }
  }

  for (const pg of pages) {
    const issues: SeoAuditIssue[] = [];
    if (titleState(pg.metaTitle) === 'empty') issues.push(buildIssue('no-title'));
    if (descState(pg.metaDescription) === 'empty') issues.push(buildIssue('no-description'));
    if (issues.length > 0) {
      items.push({
        type: 'page', id: pg.id, name: pg.title, slug: pg.slug,
        editHref: `/admin/paginas/${pg.slug}`,
        issues,
      });
    }
  }

  return items.slice(0, limit);
};
