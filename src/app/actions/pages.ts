'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { pageContentSchema, type PageContentInput } from '@/lib/validation/schemas';

const PUBLIC_SLUGS = new Set(['sobre', 'politicas', 'termos', 'faq', 'garantia']);

const revalidatePages = (slug?: string) => {
  if (slug && PUBLIC_SLUGS.has(slug)) revalidatePath(`/${slug}`);
  revalidatePath('/admin/paginas');
};

export async function updatePageContentAction(
  input: PageContentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = pageContentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }
  const { slug, ...rest } = parsed.data;
  await prisma.pageContent.upsert({
    where: { slug },
    update: {
      title: rest.title,
      content: rest.content,
      metaTitle: rest.metaTitle ?? null,
      metaDescription: rest.metaDescription ?? null,
    },
    create: {
      slug,
      title: rest.title,
      content: rest.content,
      metaTitle: rest.metaTitle ?? null,
      metaDescription: rest.metaDescription ?? null,
    },
  });
  revalidatePages(slug);
  return { ok: true };
}
