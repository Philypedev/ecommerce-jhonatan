'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { updateSeoSettingsAction } from '@/app/actions/settings';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import type { SeoSettingsInput } from '@/lib/validation/schemas';
import {
  SEO_DESC_IDEAL,
  SEO_DESC_MAX,
  SEO_TITLE_IDEAL,
  SEO_TITLE_MAX,
  descState,
  titleState,
  type SeoFieldState,
} from '@/lib/admin/seoAudit';

const stateStyles: Record<SeoFieldState, { bar: string; text: string; label: string }> = {
  ideal: { bar: 'bg-emerald-500',  text: 'text-emerald-700', label: 'Ideal' },
  ok:    { bar: 'bg-brand-700',    text: 'text-brand-700',   label: 'Aceitável' },
  long:  { bar: 'bg-rose-500',     text: 'text-rose-700',    label: 'Longo demais — Google trunca' },
  short: { bar: 'bg-amber-500',    text: 'text-amber-700',   label: 'Curto — considere reforçar' },
  empty: { bar: 'bg-ink-300',      text: 'text-ink-500',     label: 'Vazio' },
};

type Props = {
  initial: SeoSettingsInput;
  siteUrl: string;
  storeName: string;
  isSeedTitle: boolean;
  isSeedDescription: boolean;
};

export const SeoSettingsForm = ({
  initial,
  siteUrl,
  storeName,
  isSeedTitle,
  isSeedDescription,
}: Props) => {
  const [data, setData] = useState<SeoSettingsInput>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const res = await updateSeoSettingsAction(data);
      if (res.ok) setSuccess(true);
      else setError(res.error);
    });
  };

  const titleValue = data.defaultMetaTitle ?? '';
  const descValue = data.defaultMetaDescription ?? '';
  const tState = useMemo(() => titleState(titleValue), [titleValue]);
  const dState = useMemo(() => descState(descValue), [descValue]);

  const titleLen = titleValue.length;
  const descLen = descValue.length;
  const titlePct = Math.min(100, Math.round((titleLen / SEO_TITLE_MAX) * 100));
  const descPct = Math.min(100, Math.round((descLen / SEO_DESC_MAX) * 100));

  const domain = (() => {
    try { return new URL(siteUrl).hostname.replace(/^www\./, ''); } catch { return siteUrl; }
  })();

  const ogImage = data.defaultOgImageUrl ?? null;
  const hasRealOg = !!ogImage && !/placeholder/i.test(ogImage);

  return (
    <form onSubmit={submit} className="space-y-6">
      {success && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Configurações salvas.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ─── Metadados globais ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">
              Metadados globais
              <HelpTooltip label="Metadados globais">
                São os dados padrão de SEO da loja. Eles ajudam o Google a entender o site e são usados quando uma página específica não possui título ou descrição próprios.
              </HelpTooltip>
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Aparecem quando o cliente busca sua loja no Google e compartilha o link.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-5">
          {/* Título */}
          <div>
            <label htmlFor="metaTitle" className="field-label">
              Título padrão
              <HelpTooltip label="Título padrão">
                É o título padrão da loja nos resultados do Google. O ideal é ser claro, objetivo e mostrar a principal proposta da loja.
              </HelpTooltip>
            </label>
            <input
              id="metaTitle"
              value={titleValue}
              maxLength={SEO_TITLE_MAX + 20}
              onChange={(e) => setData({ ...data, defaultMetaTitle: e.target.value })}
              className="field-input"
              placeholder={`${storeName} — do que sua loja é especialista`}
            />
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
                <div className={`h-full transition-all ${stateStyles[tState].bar}`} style={{ width: `${titlePct}%` }} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className={`font-semibold ${stateStyles[tState].text}`}>
                  {stateStyles[tState].label}
                </span>
                <span className="text-ink-500">
                  {titleLen}/{SEO_TITLE_IDEAL} caracteres · máximo prático {SEO_TITLE_MAX}
                </span>
              </div>
              {isSeedTitle && titleValue === initial.defaultMetaTitle && (
                <p className="text-[11px] text-amber-700">
                  Este texto ainda é o padrão do seed. Personalize para refletir sua marca.
                </p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="metaDesc" className="field-label">
              Descrição padrão
              <HelpTooltip label="Descrição padrão">
                É o texto que explica sua loja nos resultados de busca. O ideal é resumir o que a loja vende e seus diferenciais em uma ou duas frases.
              </HelpTooltip>
            </label>
            <textarea
              id="metaDesc"
              rows={3}
              value={descValue}
              maxLength={SEO_DESC_MAX + 40}
              onChange={(e) => setData({ ...data, defaultMetaDescription: e.target.value })}
              className="field-input resize-y"
              placeholder="Descreva em 1–2 frases o que sua loja vende e o diferencial."
            />
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
                <div className={`h-full transition-all ${stateStyles[dState].bar}`} style={{ width: `${descPct}%` }} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className={`font-semibold ${stateStyles[dState].text}`}>
                  {stateStyles[dState].label}
                </span>
                <span className="text-ink-500">
                  {descLen}/{SEO_DESC_IDEAL} caracteres · máximo prático {SEO_DESC_MAX}
                </span>
              </div>
              {isSeedDescription && descValue === initial.defaultMetaDescription && (
                <p className="text-[11px] text-amber-700">
                  Este texto ainda é o padrão do seed. Personalize para refletir sua marca.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Preview do Google ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          Como aparece no Google
          <HelpTooltip label="Como aparece no Google">
            Esta é uma simulação de como sua loja pode aparecer nos resultados do Google. O resultado real pode variar conforme a busca feita pelo cliente.
          </HelpTooltip>
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Simulação usando o título e descrição padrão. O Google pode ajustar o texto conforme a busca.
        </p>
        <div className="mt-4 rounded-xl border border-ink-100 bg-ink-100/30 p-5">
          <div className="text-[12px] text-ink-500">
            <span className="font-medium text-ink-700">{storeName}</span> · {domain}
          </div>
          <p className="mt-1 line-clamp-1 text-xl font-normal text-[#1a0dab]">
            {titleValue || `${storeName} — sua loja online`}
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-700">
            {descValue || 'Descrição padrão da loja. Edite acima para personalizar.'}
          </p>
        </div>
      </section>

      {/* ─── Imagem OG + Preview WhatsApp/Facebook ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          Imagem padrão de compartilhamento
          <HelpTooltip label="Imagem padrão de compartilhamento">
            Essa imagem aparece quando alguém compartilha um link da loja no WhatsApp, Facebook ou outras redes, caso a página compartilhada não tenha imagem própria.
          </HelpTooltip>
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Usada como fallback quando o produto, coleção ou página não têm imagem própria. Recomendado: 1200 × 630 px, JPG ou PNG.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* uploader */}
          <div>
            <div className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
              <span>Envio da imagem</span>
              <HelpTooltip label="Envio da imagem OG" size="sm">
                Envie uma imagem horizontal e de boa qualidade. O tamanho recomendado é 1200 × 630 px para ficar bonito no WhatsApp, Facebook e redes sociais.
              </HelpTooltip>
            </div>
            <ImageUploader
              value={ogImage}
              onChange={(url) => setData({ ...data, defaultOgImageUrl: url })}
              label="Imagem OG (compartilhamento)"
              height={200}
              hint="1200 × 630 px · JPG ou PNG"
            />
            {!hasRealOg && (
              <p className="mt-2 text-[11px] text-amber-700">
                Sem imagem OG configurada, WhatsApp e Facebook mostram apenas texto.
              </p>
            )}
          </div>

          {/* preview WhatsApp/Facebook */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Prévia (WhatsApp / Facebook)
              <HelpTooltip label="Prévia WhatsApp / Facebook" size="sm">
                Aqui você vê uma simulação de como o link da loja pode aparecer quando for compartilhado.
              </HelpTooltip>
            </p>
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm">
              {hasRealOg ? (
                <div className="relative aspect-[1200/630] bg-ink-100">
                  <Image
                    src={ogImage as string}
                    alt="Prévia OG"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="grid aspect-[1200/630] place-items-center bg-gradient-to-br from-brand-950 to-brand-700 text-center text-white/80">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Sem imagem</p>
                    <p className="mt-1 text-lg font-bold">{storeName}</p>
                  </div>
                </div>
              )}
              <div className="border-t border-ink-100 bg-ink-100/40 p-3">
                <p className="text-[10px] uppercase tracking-widest text-ink-500">{domain}</p>
                <p className="mt-0.5 line-clamp-1 text-sm font-bold text-ink-900">
                  {titleValue || `${storeName} — sua loja online`}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">
                  {descValue || 'Descrição padrão.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Google Search Console ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          Google Search Console
          <HelpTooltip label="Google Search Console">
            Use este campo apenas se quiser conectar sua loja ao Google Search Console. Isso ajuda a acompanhar indexação, desempenho nas buscas e possíveis problemas técnicos.
          </HelpTooltip>
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Cole aqui apenas o valor do <code className="rounded bg-ink-100 px-1">content</code> da tag
          {' '}<code className="rounded bg-ink-100 px-1">google-site-verification</code>. Não colar a tag inteira.
        </p>
        <div className="mt-3">
          <label htmlFor="gsc" className="field-label">
            Código de verificação (content)
            <HelpTooltip label="Código de verificação">
              Cole aqui apenas o valor que está dentro de <code>content=&quot;...&quot;</code> na tag de verificação do Google. Não cole a tag inteira. Exemplo: se o Google mostrar <code>content=&quot;ABC123xyz&quot;</code>, cole apenas <code>ABC123xyz</code>.
            </HelpTooltip>
          </label>
          <input
            id="gsc"
            value={data.searchConsoleVerification ?? ''}
            maxLength={200}
            onChange={(e) => setData({ ...data, searchConsoleVerification: e.target.value || null })}
            className="field-input font-mono text-xs"
            placeholder="ex.: A_bC1234...def"
          />
          <p className="mt-1 text-[11px] text-ink-500">
            Fica opcional. Quando preenchido, a loja pública passa a emitir a tag no <code className="rounded bg-ink-100 px-1">&lt;head&gt;</code>.
          </p>
        </div>
      </section>

      {/* ─── Botão salvar ─── */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="submit" disabled={pending} className="btn-primary h-11 w-full sm:w-auto">
          {pending ? 'Salvando...' : 'Salvar SEO'}
        </button>
      </div>
    </form>
  );
};
