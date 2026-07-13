'use client';

import { useMemo, useState, useTransition } from 'react';
import { updatePageContentAction } from '@/app/actions/pages';
import type { PageContentInput } from '@/lib/validation/schemas';
import { renderMarkdown } from '@/lib/markdown';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import {
  SEO_DESC_IDEAL,
  SEO_DESC_MAX,
  SEO_TITLE_IDEAL,
  SEO_TITLE_MAX,
  descState,
  titleState,
  type SeoFieldState,
} from '@/lib/admin/seoAudit';

type Props = {
  slug: string;
  pageName: string;
  pageRoute: string;
  siteUrl: string;
  initial: PageContentInput;
};

const stateStyles: Record<SeoFieldState, { bar: string; text: string; label: string }> = {
  ideal: { bar: 'bg-emerald-500',  text: 'text-emerald-700', label: 'Ideal' },
  ok:    { bar: 'bg-brand-700',    text: 'text-brand-700',   label: 'Aceitável' },
  long:  { bar: 'bg-rose-500',     text: 'text-rose-700',    label: 'Longo demais — Google trunca' },
  short: { bar: 'bg-amber-500',    text: 'text-amber-700',   label: 'Curto — considere reforçar' },
  empty: { bar: 'bg-ink-300',      text: 'text-ink-500',     label: 'Vazio' },
};

export const PageForm = ({ slug, pageName, pageRoute, siteUrl, initial }: Props) => {
  const [data, setData] = useState<PageContentInput>(initial);
  const [pending, start] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PageContentInput>(k: K, v: PageContentInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const res = await updatePageContentAction({ ...data, slug });
      if (res.ok) setSuccess(true);
      else setError(res.error);
    });
  };

  const renderedContent = useMemo(() => renderMarkdown(data.content ?? ''), [data.content]);

  const metaTitleValue = data.metaTitle ?? '';
  const metaDescValue = data.metaDescription ?? '';
  const tState = titleState(metaTitleValue);
  const dState = descState(metaDescValue);
  const tPct = Math.min(100, Math.round((metaTitleValue.length / SEO_TITLE_MAX) * 100));
  const dPct = Math.min(100, Math.round((metaDescValue.length / SEO_DESC_MAX) * 100));

  const domain = (() => {
    try {
      return new URL(siteUrl).hostname.replace(/^www\./, '');
    } catch {
      return siteUrl;
    }
  })();

  const previewTitle = metaTitleValue || data.title || pageName;
  const previewDesc =
    metaDescValue ||
    (data.content ? data.content.replace(/[#*[\]()]/g, '').slice(0, 160) : 'Descrição padrão da página.');
  const hasCustomSeo = metaTitleValue.trim().length > 0 || metaDescValue.trim().length > 0;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {success && (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
        >
          Página salva com sucesso. As alterações já estão no ar.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {/* ─── Conteúdo (editor + prévia) ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          Conteúdo
          <HelpTooltip label="Conteúdo da página">
            Este é o texto que aparece na página pública. O título vira o cabeçalho principal, e o texto vira o corpo com parágrafos, subtítulos e listas.
          </HelpTooltip>
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Edite à esquerda e veja como fica no site em tempo real à direita.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {/* Editor */}
          <div className="space-y-4">
            <div>
              <label htmlFor="pageTitle" className="field-label">
                Título principal
                <HelpTooltip label="Título principal">
                  Título grande no topo da página pública. Fica logo antes do texto principal.
                </HelpTooltip>
              </label>
              <input
                id="pageTitle"
                required
                value={data.title}
                onChange={(e) => set('title', e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label htmlFor="pageContent" className="field-label">
                Texto da página
                <HelpTooltip label="Texto da página">
                  Você pode usar Markdown leve: <code>##</code> para subtítulos, <code>-</code> para listas, <code>**negrito**</code> para destaque e <code>[texto](https://link.com)</code> para links.
                </HelpTooltip>
              </label>
              <textarea
                id="pageContent"
                rows={20}
                value={data.content ?? ''}
                onChange={(e) => set('content', e.target.value)}
                className="field-input font-mono text-xs leading-relaxed"
                placeholder="## Subtítulo&#10;&#10;Texto do parágrafo.&#10;&#10;- Item 1&#10;- Item 2"
              />
              <p className="mt-2 text-[11px] text-ink-500">
                {(data.content ?? '').length.toLocaleString('pt-BR')} caracteres · linha em branco separa parágrafos
              </p>
            </div>
          </div>

          {/* Prévia */}
          <div>
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Prévia da página
              <HelpTooltip label="Prévia da página" size="sm">
                Aqui você vê como o título e o texto vão aparecer no site público, com a mesma formatação.
              </HelpTooltip>
            </p>
            <div className="rounded-2xl border border-ink-100 bg-ink-100/30 p-5 lg:sticky lg:top-24">
              <article className="max-h-[520px] overflow-y-auto pr-1">
                <h3 className="text-xl font-extrabold tracking-tight text-ink-900 md:text-2xl">
                  {data.title || pageName}
                </h3>
                <div className="mt-3">
                  {renderedContent ?? (
                    <p className="text-sm italic text-ink-500">
                      O texto ainda está vazio. Digite algo à esquerda para ver a prévia.
                    </p>
                  )}
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEO ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          SEO desta página
          <HelpTooltip label="SEO desta página">
            Título e descrição que aparecem nos resultados do Google e no compartilhamento em redes. Se estes campos ficarem vazios, o Google usa o próprio conteúdo da página como fallback.
          </HelpTooltip>
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Personalize como esta página específica aparece no Google e nas redes sociais.
        </p>

        {!hasCustomSeo && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
            Essa página ainda não tem SEO próprio. O Google e as redes sociais usarão o texto padrão da loja como fallback.
          </div>
        )}

        <div className="mt-4 grid gap-5">
          {/* Meta title */}
          <div>
            <label htmlFor="metaTitle" className="field-label">
              Meta title
              <HelpTooltip label="Meta title">
                É o título que aparece nos resultados do Google. Se ficar vazio, o Google usa o título principal da página como fallback.
              </HelpTooltip>
            </label>
            <input
              id="metaTitle"
              value={metaTitleValue}
              maxLength={SEO_TITLE_MAX + 20}
              onChange={(e) => set('metaTitle', e.target.value)}
              className="field-input"
              placeholder={`${pageName} — ${data.title || pageName}`}
            />
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full transition-all ${stateStyles[tState].bar}`}
                  style={{ width: `${tPct}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className={`font-semibold ${stateStyles[tState].text}`}>
                  {stateStyles[tState].label}
                </span>
                <span className="text-ink-500">
                  {metaTitleValue.length}/{SEO_TITLE_IDEAL} · máx. prático {SEO_TITLE_MAX}
                </span>
              </div>
            </div>
          </div>

          {/* Meta description */}
          <div>
            <label htmlFor="metaDesc" className="field-label">
              Meta description
              <HelpTooltip label="Meta description">
                É a descrição que aparece embaixo do título nos resultados do Google. Resuma em 1-2 frases o que a página oferece.
              </HelpTooltip>
            </label>
            <textarea
              id="metaDesc"
              rows={3}
              value={metaDescValue}
              maxLength={SEO_DESC_MAX + 40}
              onChange={(e) => set('metaDescription', e.target.value)}
              className="field-input resize-y"
              placeholder="Descreva em 1-2 frases o que o cliente vai encontrar nesta página."
            />
            <div className="mt-2 space-y-1">
              <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full transition-all ${stateStyles[dState].bar}`}
                  style={{ width: `${dPct}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className={`font-semibold ${stateStyles[dState].text}`}>
                  {stateStyles[dState].label}
                </span>
                <span className="text-ink-500">
                  {metaDescValue.length}/{SEO_DESC_IDEAL} · máx. prático {SEO_DESC_MAX}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Google desta página */}
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
            Prévia no Google
            <HelpTooltip label="Prévia no Google" size="sm">
              Simulação de como esta página pode aparecer nos resultados do Google. O resultado real pode variar conforme a busca.
            </HelpTooltip>
          </p>
          <div className="rounded-xl border border-ink-100 bg-ink-100/30 p-4">
            <div className="text-[12px] text-ink-500">
              <span className="font-medium text-ink-700">{domain}</span>
              <span className="mx-1">›</span>
              <span className="font-mono">{pageRoute.replace(/^\//, '')}</span>
            </div>
            <p className="mt-1 line-clamp-1 text-xl font-normal text-[#1a0dab]">
              {previewTitle}
            </p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-700">
              {previewDesc}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Salvar ─── */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button type="submit" disabled={pending} className="btn-primary h-11 w-full sm:w-auto">
          {pending ? 'Salvando...' : 'Salvar página'}
        </button>
      </div>
    </form>
  );
};
