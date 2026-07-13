'use client';

import Image from 'next/image';
import { useTransition } from 'react';
import {
  deleteBannerAction,
  moveBannerAction,
  toggleBannerAction,
} from '@/app/actions/banners';
import { BannerFormDialog } from './BannerFormDialog';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toaster';
import { bannerPlacementLabel } from '@/lib/db/banners';

type Banner = {
  id: string;
  internalName: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageMobileUrl: string | null;
  videoUrl: string | null;
  videoMobileUrl: string | null;
  posterUrl: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
  buttonText: string;
  buttonLink: string;
  linkTarget: '_self' | '_blank';
  placement: string;
  active: boolean;
  position: number;
};

export const BannerRow = ({
  banner,
  isFirst,
  isLast,
}: {
  banner: Banner;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const remove = async () => {
    const ok = await confirm({
      title: 'Excluir banner?',
      description: `O banner "${banner.title}" será removido permanentemente da home. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir banner',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      try {
        await deleteBannerAction(banner.id);
        toast.success('Banner excluído.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
      }
    });
  };

  const isVideo = banner.mediaType === 'VIDEO';
  const smallBtn =
    'rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40';

  return (
    <li className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
      <div className="relative aspect-[16/7] w-full bg-ink-100">
        {/* Preview leve — vídeo com autoplay muted quando for VIDEO; senão imagem. */}
        {isVideo && banner.videoUrl ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={banner.videoUrl}
            poster={banner.posterUrl ?? banner.imageUrl}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Image
            src={banner.imageUrl}
            alt={banner.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}

        {/* Badges do topo-direito: status + tipo de mídia */}
        <div className="absolute right-3 top-3 flex flex-wrap gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              banner.active
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-ink-100 text-ink-700'
            }`}
          >
            {banner.active ? 'Ativo' : 'Inativo'}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isVideo ? 'bg-brand-900 text-white' : 'bg-white/90 text-ink-900'
            }`}
          >
            {isVideo ? 'Vídeo' : 'Imagem'}
          </span>
        </div>
      </div>

      <div className="p-4">
        {banner.internalName && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500 line-clamp-1">
            {banner.internalName}
          </p>
        )}
        <p className="text-base font-bold text-ink-900 line-clamp-1">{banner.title}</p>
        {banner.subtitle && (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{banner.subtitle}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-md bg-ink-100 px-2 py-0.5 font-semibold text-ink-700">
            {bannerPlacementLabel(banner.placement)}
          </span>
          <span className="text-ink-500">· Ordem {banner.position}</span>
          {banner.buttonLink && (
            <span className="truncate font-mono text-ink-500">
              · {banner.buttonLink}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <BannerFormDialog mode="edit" banner={banner} />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await toggleBannerAction(banner.id);
                  toast.success(banner.active ? 'Banner desativado.' : 'Banner ativado.');
                } catch (e) {
                  toast.error(
                    e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')
                      ? e.message
                      : 'Não foi possível alterar o status.',
                  );
                }
              })
            }
            className={`${smallBtn} border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100`}
          >
            {banner.active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            disabled={isFirst || pending}
            onClick={() =>
              start(async () => {
                try {
                  await moveBannerAction(banner.id, 'up');
                } catch (e) {
                  toast.error(
                    e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')
                      ? e.message
                      : 'Não foi possível mover o banner.',
                  );
                }
              })
            }
            className={`${smallBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}
            aria-label="Mover para cima"
          >
            Mover ↑
          </button>
          <button
            type="button"
            disabled={isLast || pending}
            onClick={() =>
              start(async () => {
                try {
                  await moveBannerAction(banner.id, 'down');
                } catch (e) {
                  toast.error(
                    e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')
                      ? e.message
                      : 'Não foi possível mover o banner.',
                  );
                }
              })
            }
            className={`${smallBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}
            aria-label="Mover para baixo"
          >
            Mover ↓
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className={`${smallBtn} ml-auto border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100`}
          >
            Excluir
          </button>
        </div>
      </div>
    </li>
  );
};
