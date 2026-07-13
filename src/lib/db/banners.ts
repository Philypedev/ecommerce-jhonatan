import { prisma } from '@/lib/prisma';
import type { HomeBanner } from './types';

/**
 * Placements disponíveis para os banners na home. Ordem seguindo o layout
 * atual da página inicial pública.
 */
export const BANNER_PLACEMENTS = [
  // Slot especial: aparece no topo da home, logo abaixo do menu, como
  // carrossel principal (limitado a 3 banners ativos).
  { value: 'main_carousel',              label: 'Carrossel principal, topo da home' },
  { value: 'after_hero',                 label: 'Abaixo do carrossel principal' },
  { value: 'after_featured_products',    label: 'Abaixo dos produtos em destaque' },
  // Estes dois placements existem por compatibilidade com banners cadastrados
  // antes da remoção da seção "Explore por categoria" da home. Ambos renderizam
  // entre a vitrine de produtos e a seção "Como funciona".
  { value: 'after_trust_bar',            label: 'Depois da vitrine de produtos' },
  { value: 'after_featured_categories',  label: 'Antes da seção Como funciona' },
  { value: 'before_how_it_works',        label: 'Acima da seção Como funciona' },
  { value: 'before_trust_section',       label: 'Acima da seção Por que comprar' },
  { value: 'before_footer',              label: 'Acima do rodapé' },
] as const;

/** Limite máximo de banners ativos no carrossel principal da home. */
export const MAIN_CAROUSEL_MAX_ACTIVE = 3;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]['value'];

export const isValidPlacement = (v: string): v is BannerPlacement =>
  BANNER_PLACEMENTS.some((p) => p.value === v);

export const bannerPlacementLabel = (v: string): string =>
  BANNER_PLACEMENTS.find((p) => p.value === v)?.label ?? 'Posição desconhecida';

/**
 * Colunas adicionadas via `db push --skip-generate` (internalName, videoUrl,
 * videoMobileUrl, posterUrl, mediaType, linkTarget, placement) não vêm no
 * findMany do Prisma client até rodar `prisma generate`. Buscamos via raw
 * SQL e mesclamos. `imageMobileUrl` também segue este padrão.
 *
 * Após regenerar, essa mesclagem fica redundante mas inofensiva.
 */
type BannerExtras = {
  id: string;
  internalName: string | null;
  imageMobileUrl: string | null;
  videoUrl: string | null;
  videoMobileUrl: string | null;
  posterUrl: string | null;
  mediaType: string | null;
  linkTarget: string | null;
  placement: string | null;
};

const enrich = async (banners: Array<{ id: string }>): Promise<HomeBanner[]> => {
  if (banners.length === 0) return [] as HomeBanner[];
  const rows = await prisma.$queryRaw<BannerExtras[]>`
    SELECT "id", "internalName", "imageMobileUrl", "videoUrl", "videoMobileUrl",
           "posterUrl", "mediaType", "linkTarget", "placement"
    FROM "HomeBanner"
  `;
  const byId = new Map(rows.map((r) => [r.id, r]));
  return banners.map((b) => {
    const ex = byId.get(b.id);
    return {
      ...b,
      internalName: ex?.internalName ?? '',
      imageMobileUrl: ex?.imageMobileUrl ?? null,
      videoUrl: ex?.videoUrl ?? null,
      videoMobileUrl: ex?.videoMobileUrl ?? null,
      posterUrl: ex?.posterUrl ?? null,
      mediaType: (ex?.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE'),
      linkTarget: (ex?.linkTarget === '_blank' ? '_blank' : '_self'),
      placement: ex?.placement ?? 'after_trust_bar',
    };
  }) as unknown as HomeBanner[];
};

export const getActiveBanners = async (): Promise<HomeBanner[]> => {
  const banners = await prisma.homeBanner.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
  });
  return enrich(banners);
};

/**
 * Banners ativos agrupados por placement. Cada valor é a lista já ordenada
 * por `position`. Só entrega chaves com pelo menos 1 banner.
 */
export const getActiveBannersByPlacement = async (): Promise<
  Record<string, HomeBanner[]>
> => {
  const banners = await getActiveBanners();
  const map: Record<string, HomeBanner[]> = {};
  for (const b of banners) {
    const key = isValidPlacement(b.placement) ? b.placement : 'after_trust_bar';
    if (!map[key]) map[key] = [];
    map[key].push(b);
  }
  return map;
};

export const getAllBanners = async (): Promise<HomeBanner[]> => {
  const banners = await prisma.homeBanner.findMany({ orderBy: { position: 'asc' } });
  return enrich(banners);
};

export const getBannerById = async (id: string): Promise<HomeBanner | null> => {
  const banner = await prisma.homeBanner.findUnique({ where: { id } });
  if (!banner) return null;
  const enriched = await enrich([banner]);
  return enriched[0] ?? null;
};

/**
 * Reescreve as posições dos banners de UM placement como 1..N sequenciais,
 * eliminando duplicatas e furos.
 *
 * Se `focusedId` for informado, aquele banner é colocado explicitamente em
 * `focusedPosition` (clampado ao range válido) e os outros deslizam para
 * ocupar os slots ao redor. Ordem estável: banners sem foco preservam sua
 * ordem relativa por `position`, e como desempate `createdAt` asc.
 *
 * Segurança: usa 2 passos com offset alto (+1000) antes de renumerar para
 * evitar violar índice único caso `position` vire unique no futuro. Hoje
 * a coluna não é UNIQUE, mas o padrão fica seguro.
 */
export const normalizePositions = async (
  placement: string,
  focusedId?: string,
  focusedPosition?: number,
): Promise<void> => {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; position: number; createdAt: Date | string }>
  >`
    SELECT "id", "position", "createdAt" FROM "HomeBanner"
    WHERE "placement" = ${placement}
    ORDER BY "position" ASC, "createdAt" ASC
  `;

  if (rows.length === 0) return;

  const others = rows.filter((b) => b.id !== focusedId);
  const focused = rows.find((b) => b.id === focusedId);

  const ordered: Array<{ id: string }> = [];
  if (focused && typeof focusedPosition === 'number') {
    // Insere o focado no slot pedido (clampado). Outros deslizam.
    const idx = Math.max(0, Math.min(others.length, focusedPosition - 1));
    for (let i = 0; i < idx; i++) ordered.push(others[i]);
    ordered.push(focused);
    for (let i = idx; i < others.length; i++) ordered.push(others[i]);
  } else {
    // Sem foco explícito — mantém a ordem já sorted (position asc,
    // createdAt asc) e apenas renumera.
    for (const b of rows) ordered.push(b);
  }

  // Renumera em 2 passos pra evitar conflito temporário.
  await prisma.$transaction(
    ordered.map((b, i) =>
      prisma.homeBanner.update({
        where: { id: b.id },
        data: { position: i + 1 + 1000 },
      }),
    ),
  );
  await prisma.$transaction(
    ordered.map((b, i) =>
      prisma.homeBanner.update({
        where: { id: b.id },
        data: { position: i + 1 },
      }),
    ),
  );
};

/**
 * Conta banners ATIVOS no placement `main_carousel`. Usado para enforçar o
 * limite de 3 na admin action. `excludeId` ignora o próprio banner sendo
 * editado (evita falso-positivo em update).
 */
export const countActiveMainCarousel = async (excludeId?: string): Promise<number> => {
  const rows = excludeId
    ? await prisma.$queryRaw<Array<{ n: number | bigint }>>`
        SELECT COUNT(*) as n FROM "HomeBanner"
        WHERE "active" = 1 AND "placement" = 'main_carousel' AND "id" != ${excludeId}
      `
    : await prisma.$queryRaw<Array<{ n: number | bigint }>>`
        SELECT COUNT(*) as n FROM "HomeBanner"
        WHERE "active" = 1 AND "placement" = 'main_carousel'
      `;
  const n = rows[0]?.n ?? 0;
  return typeof n === 'bigint' ? Number(n) : Number(n);
};
