import Link from 'next/link';
import { BannerVideo } from './BannerVideo';

export type BannerData = {
  id: string;
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
};

const BannerCard = ({ b, priority }: { b: BannerData; priority: boolean }) => {
  const isVideo = b.mediaType === 'VIDEO' && !!b.videoUrl;

  const media = isVideo ? (
    <BannerVideo
      desktopSrc={b.videoUrl as string}
      mobileSrc={b.videoMobileUrl}
      poster={b.posterUrl ?? b.imageMobileUrl ?? b.imageUrl}
      title={b.title}
      eager={priority}
    />
  ) : (
    <picture>
      {b.imageMobileUrl && (
        <source media="(max-width: 640px)" srcSet={b.imageMobileUrl} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.imageUrl}
        alt={b.title}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </picture>
  );

  const inner = (
    <article className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-ink-900 shadow-card transition-shadow hover:shadow-cardHover sm:aspect-[16/7]">
      {media}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent sm:from-black/70 sm:via-black/30"
      />
      <div className="absolute inset-0 flex flex-col justify-end gap-2 p-6 text-white sm:justify-center sm:p-10">
        <h3 className="max-w-md text-balance text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
          {b.title}
        </h3>
        {b.subtitle && (
          <p className="max-w-md text-balance text-sm text-white/90 md:text-base">
            {b.subtitle}
          </p>
        )}
        {b.buttonText && (
          <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-900 shadow-md transition-transform group-hover:translate-x-0.5">
            {b.buttonText} →
          </span>
        )}
      </div>
    </article>
  );

  if (!b.buttonLink) return inner;

  const isExternal = /^https?:\/\//.test(b.buttonLink);
  const target = b.linkTarget === '_blank' || isExternal ? '_blank' : undefined;

  if (isExternal || b.linkTarget === '_blank') {
    return (
      <a
        href={b.buttonLink}
        target={target}
        rel={target === '_blank' ? 'noreferrer' : undefined}
        aria-label={b.title}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={b.buttonLink} aria-label={b.title}>
      {inner}
    </Link>
  );
};

/**
 * Renderiza um grupo de banners de um mesmo placement. Usado múltiplas vezes
 * pela home pra cada posição escolhida no admin. Preserva o mesmo tamanho
 * visual do design original (aspect 16/7 desktop, 4/5 mobile).
 */
export const HomeBanners = ({
  banners,
  ariaLabel = 'Campanhas em destaque',
}: {
  banners: BannerData[];
  ariaLabel?: string;
}) => {
  if (banners.length === 0) return null;
  const isSingle = banners.length === 1;
  return (
    <section className="container-x py-10 md:py-14" aria-label={ariaLabel}>
      <div className={`grid gap-4 ${isSingle ? '' : 'md:grid-cols-2'}`}>
        {banners.map((b, i) => (
          <BannerCard key={b.id} b={b} priority={i === 0} />
        ))}
      </div>
    </section>
  );
};
