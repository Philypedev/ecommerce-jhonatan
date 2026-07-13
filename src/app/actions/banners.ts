'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  homeBannerSchema,
  heroCarouselSettingsSchema,
  type HeroCarouselSettingsInput,
  type HomeBannerInput,
} from '@/lib/validation/schemas';
import {
  MAIN_CAROUSEL_MAX_ACTIVE,
  countActiveMainCarousel,
  normalizePositions,
} from '@/lib/db/banners';

const revalidatePublic = () => {
  revalidatePath('/');
  revalidatePath('/admin/banners');
};

const buildBaseData = (parsed: HomeBannerInput) => ({
  title: parsed.title,
  subtitle: parsed.subtitle,
  imageUrl: parsed.imageUrl,
  buttonText: parsed.buttonText,
  buttonLink: parsed.buttonLink,
  active: parsed.active,
  position: parsed.position,
});

const writeExtras = async (id: string, parsed: HomeBannerInput) => {
  await prisma.$executeRaw`
    UPDATE "HomeBanner"
    SET "internalName"    = ${parsed.internalName ?? ''},
        "imageMobileUrl"  = ${parsed.imageMobileUrl ?? null},
        "videoUrl"        = ${parsed.videoUrl ?? null},
        "videoMobileUrl"  = ${parsed.videoMobileUrl ?? null},
        "posterUrl"       = ${parsed.posterUrl ?? null},
        "mediaType"       = ${parsed.mediaType},
        "linkTarget"      = ${parsed.linkTarget},
        "placement"       = ${parsed.placement}
    WHERE "id" = ${id}
  `;
};

const getBannerPlacement = async (id: string): Promise<string | null> => {
  const rows = await prisma.$queryRaw<Array<{ placement: string | null }>>`
    SELECT "placement" FROM "HomeBanner" WHERE "id" = ${id}
  `;
  return rows[0]?.placement ?? null;
};

const assertMainCarouselCap = async (
  parsed: HomeBannerInput,
  excludeId?: string,
): Promise<void> => {
  if (parsed.placement !== 'main_carousel' || !parsed.active) return;
  const active = await countActiveMainCarousel(excludeId);
  if (active >= MAIN_CAROUSEL_MAX_ACTIVE) {
    throw new Error(
      `Você pode ter até ${MAIN_CAROUSEL_MAX_ACTIVE} banners ativos no carrossel principal. Desative outro banner do carrossel antes de ativar este.`,
    );
  }
};

const parseBanner = (input: HomeBannerInput): HomeBannerInput => {
  const result = homeBannerSchema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.errors[0]?.message ?? 'Dados do banner inválidos.');
  }
  return result.data;
};

export async function createBannerAction(input: HomeBannerInput) {
  await requireAdmin();
  const parsed = parseBanner(input);
  await assertMainCarouselCap(parsed);
  const created = await prisma.homeBanner.create({
    data: buildBaseData(parsed),
  });
  await writeExtras(created.id, parsed);
  // Após inserir, normaliza o placement pra garantir 1..N sequencial.
  await normalizePositions(parsed.placement, created.id, parsed.position);
  revalidatePublic();
}

export async function updateBannerAction(id: string, input: HomeBannerInput) {
  await requireAdmin();
  const parsed = parseBanner(input);
  await assertMainCarouselCap(parsed, id);
  const previousPlacement = await getBannerPlacement(id);

  await prisma.homeBanner.update({
    where: { id },
    data: buildBaseData(parsed),
  });
  await writeExtras(id, parsed);

  // Se o banner mudou de placement, o placement antigo fica com um "furo"
  // — precisa renormalizar. Depois normaliza o novo com o banner focado
  // no slot desejado.
  if (previousPlacement && previousPlacement !== parsed.placement) {
    await normalizePositions(previousPlacement);
  }
  await normalizePositions(parsed.placement, id, parsed.position);
  revalidatePublic();
}

export async function deleteBannerAction(id: string) {
  await requireAdmin();
  const placement = await getBannerPlacement(id);
  await prisma.homeBanner.delete({ where: { id } });
  if (placement) await normalizePositions(placement);
  revalidatePublic();
}

export async function toggleBannerAction(id: string) {
  await requireAdmin();
  const current = await prisma.homeBanner.findUnique({ where: { id } });
  if (!current) return;
  const nextActive = !current.active;

  if (nextActive) {
    const placement = (await getBannerPlacement(id)) ?? 'after_trust_bar';
    if (placement === 'main_carousel') {
      const active = await countActiveMainCarousel(id);
      if (active >= MAIN_CAROUSEL_MAX_ACTIVE) {
        throw new Error(
          `Você pode ter até ${MAIN_CAROUSEL_MAX_ACTIVE} banners ativos no carrossel principal.`,
        );
      }
    }
  }
  await prisma.homeBanner.update({ where: { id }, data: { active: nextActive } });
  revalidatePublic();
}

/**
 * Atualiza o intervalo (segundos) de troca automática do carrossel principal.
 */
export async function updateHeroCarouselIntervalAction(
  input: HeroCarouselSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = heroCarouselSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }
  await prisma.$executeRaw`
    UPDATE "StoreSettings"
    SET "heroCarouselIntervalSeconds" = ${parsed.data.intervalSeconds}
    WHERE "id" = 'singleton'
  `;
  revalidatePublic();
  return { ok: true };
}

/**
 * Move um banner para cima/baixo DENTRO do próprio placement e renormaliza.
 * Assim nunca sobra posição duplicada.
 */
export async function moveBannerAction(id: string, direction: 'up' | 'down') {
  await requireAdmin();
  const all = await prisma.homeBanner.findMany({ orderBy: { position: 'asc' } });
  const placements = await prisma.$queryRaw<Array<{ id: string; placement: string | null }>>`
    SELECT "id", "placement" FROM "HomeBanner"
  `;
  const placementById = new Map(placements.map((p) => [p.id, p.placement ?? 'after_trust_bar']));

  const current = all.find((b) => b.id === id);
  if (!current) return;
  const currentPlacement = placementById.get(current.id) ?? 'after_trust_bar';
  const sameGroup = all.filter((b) => placementById.get(b.id) === currentPlacement);
  const idxInGroup = sameGroup.findIndex((b) => b.id === id);
  const swap = direction === 'up' ? sameGroup[idxInGroup - 1] : sameGroup[idxInGroup + 1];
  if (!swap) return;

  await prisma.$transaction([
    prisma.homeBanner.update({ where: { id: current.id }, data: { position: swap.position } }),
    prisma.homeBanner.update({ where: { id: swap.id }, data: { position: current.position } }),
  ]);
  // Normalização defensiva (garante 1..N mesmo se por algum motivo a base
  // tiver banner com position estranha).
  await normalizePositions(currentPlacement);
  revalidatePublic();
}
