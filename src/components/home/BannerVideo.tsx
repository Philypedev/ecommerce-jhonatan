'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  desktopSrc: string;
  mobileSrc?: string | null;
  poster?: string | null;
  title: string;
  /** true no primeiro banner acima da dobra; libera o carregamento na hora */
  eager?: boolean;
};

/**
 * Player de vídeo enxuto para banners:
 *  - preload="metadata" quando visível, "none" enquanto fora da viewport
 *  - autoplay + muted + loop + playsInline (padrão de banner promocional)
 *  - respeita prefers-reduced-motion: não força autoplay
 *  - fallback pra imagem em navegadores sem suporte (via <video poster>)
 *  - swap de src desktop/mobile via matchMedia — evita `<source media>` que
 *    o Chrome não reavalia em resize
 */
export const BannerVideo = ({
  desktopSrc,
  mobileSrc,
  poster,
  title,
  eager = false,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [inView, setInView] = useState(eager);
  const [src, setSrc] = useState(desktopSrc);

  // Escolhe fonte por breakpoint (mobile ≤ 640px). matchMedia + listener
  // funciona igual em Chrome/Safari sem trigger de layout.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const pick = () => setSrc(mq.matches && mobileSrc ? mobileSrc : desktopSrc);
    pick();
    mq.addEventListener('change', pick);
    return () => mq.removeEventListener('change', pick);
  }, [desktopSrc, mobileSrc]);

  // IntersectionObserver — só carrega metadata quando entra na viewport.
  useEffect(() => {
    if (eager) return;
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager]);

  // Autoplay respeitando prefers-reduced-motion.
  useEffect(() => {
    if (!inView) return;
    const el = videoRef.current;
    if (!el) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    el.play().catch(() => {
      /* silencioso — bloqueio de autoplay = usuário vê poster */
    });
  }, [inView, src]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      ref={videoRef}
      src={inView ? src : undefined}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload={inView ? 'metadata' : 'none'}
      aria-label={title}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
};
