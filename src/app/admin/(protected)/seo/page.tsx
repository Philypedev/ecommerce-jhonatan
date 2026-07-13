import Link from 'next/link';
import { getStoreSettings } from '@/lib/db/settings';
import { siteConfig } from '@/config/site';
import { isRealSeo } from '@/lib/admin/configChecks';
import {
  getSeoAuditItems,
  getSeoStats,
  type SeoAuditItem,
} from '@/lib/admin/seoAudit';
import type { SeoSettingsInput } from '@/lib/validation/schemas';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { SeoSettingsForm } from './SeoSettingsForm';

export const dynamic = 'force-dynamic';

// ─────────────────────────── helpers/labels ───────────────────────────

const SEED_TITLES: ReadonlySet<string> = new Set([
  'TravelTech — Tudo para sua viagem',
  'TravelTech — Tudo para viajar com mais praticidade, tecnologia e segurança',
]);
const SEED_DESCRIPTIONS: ReadonlySet<string> = new Set([
  'Malas, mochilas, adaptadores e acessórios de viagem com atendimento humano e finalização segura pelo WhatsApp.',
  'Loja especializada em malas, mochilas e acessórios de viagem com tecnologia útil. Atendimento humano, entrega para todo o Brasil e finalização segura pelo WhatsApp.',
]);

const auditTypeLabel: Record<SeoAuditItem['type'], string> = {
  product:  'Produto',
  category: 'Coleção',
  page:     'Página',
};
const auditTypeBadge: Record<SeoAuditItem['type'], string> = {
  product:  'bg-brand-50 text-brand-700',
  category: 'bg-emerald-100 text-emerald-700',
  page:     'bg-amber-100 text-amber-700',
};
const auditEditLabel: Record<SeoAuditItem['type'], string> = {
  product:  'Editar produto',
  category: 'Editar coleção',
  page:     'Editar página',
};

type CheckState = 'done' | 'attention' | 'pending';
const CHECK_STYLES: Record<CheckState, { dot: string; chip: string; label: string }> = {
  done:      { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', label: 'Concluído' },
  attention: { dot: 'bg-amber-500',   chip: 'bg-amber-100 text-amber-700',     label: 'Atenção' },
  pending:   { dot: 'bg-ink-300',     chip: 'bg-ink-100 text-ink-700',         label: 'Pendente' },
};

const isRealOg = (url: string | null | undefined) =>
  !!url && !/placeholder/i.test(url);

// ─────────────────────────── página ───────────────────────────

export default async function AdminSeoPage() {
  const settings = await getStoreSettings();
  const [stats, auditItems] = await Promise.all([
    getSeoStats(),
    getSeoAuditItems(40),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;

  const isSeedTitle = SEED_TITLES.has((settings.defaultMetaTitle || '').trim());
  const isSeedDescription = SEED_DESCRIPTIONS.has((settings.defaultMetaDescription || '').trim());

  const initialForm: SeoSettingsInput = {
    defaultMetaTitle: settings.defaultMetaTitle ?? '',
    defaultMetaDescription: settings.defaultMetaDescription ?? '',
    defaultOgImageUrl: settings.defaultOgImageUrl ?? null,
    searchConsoleVerification: settings.searchConsoleVerification ?? null,
  };

  const seoGlobalReal = isRealSeo(settings);
  const ogReal = isRealOg(settings.defaultOgImageUrl);
  const gscConfigured = !!settings.searchConsoleVerification?.trim();

  const productsPct = stats.productsTotal > 0
    ? Math.round((stats.productsWithSeo / stats.productsTotal) * 100)
    : 0;
  const categoriesPct = stats.categoriesTotal > 0
    ? Math.round((stats.categoriesWithSeo / stats.categoriesTotal) * 100)
    : 0;
  const pagesPct = stats.pagesTotal > 0
    ? Math.round((stats.pagesWithSeo / stats.pagesTotal) * 100)
    : 0;

  // Sitemap + robots + canonical vivem sozinhos no código do projeto e não
  // precisam de configuração pelo lojista — resumimos em uma linha só.
  const checklist: { label: string; state: CheckState; href: string }[] = [
    { label: 'Título global personalizado',           state: seoGlobalReal ? 'done' : 'attention', href: '#globals' },
    { label: 'Descrição global personalizada',        state: seoGlobalReal ? 'done' : 'attention', href: '#globals' },
    { label: 'Imagem de compartilhamento configurada', state: ogReal ? 'done' : 'pending',         href: '#og' },
    { label: 'Produtos com SEO básico',               state: productsPct === 100 && stats.productsTotal > 0 ? 'done' : productsPct >= 50 ? 'attention' : 'pending', href: '/admin/produtos' },
    { label: 'Coleções com SEO básico',               state: categoriesPct === 100 && stats.categoriesTotal > 0 ? 'done' : categoriesPct >= 50 ? 'attention' : 'pending', href: '/admin/categorias' },
    { label: 'Páginas institucionais com SEO básico', state: pagesPct === 100 && stats.pagesTotal > 0 ? 'done' : pagesPct >= 40 ? 'attention' : 'pending', href: '/admin/paginas' },
    { label: 'Google Search Console configurado',     state: gscConfigured ? 'done' : 'pending',   href: '#gsc' },
    { label: 'Estrutura técnica de SEO ativa',        state: 'done',                               href: '#globals' },
  ];

  return (
    <div className="space-y-8">
      {/* ─── Cabeçalho ─── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
          SEO e compartilhamento
          <HelpTooltip label="SEO e compartilhamento">
            Aqui você configura como sua loja aparece no Google, no WhatsApp, no Facebook e em outras
            plataformas quando alguém encontra ou compartilha seu site.
          </HelpTooltip>
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Configure como sua loja aparece no Google, WhatsApp e redes sociais.
        </p>
      </div>

      {/* ─── Cards de resumo ─── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="SEO global"
          value={seoGlobalReal ? 'Configurado' : 'Atenção'}
          hint={seoGlobalReal ? 'Título e descrição personalizados' : 'Ainda usando texto padrão'}
          tone={seoGlobalReal ? 'success' : 'warning'}
          help="Mostra se o título e a descrição padrão da loja já foram personalizados. Esses dados são usados quando uma página não tem SEO próprio."
        />
        <StatCard
          label="Produtos com SEO"
          value={stats.productsTotal > 0 ? `${stats.productsWithSeo}/${stats.productsTotal}` : '—'}
          hint={stats.productsTotal > 0 ? `${productsPct}% dos produtos ativos` : 'Nenhum produto ativo'}
          tone={stats.productsTotal === 0 ? undefined : productsPct === 100 ? 'success' : productsPct >= 50 ? 'warning' : 'critical'}
          help="Mostra quantos produtos já têm título e descrição SEO configurados. Quanto mais produtos configurados, melhor a loja pode aparecer nas buscas."
        />
        <StatCard
          label="Coleções com SEO"
          value={stats.categoriesTotal > 0 ? `${stats.categoriesWithSeo}/${stats.categoriesTotal}` : '—'}
          hint={stats.categoriesTotal > 0 ? `${categoriesPct}% das coleções ativas` : 'Nenhuma coleção ativa'}
          tone={stats.categoriesTotal === 0 ? undefined : categoriesPct === 100 ? 'success' : categoriesPct >= 50 ? 'warning' : 'critical'}
          help="Mostra quantas coleções já possuem SEO configurado. Isso ajuda categorias e páginas de coleção a ficarem mais claras para o Google."
        />
        <StatCard
          label="Páginas com SEO"
          value={stats.pagesTotal > 0 ? `${stats.pagesWithSeo}/${stats.pagesTotal}` : '—'}
          hint={stats.pagesTotal > 0 ? `${pagesPct}% das páginas institucionais` : 'Nenhuma página salva'}
          tone={stats.pagesTotal === 0 ? undefined : pagesPct === 100 ? 'success' : pagesPct >= 40 ? 'warning' : 'critical'}
          help="Mostra quantas páginas institucionais já têm título e descrição SEO configurados, como Sobre, FAQ, Garantia e outras."
        />
        <StatCard
          label="Imagem de compartilhamento"
          value={ogReal ? 'Configurada' : 'Pendente'}
          hint={ogReal ? 'WhatsApp e Facebook OK' : '1200 × 630 recomendado'}
          tone={ogReal ? 'success' : 'warning'}
          help="É a imagem padrão usada quando um link da loja é compartilhado no WhatsApp, Facebook e redes sociais, caso a página não tenha imagem própria."
        />
        <StatCard
          label="Google Search Console"
          value={gscConfigured ? 'Conectado' : 'Não configurado'}
          hint={gscConfigured ? 'Verificação ativa no site' : 'Opcional, ajuda no monitoramento'}
          tone={gscConfigured ? 'success' : undefined}
          help="Mostra se a loja já está pronta para se conectar ao Google Search Console, ferramenta usada para acompanhar indexação, cliques e possíveis problemas no Google."
        />
      </section>

      {/* Âncoras para deep-link do checklist e cards */}
      <div id="globals" className="scroll-mt-24" />
      <div id="og" className="scroll-mt-24" />
      <div id="gsc" className="scroll-mt-24" />

      {/* ─── Formulário reativo (metadados + previews + OG + Search Console) ─── */}
      <SeoSettingsForm
        initial={initialForm}
        siteUrl={siteUrl}
        storeName={settings.storeName || siteConfig.name}
        isSeedTitle={isSeedTitle}
        isSeedDescription={isSeedDescription}
      />

      {/* ─── Pendências de SEO (auditoria agrupada por item) ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink-900">
              Pendências de SEO
              <HelpTooltip label="Pendências de SEO">
                Esta lista mostra produtos, coleções e páginas que ainda precisam de ajustes para aparecer melhor no Google e nas redes sociais.
              </HelpTooltip>
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Produtos, coleções e páginas que precisam de ajustes para aparecer melhor no Google e nas redes sociais.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/produtos?status=ACTIVE" className="btn-ghost text-xs">Ver produtos</Link>
            <Link href="/admin/categorias?status=ACTIVE" className="btn-ghost text-xs">Ver coleções</Link>
            <Link href="/admin/paginas" className="btn-ghost text-xs">Ver páginas</Link>
          </div>
        </div>

        {auditItems.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center">
            <p className="text-sm font-semibold text-emerald-800">Tudo em ordem no SEO por item.</p>
            <p className="mt-1 text-xs text-emerald-700">
              Nenhum produto, coleção ou página apareceu com pendências.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {auditItems.map((it) => (
              <li
                key={`${it.type}-${it.id}`}
                className="rounded-xl border border-ink-100 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${auditTypeBadge[it.type]}`}>{auditTypeLabel[it.type]}</span>
                      <p className="line-clamp-1 text-sm font-bold text-ink-900">{it.name}</p>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {it.issues.map((iss) => (
                        <li key={iss.code} className="flex items-start gap-2 text-sm">
                          <span aria-hidden className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900">
                              {iss.label}
                              <HelpTooltip label={iss.label} size="sm">{iss.tooltip}</HelpTooltip>
                            </p>
                            <p className="text-xs text-ink-500">{iss.hint}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={it.editHref}
                    className="shrink-0 rounded-md border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-900 hover:bg-ink-100"
                  >
                    {auditEditLabel[it.type]}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Checklist ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          Checklist de SEO da loja
          <HelpTooltip label="Checklist de SEO">
            Este checklist mostra o que já está configurado e o que ainda falta para a loja ter uma base de SEO mais completa.
          </HelpTooltip>
        </h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Estado real de cada item — nada aqui é marcado como concluído se estiver usando fallback ou default.
        </p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {checklist.map((c) => {
            const s = CHECK_STYLES[c.state];
            return (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 transition-colors hover:bg-ink-100/40"
                >
                  <span className="flex items-center gap-3">
                    <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
                    <span className="text-sm font-medium text-ink-900">{c.label}</span>
                  </span>
                  <span className={`badge ${s.chip}`}>{s.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ─── Boas práticas (linguagem simples) ─── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">
          Boas práticas
          <HelpTooltip label="Boas práticas">
            Estas são orientações simples para deixar a loja mais organizada para o Google e para o compartilhamento em redes sociais.
          </HelpTooltip>
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-700">
          <li>• Use títulos claros e objetivos.</li>
          <li>• Escreva descrições que expliquem o produto ou coleção em 1–2 frases.</li>
          <li>• Use imagens reais nos produtos — placeholder passa a impressão de loja vazia.</li>
          <li>• Produtos, coleções e páginas podem ter SEO próprio no formulário de cada um.</li>
          <li>• A imagem de compartilhamento melhora a aparência do link no WhatsApp e nas redes sociais.</li>
        </ul>
      </section>
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
  tone?: 'success' | 'warning' | 'critical';
  help?: string;
}) => (
  <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {tone === 'success'  && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />}
      {tone === 'warning'  && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
      {tone === 'critical' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-rose-500" />}
      {label}
      {help && <HelpTooltip label={label} size="sm">{help}</HelpTooltip>}
    </p>
    <p className="mt-1 text-2xl font-extrabold text-ink-900">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
  </div>
);
