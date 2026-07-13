'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight } from '@/components/ui/Icon';
import type { BannerData } from './HomeBanners';

type Props = {
  slides: BannerData[];
  intervalMs: number;
};

// Fallback máximo pra segurança quando vídeo não dispara `ended` (falha
// de rede, codec incompatível etc). Nunca segura mais que isso.
const VIDEO_SAFETY_MS = 60_000;

/**
 * Carrossel principal da home (substitui o hero clássico).
 *
 *  - autoplay:
 *      • imagem → avança após `intervalMs` (2..10s configurado no painel)
 *      • vídeo  → avança QUANDO O VÍDEO TERMINA (evento `ended`).
 *                 Sem loop. Se `ended` falhar por algum motivo, um safety
 *                 timeout de 60s garante que não trava.
 *  - hover: 100% neutro. Não pausa nem reinicia nada.
 *  - vídeo ativo: preload="auto", autoPlay quando primeiro slide.
 *    Vídeo inativo: preload="none" pra não pesar a home.
 *  - barrinha ativa: progresso acompanha a duração do slide real.
 *      • imagem → intervalMs
 *      • vídeo  → duração real via `onLoadedMetadata`
 *  - setas / barrinhas: só se > 1 slide.
 *  - respeita prefers-reduced-motion.
 */
export const HomeHeroCarousel = ({ slides, intervalMs }: Props) => {
  const count = slides.length;
  const multi = count > 1;

  const [current, setCurrent] = useState(0);
  const [reduced, setReduced] = useState(false);
  // Duração do slide ATUAL em ms (imagem = intervalMs, vídeo = real).
  // Recomputada em toda troca de slide.
  const [progressMs, setProgressMs] = useState<number>(intervalMs);
  const videosRef = useRef<Array<HTMLVideoElement | null>>([]);

  const activeSlide = slides[current];
  const isActiveVideo =
    !!activeSlide && activeSlide.mediaType === 'VIDEO' && !!activeSlide.videoUrl;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const autoplay = multi && !reduced;

  // ─────────── ao trocar de slide, redefine a duração da barrinha ───────────
  // Imagem: intervalMs de cara.
  // Vídeo: usa duração se já conhecida (video.duration); senão intervalMs
  // como palpite inicial — atualizado quando `onLoadedMetadata` dispara.
  useEffect(() => {
    if (isActiveVideo) {
      const v = videosRef.current[current];
      const dur = v?.duration;
      if (dur && Number.isFinite(dur) && dur > 0) {
        setProgressMs(Math.max(500, Math.round(dur * 1000)));
      } else {
        setProgressMs(intervalMs);
      }
    } else {
      setProgressMs(intervalMs);
    }
  }, [current, isActiveVideo, intervalMs]);

  // ─────────── autoplay: agenda avanço ───────────
  // Imagem: timer regular = intervalMs.
  // Vídeo:  não usa timer regular — avança no `onEnded`. Aplicamos apenas
  // um safety timeout longo caso o vídeo não dispare `ended`.
  useEffect(() => {
    if (!autoplay) return;
    const ms = isActiveVideo ? VIDEO_SAFETY_MS : intervalMs;
    const id = window.setTimeout(() => {
      setCurrent((c) => (c + 1) % count);
    }, ms);
    return () => window.clearTimeout(id);
  }, [autoplay, current, count, intervalMs, isActiveVideo]);

  // ─────────── controle de play/pause dos vídeos ───────────
  // Só o slide ativo toca. Todos os outros pausam e voltam pro início — assim,
  // quando o usuário retorna ao slide, o vídeo recomeça do 0.
  useEffect(() => {
    videosRef.current.forEach((v, i) => {
      if (!v) return;
      if (i === current) {
        try {
          v.currentTime = 0;
          if (!reduced) void v.play().catch(() => {});
        } catch {
          /* silent */
        }
      } else {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {
          /* silent */
        }
      }
    });
  }, [current, reduced]);

  const go = useCallback(
    (n: number) => setCurrent(((n % count) + count) % count),
    [count],
  );

  const onPrev = useCallback(() => go(current - 1), [go, current]);
  const onNext = useCallback(() => go(current + 1), [go, current]);

  // Ao vídeo do slide ativo terminar, avança pro próximo.
  const handleVideoEnded = useCallback(
    (index: number) => {
      if (index !== current) return;
      setCurrent((c) => (c + 1) % count);
    },
    [current, count],
  );

  // Quando os metadados do vídeo ativo carregam, atualiza a barrinha para
  // usar a duração real.
  const handleVideoLoadedMetadata = useCallback(
    (index: number, duration: number) => {
      if (index !== current) return;
      if (Number.isFinite(duration) && duration > 0) {
        setProgressMs(Math.max(500, Math.round(duration * 1000)));
      }
    },
    [current],
  );

  // Key que remonta a barrinha quando slide OU duração muda — sem isso a
  // animação CSS continuaria com a duração antiga.
  const slideKey = useMemo(() => `${current}-${progressMs}`, [current, progressMs]);
  // Key só do slide (não muda por duração) — usada em SlideCopy para não
  // reanimar o fade-in do título quando só a duração da barrinha atualiza.
  const copyKey = useMemo(() => `${current}`, [current]);

  return (
    <section
      aria-label="Carrossel principal"
      className="container-x pt-4 md:pt-6"
    >
      <div className="relative md:px-16 lg:px-20">
        <div className="overflow-hidden rounded-3xl bg-ink-900 shadow-card">
          <div className="relative aspect-[4/5] w-full sm:aspect-[16/7]">
            {slides.map((s, i) => (
              <Slide
                key={s.id}
                index={i}
                slide={s}
                active={i === current}
                isNext={i === (current + 1) % count && multi}
                eager={i === 0}
                videoRefCallback={(el) => {
                  videosRef.current[i] = el;
                }}
                onEnded={handleVideoEnded}
                onLoadedMetadata={handleVideoLoadedMetadata}
              />
            ))}

            {/* Overlay + copy do slide ativo */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent sm:from-black/65 sm:via-black/25" />
            <div className="pointer-events-none absolute inset-0 flex items-end sm:items-center">
              <div className="pointer-events-none w-full px-6 pb-6 sm:pb-0 md:px-14">
                <SlideCopy slide={activeSlide} keySwap={copyKey} />
              </div>
            </div>
          </div>
        </div>

        {multi && (
          <>
            <ArrowButton direction="prev" onClick={onPrev} />
            <ArrowButton direction="next" onClick={onNext} />
          </>
        )}
      </div>

      {/* Indicadores (barrinhas) */}
      {multi && (
        <div
          role="tablist"
          aria-label="Slides do carrossel principal"
          className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2"
        >
          {slides.map((s, i) => {
            const isActive = i === current;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Ir para banner ${i + 1} de ${count}`}
                onClick={() => go(i)}
                className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40"
                style={{ maxWidth: 72 }}
              >
                {isActive && (
                  <span
                    key={slideKey}
                    aria-hidden
                    className="absolute inset-y-0 left-0 block h-full w-full origin-left rounded-full bg-brand-900"
                    style={{
                      animation: reduced ? 'none' : `carousel-fill ${progressMs}ms linear forwards`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ─────────────────────────────── slide ───────────────────────────────

const Slide = ({
  index,
  slide,
  active,
  isNext,
  eager,
  videoRefCallback,
  onEnded,
  onLoadedMetadata,
}: {
  index: number;
  slide: BannerData;
  active: boolean;
  isNext: boolean;
  eager: boolean;
  videoRefCallback: (el: HTMLVideoElement | null) => void;
  onEnded: (index: number) => void;
  onLoadedMetadata: (index: number, duration: number) => void;
}) => {
  const isVideo = slide.mediaType === 'VIDEO' && !!slide.videoUrl;
  const [src, setSrc] = useState<{ video: string | null | undefined; poster: string | null | undefined }>({
    video: slide.videoUrl,
    poster: slide.posterUrl ?? slide.imageUrl,
  });

  // Art direction desktop/mobile via matchMedia (mais confiável que
  // <source media> em <video>).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const pick = () => {
      setSrc({
        video: mq.matches && slide.videoMobileUrl ? slide.videoMobileUrl : slide.videoUrl,
        poster:
          slide.posterUrl ??
          (mq.matches ? slide.imageMobileUrl ?? slide.imageUrl : slide.imageUrl),
      });
    };
    pick();
    mq.addEventListener('change', pick);
    return () => mq.removeEventListener('change', pick);
  }, [slide.videoMobileUrl, slide.videoUrl, slide.posterUrl, slide.imageMobileUrl, slide.imageUrl]);

  // Estratégia de preload por slide:
  //  • primeiro slide (eager): "auto" pra minimizar o poster antes do vídeo
  //  • ativo: "auto"
  //  • próximo (na fila): "metadata" pra reduzir tempo quando entrar
  //  • demais: "none" pra não pesar a home
  const preload: 'auto' | 'metadata' | 'none' = eager || active
    ? 'auto'
    : isNext
      ? 'metadata'
      : 'none';

  return (
    <div
      aria-hidden={!active}
      className={`absolute inset-0 transition-opacity duration-700 ease-out ${
        active ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {isVideo ? (
        // Sem `loop` — quando termina, dispara `onEnded` que avança slide.
        // `autoPlay` só no primeiro slide, pro browser começar a tocar
        // já no first paint sem esperar um useEffect.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={videoRefCallback}
          src={src.video ?? undefined}
          poster={src.poster ?? undefined}
          muted
          playsInline
          preload={preload}
          autoPlay={eager}
          onEnded={() => onEnded(index)}
          onLoadedMetadata={(e) =>
            onLoadedMetadata(index, e.currentTarget.duration)
          }
          aria-label={slide.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <picture>
          {slide.imageMobileUrl && (
            <source media="(max-width: 640px)" srcSet={slide.imageMobileUrl} />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt={slide.title}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}
    </div>
  );
};

// ─────────────────────────── copy do slide ───────────────────────────

const SlideCopy = ({ slide, keySwap }: { slide: BannerData; keySwap: string }) => {
  const target = slide.linkTarget === '_blank' ? '_blank' : undefined;
  const isExternal = /^https?:\/\//.test(slide.buttonLink);

  return (
    <div
      key={keySwap}
      className="max-w-xl animate-fade-in-up text-white"
      style={{ animationDuration: '600ms' }}
    >
      {slide.title && (
        <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          {slide.title}
        </h2>
      )}
      {slide.subtitle && (
        <p className="mt-3 max-w-lg text-balance text-sm text-white/90 md:text-base">
          {slide.subtitle}
        </p>
      )}
      {slide.buttonText && slide.buttonLink && (
        <div className="mt-5">
          {isExternal || target === '_blank' ? (
            <a
              href={slide.buttonLink}
              target={target ?? (isExternal ? '_blank' : undefined)}
              rel={target === '_blank' || isExternal ? 'noreferrer' : undefined}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-900 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40"
            >
              {slide.buttonText}
              <ChevronRight size={16} />
            </a>
          ) : (
            <Link
              href={slide.buttonLink}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink-900 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40"
            >
              {slide.buttonText}
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

// ───────────────────────────── setas ─────────────────────────────

const ArrowButton = ({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
}) => {
  const isPrev = direction === 'prev';
  const posCls = isPrev
    ? 'left-2 md:left-2 lg:left-3'
    : 'right-2 md:right-2 lg:right-3';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? 'Banner anterior' : 'Próximo banner'}
      className={`absolute top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full border border-ink-100 bg-white text-ink-900 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 ${posCls} h-9 w-9 md:h-11 md:w-11`}
    >
      <ChevronRight
        size={18}
        className={isPrev ? 'rotate-180' : ''}
        aria-hidden
      />
    </button>
  );
};
