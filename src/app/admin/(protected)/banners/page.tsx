import Link from 'next/link';
import {
  BANNER_PLACEMENTS,
  MAIN_CAROUSEL_MAX_ACTIVE,
  bannerPlacementLabel,
  getAllBanners,
} from '@/lib/db/banners';
import { getStoreSettings } from '@/lib/db/settings';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { BannerRow } from './BannerRow';
import { BannerFormDialog } from './BannerFormDialog';
import { CarouselIntervalForm } from './CarouselIntervalForm';

export const dynamic = 'force-dynamic';

type SearchParams = {
  status?: string;   // 'ACTIVE' | 'INACTIVE'
  media?: string;    // 'IMAGE' | 'VIDEO'
  placement?: string;
};

const buildQuery = (params: Record<string, string | undefined | null>): string => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const [all, settings] = await Promise.all([getAllBanners(), getStoreSettings()]);
  const mainCarouselActive = all.filter(
    (b) => b.active && b.placement === 'main_carousel',
  ).length;
  const mainCarouselFull = mainCarouselActive >= MAIN_CAROUSEL_MAX_ACTIVE;

  const statusFilter = sp.status;
  const mediaFilter = sp.media;
  const placementFilter = sp.placement;

  // Filtragem
  let filtered = all;
  if (statusFilter === 'ACTIVE') filtered = filtered.filter((b) => b.active);
  else if (statusFilter === 'INACTIVE') filtered = filtered.filter((b) => !b.active);
  if (mediaFilter === 'IMAGE') filtered = filtered.filter((b) => b.mediaType !== 'VIDEO');
  else if (mediaFilter === 'VIDEO') filtered = filtered.filter((b) => b.mediaType === 'VIDEO');
  if (placementFilter) filtered = filtered.filter((b) => b.placement === placementFilter);

  // Estatísticas (total real do banco, não filtrado)
  const totals = {
    total: all.length,
    active: all.filter((b) => b.active).length,
    inactive: all.filter((b) => !b.active).length,
    image: all.filter((b) => b.mediaType !== 'VIDEO').length,
    video: all.filter((b) => b.mediaType === 'VIDEO').length,
  };

  const lastPosition = all.reduce((acc, b) => Math.max(acc, b.position), -1);
  const hasAnyBanner = all.length > 0;
  const hasAnyFilter = Boolean(statusFilter || mediaFilter || placementFilter);

  // Chave para next position dentro do grupo — para novos banners entrarem
  // ao final do placement selecionado no filtro (ou ao final geral).
  const nextPosition = lastPosition + 1;

  return (
    <div className="space-y-6">
      {/* ─── Cabeçalho ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
            Banners da home
            <HelpTooltip label="Banners">
              Banners aparecem em várias posições da home. O placement especial <strong>Carrossel principal</strong> controla o primeiro banner grande, logo abaixo do menu, com até 3 imagens ou vídeos misturados.
            </HelpTooltip>
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Configure banners de imagem ou vídeo para exibir campanhas e destaques em diferentes seções da página inicial.
          </p>
        </div>
        <BannerFormDialog mode="new" nextPosition={nextPosition} />
      </div>

      {/* ─── Configuração do carrossel principal ─── */}
      <CarouselIntervalForm initialSeconds={settings.heroCarouselIntervalSeconds} />

      {/* Alerta amigável quando o cap de 3 está cheio */}
      {mainCarouselFull && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            Carrossel principal cheio ({MAIN_CAROUSEL_MAX_ACTIVE} banners ativos).
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Você pode ter até {MAIN_CAROUSEL_MAX_ACTIVE} banners ativos no carrossel principal. Desative um dos ativos para poder ativar outro no lugar.
          </p>
        </div>
      )}

      {/* ─── Cards de resumo ─── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total"    value={totals.total} />
        <StatCard label="Ativos"   value={totals.active}   tone={totals.active > 0 ? 'success' : undefined} />
        <StatCard label="Inativos" value={totals.inactive} tone={totals.inactive > 0 ? 'warning' : undefined} />
        <StatCard label="Imagem"   value={totals.image} />
        <StatCard label="Vídeo"    value={totals.video} />
      </section>

      {/* ─── Filtros ─── */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Filtrar:</span>
        <ChipLink label="Todos" href={`/admin/banners`} active={!hasAnyFilter} />
        <ChipLink label="Ativos"   href={`/admin/banners${buildQuery({ ...sp, status: 'ACTIVE' })}`}   active={statusFilter === 'ACTIVE'} />
        <ChipLink label="Inativos" href={`/admin/banners${buildQuery({ ...sp, status: 'INACTIVE' })}`} active={statusFilter === 'INACTIVE'} />
        <ChipLink label="Imagem"   href={`/admin/banners${buildQuery({ ...sp, media: 'IMAGE' })}`}    active={mediaFilter === 'IMAGE'} />
        <ChipLink label="Vídeo"    href={`/admin/banners${buildQuery({ ...sp, media: 'VIDEO' })}`}    active={mediaFilter === 'VIDEO'} />

        <span className="ml-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Posição:</span>
        <ChipLink label="Todas" href={`/admin/banners${buildQuery({ status: sp.status, media: sp.media })}`} active={!placementFilter} />
        {BANNER_PLACEMENTS.map((p) => (
          <ChipLink
            key={p.value}
            label={p.label}
            href={`/admin/banners${buildQuery({ ...sp, placement: p.value })}`}
            active={placementFilter === p.value}
          />
        ))}
      </section>

      {/* ─── Empty states ─── */}
      {filtered.length === 0 ? (
        hasAnyBanner ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhum banner encontrado com esses filtros.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Tente limpar os filtros ou alterar os critérios de busca.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <Link href="/admin/banners" className="btn-outline">Limpar filtros</Link>
              <Link href="/admin/banners" className="btn-primary">Ver todos os banners</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhum banner cadastrado ainda.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Crie banners para destacar campanhas, ofertas e mensagens importantes na página inicial.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              {/* Mesmo trigger e mesmo modal do botão do topo — evita
                  qualquer divergência de defaults ou visual. */}
              <BannerFormDialog mode="new" nextPosition={nextPosition} />
            </div>
          </div>
        )
      ) : (
        <>
          {/* Agrupamos por placement para (a) mostrar cada grupo separado com
              cabeçalho e contagem, e (b) computar isFirst/isLast DENTRO do
              grupo — se calcular pelo array `filtered` inteiro, os banners de
              placements diferentes se atrapalham e "Mover" não funciona. */}
          {(() => {
            const groups = BANNER_PLACEMENTS
              .map((p) => ({
                placement: p.value,
                label: p.label,
                banners: filtered
                  .filter((b) => b.placement === p.value)
                  .sort((a, b) => a.position - b.position),
              }))
              .filter((g) => g.banners.length > 0);

            return (
              <div className="space-y-8">
                {groups.map(({ placement, label, banners }) => (
                  <section key={placement} className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                        {label}
                      </h2>
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-700">
                        {banners.length} {banners.length === 1 ? 'banner' : 'banners'}
                      </span>
                    </div>
                    <ul className="grid gap-4 md:grid-cols-2">
                      {banners.map((b, i) => (
                        <BannerRow
                          key={b.id}
                          banner={b}
                          isFirst={i === 0}
                          isLast={i === banners.length - 1}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ───────────────────────── componentes ─────────────────────────

const StatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'success' | 'warning';
}) => (
  <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {tone === 'success' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />}
      {tone === 'warning' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
      {label}
    </p>
    <p className="mt-1 text-2xl font-extrabold text-ink-900">{value}</p>
  </div>
);

const ChipLink = ({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) => (
  <Link
    href={href}
    className={`badge ${active ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
  >
    {label}
  </Link>
);
