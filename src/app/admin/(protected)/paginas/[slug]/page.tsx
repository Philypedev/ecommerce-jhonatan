import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPageContent } from '@/lib/db/pages';
import { siteConfig } from '@/config/site';
import {
  PAGE_SEO_STYLE,
  PAGE_STATUS_STYLE,
  getInstitutionalPageMeta,
  getPageSeoStatus,
  getPageStatus,
} from '@/lib/admin/institutionalPages';
import { PageForm } from './PageForm';

export const dynamic = 'force-dynamic';

export default async function EditPageContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getInstitutionalPageMeta(slug);
  if (!meta) notFound();

  const existing = await getPageContent(slug);
  const status = getPageStatus(existing);
  const seoStatus = getPageSeoStatus(existing);
  const statusStyle = PAGE_STATUS_STYLE[status];
  const seoStyle = PAGE_SEO_STYLE[seoStatus];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;

  return (
    <div className="space-y-6">
      {/* ─── Cabeçalho ─── */}
      <div>
        <Link
          href="/admin/paginas"
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          ← Voltar para Páginas
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
              Editar &ldquo;{meta.name}&rdquo;
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span className="font-mono">{meta.route}</span>
              <span aria-hidden>·</span>
              <span className={`badge ${statusStyle.badge}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                {statusStyle.label}
              </span>
              <span className={`badge ${seoStyle.badge}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${seoStyle.dot}`} />
                {seoStyle.label}
              </span>
            </p>
          </div>
          <Link
            href={meta.route}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-ink-300 bg-white px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100"
          >
            Ver página →
          </Link>
        </div>
      </div>

      {/* ─── Aviso de estado padrão ─── */}
      {status === 'default' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <p className="font-semibold">Esta página ainda usa o conteúdo padrão.</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Salve uma versão personalizada abaixo para controlar o texto pelo painel. O padrão continuará sendo mostrado até você salvar.
          </p>
        </div>
      ) : status === 'pending' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          <p className="font-semibold">Esta página está pendente.</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Existe um registro salvo, mas o conteúdo está vazio. Preencha abaixo para publicar de verdade.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Página personalizada pelo painel.</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            As alterações que você salvar aqui vão para o site público imediatamente.
          </p>
        </div>
      )}

      <PageForm
        slug={slug}
        pageName={meta.name}
        pageRoute={meta.route}
        siteUrl={siteUrl}
        initial={{
          slug,
          title: existing?.title ?? meta.default.title,
          content: existing?.content ?? meta.default.content,
          metaTitle: existing?.metaTitle ?? '',
          metaDescription: existing?.metaDescription ?? '',
        }}
      />
    </div>
  );
}
