'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createBannerAction, updateBannerAction } from '@/app/actions/banners';
import type { HomeBannerInput } from '@/lib/validation/schemas';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { AlertIcon, CloseIcon, InfoIcon } from '@/components/ui/Icon';
import { BANNER_PLACEMENTS, MAIN_CAROUSEL_MAX_ACTIVE } from '@/lib/db/banners';

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

type Props =
  | { mode: 'new'; banner?: undefined; nextPosition: number }
  | { mode: 'edit'; banner: Banner; nextPosition?: undefined };

// Defaults compartilhados por qualquer trigger de "Novo banner". Garante
// que os dois botões (topo e empty state) abram um modal 100% idêntico.
const BLANK_BANNER = (nextPosition: number): HomeBannerInput => ({
  internalName: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  imageMobileUrl: null,
  videoUrl: null,
  videoMobileUrl: null,
  posterUrl: null,
  mediaType: 'IMAGE',
  buttonText: '',
  buttonLink: '',
  linkTarget: '_self',
  placement: 'after_trust_bar',
  active: true,
  position: nextPosition,
});

export const BannerFormDialog = (props: Props) => {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial: HomeBannerInput = useMemo(
    () =>
      props.mode === 'edit'
        ? {
            internalName: props.banner.internalName ?? '',
            title: props.banner.title,
            subtitle: props.banner.subtitle,
            imageUrl: props.banner.imageUrl,
            imageMobileUrl: props.banner.imageMobileUrl ?? null,
            videoUrl: props.banner.videoUrl ?? null,
            videoMobileUrl: props.banner.videoMobileUrl ?? null,
            posterUrl: props.banner.posterUrl ?? null,
            mediaType: props.banner.mediaType ?? 'IMAGE',
            buttonText: props.banner.buttonText,
            buttonLink: props.banner.buttonLink,
            linkTarget: props.banner.linkTarget ?? '_self',
            placement: props.banner.placement ?? 'after_trust_bar',
            active: props.banner.active,
            position: props.banner.position,
          }
        : BLANK_BANNER(props.nextPosition),
    // Recalcula quando abre (permite estado limpo em cada abertura de "new").
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.mode, open],
  );

  const [data, setData] = useState<HomeBannerInput>(initial);

  // Reseta os campos toda vez que o modal (re)abre, tanto em new quanto edit.
  useEffect(() => {
    if (open) {
      setData(initial);
      setError(null);
    }
  }, [open, initial]);

  // Fecha com ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const set = <K extends keyof HomeBannerInput>(k: K, v: HomeBannerInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const isVideo = data.mediaType === 'VIDEO';
  const isMainCarousel = data.placement === 'main_carousel';
  const linkFilledButNoText =
    !!data.buttonLink?.trim() && !data.buttonText?.trim();
  const textFilledButNoLink =
    !!data.buttonText?.trim() && !data.buttonLink?.trim();

  const validate = (): string | null => {
    if (!data.internalName?.trim()) {
      return 'Informe um nome interno para organizar este banner.';
    }
    if (!isVideo && !data.imageUrl) {
      return 'Envie uma imagem desktop para este banner.';
    }
    if (isVideo && !data.videoUrl) {
      return 'Envie um vídeo desktop para este banner.';
    }
    if (isVideo && !data.imageUrl) {
      return 'Envie também uma imagem de capa (fallback) para o vídeo.';
    }
    if (linkFilledButNoText) {
      return 'Informe o texto do botão ou remova o link.';
    }
    if (textFilledButNoLink) {
      return 'Informe o link do botão ou remova o texto do botão.';
    }
    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    start(async () => {
      try {
        if (props.mode === 'edit') await updateBannerAction(props.banner.id, data);
        else await createBannerAction(data);
        setOpen(false);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')) {
          setError(e.message);
        } else {
          setOpen(false);
        }
      }
    });
  };

  // Botão de trigger: mesmo estilo em new / empty state (btn-primary) e um
  // estilo compacto em edit. Compartilha 1 componente para os dois lugares.
  const triggerCls =
    props.mode === 'new'
      ? 'btn-primary'
      : 'rounded-md border border-brand-700 bg-brand-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-900';

  const submitLabel = pending
    ? 'Salvando...'
    : props.mode === 'edit'
      ? 'Salvar alterações'
      : 'Salvar banner';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerCls}
      >
        {props.mode === 'new' ? '+ Novo banner' : 'Editar'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
          role="dialog"
          aria-modal
          aria-label={props.mode === 'edit' ? 'Editar banner' : 'Novo banner'}
        >
          <div
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            style={{ maxHeight: '92vh' }}
          >
            {/* ─── Header sticky ─── */}
            <header className="flex items-center justify-between border-b border-ink-100 bg-white px-5 py-3 sm:px-6">
              <div>
                <h2 className="text-base font-bold text-ink-900 sm:text-lg">
                  {props.mode === 'new' ? 'Novo banner' : 'Editar banner'}
                </h2>
                <p className="mt-0.5 text-[11px] text-ink-500">
                  Preencha os dados abaixo. A prévia atualiza em tempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                aria-label="Fechar"
              >
                <CloseIcon size={18} />
              </button>
            </header>

            <form
              onSubmit={submit}
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* ─── Body scrollável ─── */}
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5 text-sm text-rose-700"
                  >
                    <AlertIcon size={14} className="mt-0.5 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* ─── Seção 1: Identificação ─── */}
                <Section number={1} title="Identificação">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <label htmlFor="internalName" className="field-label">
                        Nome interno
                        <HelpTooltip label="Nome interno" size="sm">
                          Apenas para organização dentro do painel. Não aparece na loja.
                        </HelpTooltip>
                      </label>
                      <input
                        id="internalName"
                        value={data.internalName ?? ''}
                        onChange={(e) => set('internalName', e.target.value)}
                        placeholder="Ex.: Campanha de férias — malas"
                        className="field-input"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm">
                        <input
                          type="checkbox"
                          checked={data.active}
                          onChange={(e) => set('active', e.target.checked)}
                          className="h-4 w-4 accent-brand-700"
                        />
                        Banner ativo
                      </label>
                    </div>
                  </div>
                </Section>

                {/* ─── Seção 2: Conteúdo exibido ─── */}
                <Section number={2} title="Conteúdo exibido">
                  <p className="text-xs text-ink-500">
                    Se o banner já tiver texto na arte, você pode deixar título, descrição e botão vazios.
                  </p>
                  <div>
                    <label htmlFor="title" className="field-label">
                      Título exibido no banner
                      <HelpTooltip label="Título" size="sm">
                        Opcional. Deixe vazio se o banner já traz o título dentro da arte.
                      </HelpTooltip>
                    </label>
                    <input
                      id="title"
                      value={data.title}
                      onChange={(e) => set('title', e.target.value)}
                      className="field-input"
                      placeholder="Sua próxima viagem começa aqui"
                    />
                  </div>
                  <div>
                    <label htmlFor="subtitle" className="field-label">
                      Subtítulo / descrição
                    </label>
                    <textarea
                      id="subtitle"
                      rows={2}
                      value={data.subtitle}
                      onChange={(e) => set('subtitle', e.target.value)}
                      className="field-input resize-y"
                      placeholder="Uma frase curta que reforce a proposta da campanha."
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label htmlFor="buttonText" className="field-label">
                        Texto do botão
                      </label>
                      <input
                        id="buttonText"
                        value={data.buttonText}
                        onChange={(e) => set('buttonText', e.target.value)}
                        placeholder="Ver coleção"
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label htmlFor="buttonLink" className="field-label">
                        Link do botão
                      </label>
                      <input
                        id="buttonLink"
                        value={data.buttonLink}
                        onChange={(e) => set('buttonLink', e.target.value)}
                        placeholder="/categoria/malas-bagagens"
                        className="field-input font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="linkTarget" className="field-label">Abrir link</label>
                      <select
                        id="linkTarget"
                        value={data.linkTarget}
                        onChange={(e) =>
                          set('linkTarget', e.target.value as HomeBannerInput['linkTarget'])
                        }
                        className="field-input"
                      >
                        <option value="_self">Mesma aba</option>
                        <option value="_blank">Nova aba</option>
                      </select>
                    </div>
                  </div>
                  {linkFilledButNoText && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertIcon size={12} className="mt-0.5 text-amber-600" />
                      Informe o texto do botão ou remova o link.
                    </p>
                  )}
                  {textFilledButNoLink && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertIcon size={12} className="mt-0.5 text-amber-600" />
                      Informe o link do botão ou remova o texto do botão.
                    </p>
                  )}
                </Section>

                {/* ─── Seção 3: Onde aparece ─── */}
                <Section number={3} title="Onde aparece">
                  <div>
                    <label htmlFor="placement" className="field-label">
                      Onde este banner vai aparecer?
                      <HelpTooltip label="Posição na home" size="sm">
                        Escolha em qual parte da página inicial este banner será exibido. <strong>Carrossel principal</strong> é o slot grande que aparece logo abaixo do menu, com autoplay e navegação por setas.
                      </HelpTooltip>
                    </label>
                    <select
                      id="placement"
                      value={data.placement}
                      onChange={(e) => set('placement', e.target.value)}
                      className="field-input"
                    >
                      {BANNER_PLACEMENTS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    {isMainCarousel && (
                      <div className="mt-2 flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2 text-xs text-brand-900">
                        <InfoIcon size={13} className="mt-0.5 shrink-0 text-brand-700" />
                        <span>
                          Você pode ter até <strong>{MAIN_CAROUSEL_MAX_ACTIVE} banners ativos</strong> no carrossel principal. Se já tiver esse limite, desative um antes de ativar este.
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="position" className="field-label">
                      Ordem dentro da posição
                      <HelpTooltip label="Ordem" size="sm">
                        Ao alterar a ordem, os outros banners dessa mesma posição são reorganizados automaticamente.
                      </HelpTooltip>
                    </label>
                    <input
                      id="position"
                      type="number"
                      min={1}
                      value={data.position}
                      onChange={(e) =>
                        set('position', Math.max(1, Number(e.target.value) || 1))
                      }
                      className="field-input max-w-[8rem]"
                    />
                    <p className="mt-1 text-[11px] text-ink-500">
                      Ao alterar a ordem, os outros banners dessa mesma posição são reorganizados automaticamente.
                    </p>
                  </div>
                </Section>

                {/* ─── Seção 4: Mídia ─── */}
                <Section number={4} title="Mídia">
                  <div>
                    <label htmlFor="mediaType" className="field-label">
                      Tipo de mídia
                      <HelpTooltip label="Tipo de mídia" size="sm">
                        Use imagem para campanhas leves ou vídeo curto para campanhas mais impactantes.
                      </HelpTooltip>
                    </label>
                    <select
                      id="mediaType"
                      value={data.mediaType}
                      onChange={(e) =>
                        set('mediaType', e.target.value as HomeBannerInput['mediaType'])
                      }
                      className="field-input max-w-xs"
                    >
                      <option value="IMAGE">Imagem</option>
                      <option value="VIDEO">Vídeo (MP4/WebM)</option>
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ImageUploader
                      value={data.imageUrl || null}
                      onChange={(url) => set('imageUrl', url ?? '')}
                      label={isVideo ? 'Imagem de capa (obrigatória)' : 'Imagem desktop'}
                      height={180}
                      hint="Recomendado: 1920 × 840 px, JPG ou WEBP."
                    />
                    <ImageUploader
                      value={data.imageMobileUrl ?? null}
                      onChange={(url) => set('imageMobileUrl', url)}
                      label="Imagem mobile (opcional)"
                      height={180}
                      hint="Recomendado: 800 × 1000 px."
                    />
                  </div>
                  <p className="text-xs text-ink-500">
                    {isVideo
                      ? 'A imagem desktop é usada como capa/poster e fallback quando o vídeo não pode ser reproduzido.'
                      : 'Se a imagem mobile não for definida, usamos a desktop em todos os tamanhos.'}
                  </p>

                  {isVideo && (
                    <>
                      <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2 text-xs text-brand-900">
                        <InfoIcon size={13} className="mt-0.5 shrink-0 text-brand-700" />
                        <span>
                          Use vídeos curtos em MP4 ou WebM, sem áudio obrigatório. O vídeo toca sem som para
                          manter boa experiência (autoplay muted + loop + playsInline).
                        </span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <ImageUploader
                          kind="video"
                          value={data.videoUrl ?? null}
                          onChange={(url) => set('videoUrl', url)}
                          label="Vídeo desktop"
                          height={180}
                          hint="MP4 ou WebM até 20 MB. Ideal proporção 16:7."
                        />
                        <ImageUploader
                          kind="video"
                          value={data.videoMobileUrl ?? null}
                          onChange={(url) => set('videoMobileUrl', url)}
                          label="Vídeo mobile (opcional)"
                          height={180}
                          hint="MP4 ou WebM. Proporção 4:5 recomendada."
                        />
                      </div>
                      <ImageUploader
                        value={data.posterUrl ?? null}
                        onChange={(url) => set('posterUrl', url)}
                        label="Poster / capa dedicado (opcional)"
                        height={140}
                        hint="Se enviar aqui, este poster é usado em vez da imagem desktop."
                      />
                    </>
                  )}
                </Section>

                {/* ─── Seção 5: Prévia ─── */}
                <Section number={5} title="Prévia">
                  <PreviewGrid data={data} isVideo={isVideo} />
                </Section>
              </div>

              {/* ─── Footer sticky ─── */}
              <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-white px-5 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn-primary"
                >
                  {submitLabel}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// ────────────────────── seção reutilizável ──────────────────────

const Section = ({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-center gap-2">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-900">
        {number}
      </span>
      <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">
        {title}
      </h3>
    </div>
    <div className="mt-3 space-y-3">{children}</div>
  </section>
);

// ────────────────────── prévia (desktop + mobile) ──────────────────────

const PreviewGrid = ({
  data,
  isVideo,
}: {
  data: HomeBannerInput;
  isVideo: boolean;
}) => {
  const noMediaAtAll = !data.imageUrl && !data.videoUrl;

  if (noMediaAtAll) {
    return (
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-100/40 p-8 text-center text-sm text-ink-500">
        Adicione uma mídia para visualizar o banner.
      </div>
    );
  }

  // Só desenha o overlay simulado se houver algum texto/CTA de verdade. Se o
  // banner traz o título dentro da própria arte, o overlay simulado atrapalha.
  const hasCopy = Boolean(
    data.title?.trim() || data.subtitle?.trim() || data.buttonText?.trim(),
  );

  return (
    <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
      {/* Preview desktop */}
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-900 shadow-sm">
        <div className="relative aspect-[16/7] w-full">
          {isVideo && data.videoUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={data.videoUrl}
              poster={data.posterUrl ?? data.imageUrl}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-white/60">
              Adicione mídia desktop
            </div>
          )}
          {/* Etiqueta "Prévia desktop" sempre visível, discreta, no canto */}
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/85 backdrop-blur">
            Prévia desktop
          </span>
          {hasCopy && (
            <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-r from-black/70 via-black/30 to-transparent p-4 text-white">
              <div>
                {data.title?.trim() && (
                  <p className="text-lg font-extrabold">{data.title}</p>
                )}
                {data.subtitle?.trim() && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/80">{data.subtitle}</p>
                )}
                {data.buttonText?.trim() && (
                  <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-[11px] font-bold text-ink-900">
                    {data.buttonText}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Preview mobile */}
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-900 shadow-sm">
        <div className="relative aspect-[4/5] w-full">
          {isVideo && (data.videoMobileUrl || data.videoUrl) ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={data.videoMobileUrl ?? data.videoUrl ?? undefined}
              poster={data.posterUrl ?? data.imageMobileUrl ?? data.imageUrl}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : data.imageMobileUrl || data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageMobileUrl ?? data.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-white/60">
              Adicione mídia
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/85 backdrop-blur">
            Mobile
          </span>
          {hasCopy && (
            <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 text-white">
              <div>
                {data.title?.trim() && (
                  <p className="text-sm font-extrabold">{data.title}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
