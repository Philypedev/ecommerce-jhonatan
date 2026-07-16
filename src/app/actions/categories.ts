'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { categorySchema, type CategoryInput } from '@/lib/validation/schemas';
import { slugify } from '@/lib/slug';
import { normalizeCategoryPositions } from '@/lib/db/categories';

const revalidateAll = () => {
  // Header/Footer/home dependem de getMenu/Footer/HomeCategories — layout
  // revalidation limpa isso; page revalidation dá conta das páginas de coleção.
  revalidatePath('/', 'layout');
  revalidatePath('/categoria/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/categorias');
};

const ensureUniqueSlug = async (
  baseSlug: string,
  excludeId?: string,
): Promise<string> => {
  let slug = baseSlug || 'categoria';
  let attempt = 1;
  while (true) {
    const exists = await prisma.category.findFirst({
      where: { slug, NOT: excludeId ? { id: excludeId } : undefined },
      select: { id: true },
    });
    if (!exists) return slug;
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
};

// Os campos abaixo foram adicionados via `db push --skip-generate` e ainda não
// estão nos tipos do Prisma client. Atualizamos via SQL parametrizado.
const writeExtras = async (id: string, parsed: CategoryInput) => {
  await prisma.$executeRaw`
    UPDATE "Category"
    SET "longDescription" = ${parsed.longDescription},
        "imageMobileUrl" = ${parsed.imageMobileUrl ?? null},
        "showInMenu" = ${parsed.showInMenu ? 1 : 0},
        "showOnHome" = ${parsed.showOnHome ? 1 : 0},
        "showInFooter" = ${parsed.showInFooter ? 1 : 0}
    WHERE "id" = ${id}
  `;
};

export async function createCategoryAction(input: CategoryInput) {
  await requireAdmin();
  const parsed = categorySchema.parse(input);
  parsed.slug = await ensureUniqueSlug(parsed.slug || slugify(parsed.name));

  const created = await prisma.category.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      icon: parsed.icon,
      imageUrl: parsed.imageUrl || null,
      status: parsed.status,
      // Guardamos posição temporariamente; normalize renumera todas em seguida.
      position: parsed.position,
      highlight: parsed.highlight,
      metaTitle: parsed.metaTitle || null,
      metaDescription: parsed.metaDescription || null,
    },
  });
  await writeExtras(created.id, parsed);

  // Normalização: se o admin escolheu posição 1, todas as outras descem;
  // se escolheu > total, cai no final; posição 0 é aceita e vira 1.
  await normalizeCategoryPositions(
    created.id,
    parsed.position > 0 ? parsed.position : 1,
  );

  revalidateAll();
  redirect('/admin/categorias');
}

export async function updateCategoryAction(id: string, input: CategoryInput) {
  await requireAdmin();
  const parsed = categorySchema.parse(input);
  parsed.slug = await ensureUniqueSlug(parsed.slug || slugify(parsed.name), id);

  await prisma.category.update({
    where: { id },
    data: {
      name: parsed.name,
      slug: parsed.slug,
      description: parsed.description,
      icon: parsed.icon,
      imageUrl: parsed.imageUrl || null,
      status: parsed.status,
      position: parsed.position,
      highlight: parsed.highlight,
      metaTitle: parsed.metaTitle || null,
      metaDescription: parsed.metaDescription || null,
    },
  });
  await writeExtras(id, parsed);

  await normalizeCategoryPositions(id, parsed.position > 0 ? parsed.position : 1);

  revalidateAll();
  redirect('/admin/categorias');
}

export async function deleteCategoryAction(id: string) {
  await requireAdmin();
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new Error(
      `Não é possível excluir: existem ${count} produto(s) nessa categoria. Mude-os de categoria antes.`,
    );
  }
  await prisma.category.delete({ where: { id } });
  // Renumera para evitar "buracos" na sequência após remoção.
  await normalizeCategoryPositions();
  revalidateAll();
}

// ─────────────────────────── ações em massa ───────────────────────────
//
// Todas exigem admin, aceitam ids não vazios (cap 200 — coleções não escalam
// que nem produtos), devolvem `{ ok, count }` para o toast do client.
// As colunas showIn* foram adicionadas via db push --skip-generate e ainda
// não estão no Prisma client; para elas usamos $executeRaw parametrizado
// dentro de $transaction.

const MAX_BULK_IDS = 200;

type BulkResult = { ok: true; count: number } | { ok: false; error: string };

const validateBulkIds = (ids: unknown): string[] | null => {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK_IDS) return null;
  const clean = ids.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return clean.length > 0 ? clean : null;
};

export async function bulkActivateCategoriesAction(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhuma coleção selecionada.' };
  const { count } = await prisma.category.updateMany({
    where: { id: { in: clean } },
    data: { status: 'ACTIVE' },
  });
  revalidateAll();
  return { ok: true, count };
}

export async function bulkDeactivateCategoriesAction(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhuma coleção selecionada.' };
  const { count } = await prisma.category.updateMany({
    where: { id: { in: clean } },
    data: { status: 'INACTIVE' },
  });
  revalidateAll();
  return { ok: true, count };
}

const bulkSetVisibility = async (
  ids: string[],
  column: 'showInMenu' | 'showOnHome' | 'showInFooter',
  value: boolean,
): Promise<number> => {
  const v = value ? 1 : 0;
  // Coluna hardcoded (não é entrada de usuário); ids são parametrizados.
  const updates = ids.map((id) => {
    if (column === 'showInMenu')
      return prisma.$executeRaw`UPDATE "Category" SET "showInMenu" = ${v} WHERE "id" = ${id}`;
    if (column === 'showOnHome')
      return prisma.$executeRaw`UPDATE "Category" SET "showOnHome" = ${v} WHERE "id" = ${id}`;
    return prisma.$executeRaw`UPDATE "Category" SET "showInFooter" = ${v} WHERE "id" = ${id}`;
  });
  const results = await prisma.$transaction(updates);
  return results.reduce((n, r) => n + Number(r), 0);
};

export async function bulkSetShowInMenuAction(
  ids: string[],
  value: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhuma coleção selecionada.' };
  const count = await bulkSetVisibility(clean, 'showInMenu', value);
  revalidateAll();
  return { ok: true, count };
}

export async function bulkSetShowOnHomeAction(
  ids: string[],
  value: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhuma coleção selecionada.' };
  const count = await bulkSetVisibility(clean, 'showOnHome', value);
  revalidateAll();
  return { ok: true, count };
}

export async function bulkSetShowInFooterAction(
  ids: string[],
  value: boolean,
): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhuma coleção selecionada.' };
  const count = await bulkSetVisibility(clean, 'showInFooter', value);
  revalidateAll();
  return { ok: true, count };
}

/**
 * Excluir em massa. Bloqueia se QUALQUER coleção selecionada tem produto
 * vinculado — mesma regra defensiva do delete singular.
 */
export async function bulkDeleteCategoriesAction(ids: string[]): Promise<BulkResult> {
  await requireAdmin();
  const clean = validateBulkIds(ids);
  if (!clean) return { ok: false, error: 'Nenhuma coleção selecionada.' };
  const withProducts = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { categoryId: { in: clean } },
    _count: { id: true },
  });
  if (withProducts.length > 0) {
    const totalProducts = withProducts.reduce((n, r) => n + r._count.id, 0);
    return {
      ok: false,
      error: `${withProducts.length} coleção(ões) selecionada(s) ainda têm ${totalProducts} produto(s). Mova os produtos antes de excluir.`,
    };
  }
  const { count } = await prisma.category.deleteMany({ where: { id: { in: clean } } });
  await normalizeCategoryPositions();
  revalidateAll();
  return { ok: true, count };
}
