'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  rotatingMessageSchema,
  storeSettingsSchema,
  homeContentSchema,
  paymentMethodsSchema,
  seoSettingsSchema,
  homeFeaturedCategorySchema,
  type StoreSettingsInput,
  type HomeContentInput,
  type PaymentMethodsInput,
  type SeoSettingsInput,
} from '@/lib/validation/schemas';
import { ALL_PAYMENT_METHODS, stringifyActivePaymentMethods, type PaymentMethodValue } from '@/lib/payments';
import { stringifyHomeContent } from '@/lib/homeContent';

const revalidateEverywhere = () => {
  revalidatePath('/', 'layout');
};

export async function updateStoreSettingsAction(
  input: StoreSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  // Separa o `logoSize` (campo novo) dos demais.
  // O Prisma client em runtime ainda não conhece `logoSize` (não foi regenerado
  // porque o dev server segura o DLL no Windows), então fazemos esse campo
  // separadamente via SQL parametrizado. Quando rodar `prisma generate`, essa
  // separação fica redundante mas não atrapalha.
  const { logoSize, ...rest } = parsed.data;
  await prisma.storeSettings.update({
    where: { id: 'singleton' },
    data: rest,
  });
  if (typeof logoSize === 'number') {
    await prisma.$executeRaw`UPDATE "StoreSettings" SET "logoSize" = ${logoSize} WHERE "id" = 'singleton'`;
  }

  revalidateEverywhere();
  return { ok: true };
}

export async function createRotatingMessageAction(text: string) {
  await requireAdmin();
  const parsed = rotatingMessageSchema.parse({ text, active: true, position: 0 });
  const last = await prisma.rotatingMessage.findFirst({ orderBy: { position: 'desc' } });
  await prisma.rotatingMessage.create({
    data: { text: parsed.text, active: true, position: (last?.position ?? -1) + 1 },
  });
  revalidateEverywhere();
}

export async function updateRotatingMessageAction(
  id: string,
  text: string,
  active: boolean,
) {
  await requireAdmin();
  await prisma.rotatingMessage.update({
    where: { id },
    data: { text, active },
  });
  revalidateEverywhere();
}

export async function deleteRotatingMessageAction(id: string) {
  await requireAdmin();
  await prisma.rotatingMessage.delete({ where: { id } });
  revalidateEverywhere();
}

export async function moveRotatingMessageAction(id: string, direction: 'up' | 'down') {
  await requireAdmin();
  const all = await prisma.rotatingMessage.findMany({ orderBy: { position: 'asc' } });
  const idx = all.findIndex((m) => m.id === id);
  if (idx < 0) return;
  const swapWith = direction === 'up' ? all[idx - 1] : all[idx + 1];
  if (!swapWith) return;
  const current = all[idx];
  await prisma.$transaction([
    prisma.rotatingMessage.update({ where: { id: current.id }, data: { position: swapWith.position } }),
    prisma.rotatingMessage.update({ where: { id: swapWith.id }, data: { position: current.position } }),
  ]);
  revalidateEverywhere();
}

/**
 * Define qual coleção alimenta a vitrine "Novidades para sua viagem" da home.
 * `null` / string vazia = nenhuma coleção → a vitrine some da página inicial.
 *
 * Só afeta essa vitrine — o restante da home (banners, categorias em destaque,
 * cards de confiança, etc.) permanece independente.
 */
export async function updateHomeFeaturedCategoryAction(input: {
  featuredCategoryId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = homeFeaturedCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }
  const value = parsed.data.featuredCategoryId; // já veio como string ou null

  // Se o admin escolheu uma coleção, valida que ela existe (evita id inválido
  // vindo de manipulação do form).
  if (value) {
    const exists = await prisma.category.findUnique({
      where: { id: value },
      select: { id: true },
    });
    if (!exists) {
      return { ok: false, error: 'Coleção selecionada não existe mais.' };
    }
  }

  await prisma.storeSettings.update({
    where: { id: 'singleton' },
    data: { featuredCategoryId: value },
  });
  revalidateEverywhere();
  return { ok: true };
}

export async function updateHomeContentAction(
  input: HomeContentInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = homeContentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }
  // homeContentJson é campo novo — mesma estratégia do logoSize.
  const json = stringifyHomeContent(parsed.data);
  await prisma.$executeRaw`UPDATE "StoreSettings" SET "homeContentJson" = ${json} WHERE "id" = 'singleton'`;
  revalidateEverywhere();
  return { ok: true };
}

/**
 * Atualiza somente os campos de SEO. `defaultOgImageUrl` e
 * `searchConsoleVerification` foram adicionados via `db push --skip-generate`
 * e ainda não estão no Prisma client (dev server segura o DLL). Escrevemos
 * via SQL parametrizado, mesmo padrão do `logoSize`/`homeContentJson`.
 */
export async function updateSeoSettingsAction(
  input: SeoSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = seoSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }
  const {
    defaultMetaTitle,
    defaultMetaDescription,
    defaultOgImageUrl,
    searchConsoleVerification,
  } = parsed.data;

  await prisma.storeSettings.update({
    where: { id: 'singleton' },
    data: { defaultMetaTitle, defaultMetaDescription },
  });
  await prisma.$executeRaw`
    UPDATE "StoreSettings"
    SET "defaultOgImageUrl" = ${defaultOgImageUrl ?? null},
        "searchConsoleVerification" = ${searchConsoleVerification ?? null}
    WHERE "id" = 'singleton'
  `;

  revalidateEverywhere();
  return { ok: true };
}

export async function updatePaymentMethodsAction(
  input: PaymentMethodsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = paymentMethodsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }
  const valid = ALL_PAYMENT_METHODS.map((m) => m.value);
  const active = parsed.data.methods.filter((m): m is PaymentMethodValue =>
    valid.includes(m as PaymentMethodValue),
  );
  if (active.length === 0) {
    return { ok: false, error: 'Selecione ao menos uma forma de pagamento' };
  }
  await prisma.storeSettings.update({
    where: { id: 'singleton' },
    data: { paymentMethodsJson: stringifyActivePaymentMethods(active) },
  });
  revalidateEverywhere();
  return { ok: true };
}
