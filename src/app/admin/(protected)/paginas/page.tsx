import Link from 'next/link';
import { listPageContents } from '@/lib/db/pages';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import {
  INSTITUTIONAL_PAGES,
  PAGE_SEO_STYLE,
  PAGE_STATUS_STYLE,
  getPageSeoStatus,
  getPageStatus,
} from '@/lib/admin/institutionalPages';

export const dynamic = 'force-dynamic';

export default async function AdminPagesPage() {
  const existing = await listPageContents();
  const bySlug = new Map(existing.map((p) => [p.slug, p]));

  // ─── estatísticas reais ─────────────────────────────────────────────
  let personalized = 0;
  let usingDefault = 0;
  let pending = 0;
  let seoPending = 0;

  for (const meta of INSTITUTIONAL_PAGES) {
    const record = bySlug.get(meta.slug) ?? null;
    const status = getPageStatus(record);
    if (status === 'personalized') personalized += 1;
    else if (status === 'default') usingDefault += 1;
    else pending += 1;
    if (getPageSeoStatus(record) === 'pending') seoPending += 1;
  }

  return (
    <div className="space-y-6">
      {/* ─── Cabeçalho ─── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
          Páginas institucionais
          <HelpTooltip label="Páginas institucionais">
            Aqui você edita os textos que passam confiança ao cliente e explicam a operação da loja — políticas, termos, FAQ, garantia e a página &quot;Quem somos&quot;.
          </HelpTooltip>
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Edite os textos que ajudam sua loja a transmitir confiança, informar políticas e responder dúvidas dos clientes.
        </p>
      </div>

      {/* ─── Cards de resumo ─── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Páginas disponíveis"
          value={INSTITUTIONAL_PAGES.length}
          hint="Total editável pelo painel"
          help="Estas são as páginas institucionais que a loja tem hoje. Cada uma pode ser personalizada, mantida no padrão ou marcada como pendente."
        />
        <StatCard
          label="Páginas personalizadas"
          value={personalized}
          hint="Já foram editadas pelo painel"
          tone={personalized > 0 ? 'success' : undefined}
          help="Quantas páginas já têm conteúdo próprio salvo no banco. Elas aparecem na loja exatamente como estão aqui."
        />
        <StatCard
          label="Usando texto padrão"
          value={usingDefault}
          hint="Ainda com o texto embutido no código"
          tone={usingDefault > 0 ? 'warning' : undefined}
          help="Páginas que a loja mostra com o fallback do código. Personalize para refletir a sua marca."
        />
        <StatCard
          label="Com SEO pendente"
          value={seoPending}
          hint="Sem meta title ou meta description"
          tone={seoPending > 0 ? 'warning' : undefined}
          help="Páginas sem título ou descrição SEO próprios. Ajuste no editor de cada página para melhorar a aparição no Google."
        />
      </section>

      {/* ─── Cards de página ─── */}
      <ul className="grid gap-4 md:grid-cols-2">
        {INSTITUTIONAL_PAGES.map((meta) => {
          const record = bySlug.get(meta.slug) ?? null;
          const status = getPageStatus(record);
          const seoStatus = getPageSeoStatus(record);
          const statusStyle = PAGE_STATUS_STYLE[status];
          const seoStyle = PAGE_SEO_STYLE[seoStatus];

          return (
            <li
              key={meta.slug}
              className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {meta.iconPath.split(' M').map((d, i) => (
                        <path key={i} d={i === 0 ? d : `M${d}`} />
                      ))}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-ink-900">{meta.name}</h2>
                    <p className="font-mono text-[11px] text-ink-500">{meta.route}</p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-ink-500">{meta.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className={`badge ${statusStyle.badge}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                  {statusStyle.label}
                </span>
                <span className={`badge ${seoStyle.badge}`}>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${seoStyle.dot}`} />
                  {seoStyle.label}
                </span>
                {record?.updatedAt && (
                  <span className="text-[11px] text-ink-500">
                    · Atualizada {new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).format(record.updatedAt)}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/paginas/${meta.slug}`}
                  className="rounded-md bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-900"
                >
                  Editar conteúdo
                </Link>
                <Link
                  href={meta.route}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 hover:bg-ink-100"
                >
                  Ver página
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────── componentes ───────────────────────────

const StatCard = ({
  label,
  value,
  hint,
  tone,
  help,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'success' | 'warning';
  help?: string;
}) => (
  <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {tone === 'success' && (
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      )}
      {tone === 'warning' && (
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />
      )}
      {label}
      {help && (
        <HelpTooltip label={label} size="sm">
          {help}
        </HelpTooltip>
      )}
    </p>
    <p className="mt-1 text-2xl font-extrabold text-ink-900">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
  </div>
);
