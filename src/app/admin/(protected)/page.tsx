import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatCurrency } from '@/utils/formatCurrency';
import { requireAdmin } from '@/lib/auth';
import { isUsingDefaultPassword } from '@/app/actions/account';
import { getStoreSettings } from '@/lib/db/settings';
import { listPageContents } from '@/lib/db/pages';
import {
  countActiveVisitors,
  countConvertedSessionsToday,
  countSessionsToday,
} from '@/lib/db/visitors';
import {
  REQUIRED_PAGE_SLUGS,
  allRequiredPagesPublished,
  isRealCloudinary,
  isRealGa,
  isRealLogo,
  isRealPixel,
  isRealSeo,
  isRealWhatsapp,
  paymentMethodsState,
  realPublishedPagesCount,
} from '@/lib/admin/configChecks';
import { AutoRefresh } from '@/components/admin/AutoRefresh';

export const dynamic = 'force-dynamic';

// ───────────────────────────── helpers visuais ─────────────────────────────

const StatCard = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'live' | 'warning' | 'success';
}) => (
  <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {tone === 'live' && (
        <span className="relative inline-flex h-2 w-2" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      )}
      {tone === 'warning' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
      {tone === 'success' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />}
      {label}
    </p>
    <p className="mt-2 text-3xl font-extrabold text-ink-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
  </div>
);

const ShortcutCard = ({
  href,
  label,
  description,
  iconPath,
}: {
  href: string;
  label: string;
  description: string;
  iconPath: string;
}) => (
  <Link
    href={href}
    className="group flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={iconPath} />
      </svg>
    </span>
    <span>
      <h3 className="text-sm font-bold text-ink-900">{label}</h3>
      <p className="mt-0.5 text-xs text-ink-500">{description}</p>
    </span>
  </Link>
);

type AlertTone = 'critical' | 'warning' | 'info';

const ALERT_STYLES: Record<AlertTone, { box: string; iconBg: string; icon: string }> = {
  critical: { box: 'border-rose-200 bg-rose-50/60', iconBg: 'bg-rose-100 text-rose-700', icon: 'M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' },
  warning: { box: 'border-amber-200 bg-amber-50/60', iconBg: 'bg-amber-100 text-amber-700', icon: 'M12 9v4 M12 17h.01 M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z' },
  info: { box: 'border-brand-100 bg-brand-50/40', iconBg: 'bg-brand-50 text-brand-700', icon: 'M12 8v4 M12 16h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z' },
};

const AlertCard = ({ tone, title, description, actionHref, actionLabel }: { tone: AlertTone; title: string; description: string; actionHref: string; actionLabel: string }) => {
  const s = ALERT_STYLES[tone];
  return (
    <article className={`flex flex-col gap-3 rounded-2xl border ${s.box} p-4 sm:flex-row sm:items-center`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${s.iconBg}`} aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {s.icon.split(' M').map((d, i) => <path key={i} d={i === 0 ? d : `M${d}`} />)}
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-ink-900">{title}</h3>
        <p className="mt-0.5 text-xs text-ink-700">{description}</p>
      </div>
      <Link href={actionHref} className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-white px-3 py-2 text-xs font-semibold text-ink-900 ring-1 ring-ink-200 hover:bg-ink-100 sm:self-auto">
        {actionLabel} →
      </Link>
    </article>
  );
};

type ChecklistState = 'done' | 'attention' | 'pending';

const CHECK_STYLES: Record<ChecklistState, { dot: string; chip: string; label: string }> = {
  done: { dot: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', label: 'Concluído' },
  attention: { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', label: 'Atenção' },
  pending: { dot: 'bg-ink-300', chip: 'bg-ink-100 text-ink-700', label: 'Pendente' },
};

const ChecklistRow = ({ label, state, href }: { label: string; state: ChecklistState; href: string }) => {
  const s = CHECK_STYLES[state];
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 transition-colors hover:bg-ink-100/40">
      <span className="flex items-center gap-3">
        <span className={`inline-block h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        <span className="text-sm font-medium text-ink-900">{label}</span>
      </span>
      <span className={`badge ${s.chip}`}>{s.label}</span>
    </Link>
  );
};

const ORDER_STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  NOVO: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'Novo' },
  EM_ATENDIMENTO: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Em atendimento' },
  CONFIRMADO: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Confirmado' },
  CANCELADO: { badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', label: 'Cancelado' },
  FECHADO: { badge: 'bg-ink-100 text-ink-700', dot: 'bg-ink-500', label: 'Fechado' },
};

const buildCustomerWaLink = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const intl = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${intl}`;
};

const SectionTitle = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div>
    <h2 className="text-base font-extrabold text-ink-900 md:text-lg">{children}</h2>
    {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
  </div>
);

// ──────────────────────────────── página ────────────────────────────────

export default async function AdminOverviewPage() {
  const session = await requireAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    // Sessões / visitantes (todos do banco real)
    activeVisitors,
    sessionsToday,
    convertedToday,
    // Pedidos (todos do banco real — LeadOrder)
    ordersToday,
    ordersNewCount,
    ordersTodayAggregate,
    recentOrders,
    // Catálogo (Product/Category reais)
    totalProducts,
    activeProducts,
    draftProducts,
    outOfStockProducts,
    productsWithoutRealImage,
    totalCategories,
    activeCategoriesWithoutActiveProducts,
    productsWithRealImageCount,
    // Settings + páginas + auth
    settings,
    pageContents,
    isDefaultPassword,
  ] = await Promise.all([
    countActiveVisitors(),
    countSessionsToday(),
    countConvertedSessionsToday(),
    prisma.leadOrder.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.leadOrder.count({ where: { status: 'NOVO' } }),
    // Valor estimado é DE HOJE — para ficar coerente com "Pedidos hoje" e
    // "Taxa de conversão" no mesmo card-deck.
    prisma.leadOrder.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: startOfDay } },
    }),
    prisma.leadOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: { take: 1 } },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'DRAFT' } }),
    prisma.product.count({ where: { status: 'ACTIVE', stock: { lte: 0 } } }),
    // "Sem foto real" = nenhuma imagem cujo URL não contenha 'placeholder'.
    // Cobre também produtos sem nenhuma imagem (some=false em set vazio).
    prisma.product.count({
      where: {
        status: 'ACTIVE',
        NOT: { images: { some: { url: { not: { contains: 'placeholder' } } } } },
      },
    }),
    prisma.category.count(),
    // Coleções ativas sem produtos ATIVOS vinculados (rascunhos não contam).
    prisma.category.count({
      where: {
        status: 'ACTIVE',
        products: { none: { status: 'ACTIVE' } },
      },
    }),
    prisma.product.count({
      where: {
        status: 'ACTIVE',
        images: { some: { url: { not: { contains: 'placeholder' } } } },
      },
    }),
    getStoreSettings().catch(() => null),
    listPageContents().catch(() => []),
    isUsingDefaultPassword(session.uid),
  ]);

  const estimatedTodayValue = ordersTodayAggregate._sum.total ?? 0;
  const sessionsWithoutOrder = Math.max(0, sessionsToday - convertedToday);
  const conversionRate =
    sessionsToday > 0 ? Math.round((convertedToday / sessionsToday) * 1000) / 10 : 0;

  // ───── checks de configuração reais (não confiam em seed defaults) ─────
  const whatsappConfigured = isRealWhatsapp(settings?.whatsappNumber);
  const logoConfigured = isRealLogo(settings?.logoUrl);
  const paymentsState = paymentMethodsState(settings?.paymentMethodsJson);
  const seoConfigured = isRealSeo(settings);
  const cloudinaryConfigured = isRealCloudinary();
  const gaConfigured = isRealGa();
  const pixelConfigured = isRealPixel();
  const publishedPagesCount = realPublishedPagesCount(pageContents);
  const allPagesPublished = allRequiredPagesPublished(pageContents);
  const isProduction = process.env.NODE_ENV === 'production';

  // ───── alertas ─────
  type Alert = { tone: AlertTone; title: string; description: string; href: string; label: string };
  const alerts: Alert[] = [];
  if (isDefaultPassword) alerts.push({ tone: 'critical', title: 'Senha padrão ainda em uso', description: 'Troque agora para evitar acesso não autorizado ao painel.', href: '/admin/conta', label: 'Trocar senha' });
  if (!whatsappConfigured) alerts.push({ tone: 'critical', title: 'WhatsApp não configurado', description: 'Defina o número real que receberá os pedidos da loja (formato 55 + DDD + número).', href: '/admin/configuracoes', label: 'Configurar loja' });
  if (paymentsState === 'empty') alerts.push({ tone: 'critical', title: 'Nenhuma forma de pagamento ativa', description: 'A loja está sem pagamento selecionado. Abra Configurações e escolha pelo menos uma forma.', href: '/admin/configuracoes', label: 'Configurar pagamentos' });
  else if (paymentsState === 'fallback') alerts.push({ tone: 'warning', title: 'Formas de pagamento usando configuração padrão', description: 'O sistema está usando o fallback automático. Salve as formas em Configurações para personalizar.', href: '/admin/configuracoes', label: 'Configurar pagamentos' });
  if (isProduction && !cloudinaryConfigured) alerts.push({ tone: 'critical', title: 'Cloudinary não configurado em produção', description: 'Uploads de imagem falharão até as variáveis CLOUDINARY_* serem preenchidas.', href: '/admin/configuracoes', label: 'Ver configurações' });
  if (ordersNewCount > 0) alerts.push({ tone: 'warning', title: `${ordersNewCount} pedido${ordersNewCount === 1 ? '' : 's'} novo${ordersNewCount === 1 ? '' : 's'} aguardando atendimento`, description: 'Atualize o status conforme você for atendendo no WhatsApp.', href: '/admin/pedidos?status=NOVO', label: 'Ver pedidos' });
  if (productsWithoutRealImage > 0) alerts.push({ tone: 'warning', title: `${productsWithoutRealImage} produto${productsWithoutRealImage === 1 ? '' : 's'} sem foto real`, description: 'Esses produtos ainda usam a imagem placeholder padrão.', href: '/admin/produtos', label: 'Ver produtos' });
  if (outOfStockProducts > 0) alerts.push({ tone: 'warning', title: `${outOfStockProducts} produto${outOfStockProducts === 1 ? '' : 's'} sem estoque`, description: 'Esses produtos aparecem como "Sob consulta" para o cliente.', href: '/admin/produtos', label: 'Ver produtos' });
  if (draftProducts > 0) alerts.push({ tone: 'info', title: `${draftProducts} produto${draftProducts === 1 ? '' : 's'} em rascunho`, description: 'Eles não aparecem na loja pública até serem publicados.', href: '/admin/produtos?status=DRAFT', label: 'Ver produtos' });
  if (activeCategoriesWithoutActiveProducts > 0) alerts.push({ tone: 'info', title: `${activeCategoriesWithoutActiveProducts} coleção/coleções ativa${activeCategoriesWithoutActiveProducts === 1 ? '' : 's'} sem produtos publicados`, description: 'Essas coleções aparecem vazias para o cliente.', href: '/admin/categorias', label: 'Ver coleções' });
  if (!seoConfigured) alerts.push({ tone: 'info', title: 'SEO básico usando textos padrão', description: 'Personalize título e descrição em SEO para refletir sua marca.', href: '/admin/seo', label: 'Configurar SEO' });
  if (!allPagesPublished) {
    const missing = REQUIRED_PAGE_SLUGS.length - publishedPagesCount;
    alerts.push({ tone: 'info', title: `${missing} página${missing === 1 ? '' : 's'} institucional${missing === 1 ? '' : 'is'} ainda em fallback`, description: 'Sobre, Políticas, Termos, FAQ e Garantia precisam ter conteúdo salvo no painel.', href: '/admin/paginas', label: 'Editar páginas' });
  }
  if (!gaConfigured) alerts.push({ tone: 'info', title: 'Google Analytics 4 não configurado', description: 'Sem GA4, não dá para medir tráfego e conversão externa.', href: '/admin/seo', label: 'Configurar' });
  if (!pixelConfigured) alerts.push({ tone: 'info', title: 'Meta Pixel não configurado', description: 'Necessário para campanhas no Facebook e Instagram.', href: '/admin/seo', label: 'Configurar' });

  // ───── checklist ─────
  type ChecklistEntry = { label: string; state: ChecklistState; href: string };
  const productsImagesState: ChecklistState =
    activeProducts === 0
      ? 'pending'
      : productsWithoutRealImage === 0
        ? 'done'
        : productsWithRealImageCount > 0
          ? 'attention'
          : 'pending';
  const pagesState: ChecklistState =
    allPagesPublished ? 'done' : publishedPagesCount > 0 ? 'attention' : 'pending';
  const paymentsChecklist: { label: string; state: ChecklistState } =
    paymentsState === 'configured'
      ? { label: 'Formas de pagamento ativas', state: 'done' }
      : paymentsState === 'empty'
        ? { label: 'Nenhuma forma de pagamento ativa', state: 'pending' }
        : { label: 'Formas de pagamento usando configuração padrão', state: 'attention' };
  const checklist: ChecklistEntry[] = [
    { label: 'Logo configurado', state: logoConfigured ? 'done' : 'pending', href: '/admin/personalizacao' },
    { label: 'WhatsApp configurado', state: whatsappConfigured ? 'done' : 'attention', href: '/admin/configuracoes' },
    { label: paymentsChecklist.label, state: paymentsChecklist.state, href: '/admin/configuracoes' },
    { label: 'Produtos com fotos reais', state: productsImagesState, href: '/admin/produtos' },
    { label: 'Páginas institucionais publicadas', state: pagesState, href: '/admin/paginas' },
    { label: 'SEO básico configurado', state: seoConfigured ? 'done' : 'pending', href: '/admin/seo' },
    { label: 'Google Analytics 4 conectado', state: gaConfigured ? 'done' : 'pending', href: '/admin/seo' },
    { label: 'Meta Pixel conectado', state: pixelConfigured ? 'done' : 'pending', href: '/admin/seo' },
    { label: 'Senha do admin trocada', state: isDefaultPassword ? 'attention' : 'done', href: '/admin/conta' },
  ];

  return (
    <div className="space-y-10">
      <AutoRefresh intervalMs={20000} />

      {/* ─────── Cabeçalho ─────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">Visão geral</h1>
        <p className="mt-1 text-sm text-ink-500">
          Acompanhe o desempenho, os pedidos e a configuração da sua loja.
        </p>
      </div>

      {/* ─────── Métricas de sessão/pedido (topo) ─────── */}
      <section className="space-y-3">
        <SectionTitle hint="Atualiza automaticamente a cada 20 segundos">
          Sessões e pedidos
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Visitantes agora" value={activeVisitors} hint="Online neste momento" tone="live" />
          <StatCard label="Sessões hoje" value={sessionsToday} hint="Entraram na loja hoje" />
          <StatCard label="Sessões sem pedido" value={sessionsWithoutOrder} hint="Entraram, mas não finalizaram" tone={sessionsWithoutOrder > 0 ? 'warning' : undefined} />
          <StatCard label="Pedidos hoje" value={ordersToday} hint="Pedidos enviados pelo site" />
          <StatCard label="Valor estimado" value={formatCurrency(estimatedTodayValue)} hint="Soma dos pedidos de hoje" />
          <StatCard label="Taxa de conversão" value={`${conversionRate}%`} hint="Sessões que viraram pedido" tone={conversionRate > 0 ? 'success' : undefined} />
        </div>
      </section>

      {/* ─────── Cards de catálogo ─────── */}
      <section className="space-y-3">
        <SectionTitle hint="Estado atual do seu catálogo">Catálogo</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Produtos cadastrados" value={totalProducts} />
          <StatCard label="Produtos publicados" value={activeProducts} hint="Visíveis na loja" />
          <StatCard label="Produtos em rascunho" value={draftProducts} hint="Aguardando publicação" />
          <StatCard label="Produtos sem estoque" value={outOfStockProducts} hint='Aparecem como "Sob consulta"' />
          <StatCard label="Coleções" value={totalCategories} />
        </div>
      </section>

      {/* ─────── Alertas inteligentes ─────── */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <SectionTitle hint="Itens que precisam da sua ação">Atenção necessária</SectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((a, i) => (
              <AlertCard key={`${a.title}-${i}`} tone={a.tone} title={a.title} description={a.description} actionHref={a.href} actionLabel={a.label} />
            ))}
          </div>
        </section>
      )}

      {/* ─────── Atalhos rápidos ─────── */}
      <section className="space-y-3">
        <SectionTitle>Atalhos rápidos</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShortcutCard href="/admin/produtos/novo" label="Novo produto" description="Cadastre um novo item no catálogo." iconPath="M12 5v14M5 12h14" />
          <ShortcutCard href="/admin/categorias" label="Nova coleção" description="Organize produtos por categorias e campanhas." iconPath="M3 12V4h8l10 10-8 8L3 12Z" />
          <ShortcutCard href="/admin/banners" label="Novo banner" description="Suba uma campanha em destaque na home." iconPath="M3 6h18v12H3zM3 10h18M9 14h6" />
          <ShortcutCard href="/admin/pedidos" label="Ver pedidos" description="Acompanhe solicitações recebidas pelo WhatsApp." iconPath="M5 7h14l-1.5 12h-11Z M9 7V4h6v3" />
          <ShortcutCard href="/admin/personalizacao" label="Identidade visual" description="Logo, cores, favicon e hero da loja." iconPath="M4 18 14 8l3 3-10 10H4ZM14 4l6 6" />
          <ShortcutCard href="/admin/conteudo-home" label="Editar página inicial" description="Selos do hero, benefícios e como funciona." iconPath="M3 9l9-6 9 6v12H3zM9 21V12h6v9" />
        </div>
      </section>

      {/* ─────── Últimos pedidos pelo WhatsApp ─────── */}
      <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Últimos pedidos pelo WhatsApp</SectionTitle>
          {recentOrders.length > 0 && (
            <Link href="/admin/pedidos" className="text-sm font-semibold text-brand-700 hover:underline">
              Ver todos →
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-ink-200 bg-ink-100/40 p-6 text-center">
            <p className="text-sm font-semibold text-ink-900">Nenhum pedido recebido ainda.</p>
            <p className="mt-1 text-xs text-ink-500">
              Faça um teste no checkout para validar o fluxo de compra pelo WhatsApp.
            </p>
            <Link href="/" target="_blank" rel="noreferrer" className="btn-outline mt-4 inline-flex">
              Testar checkout
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recentOrders.map((o) => {
                  const st = ORDER_STATUS_STYLE[o.status] ?? { badge: 'bg-ink-100 text-ink-700', dot: 'bg-ink-500', label: o.status };
                  const waLink = buildCustomerWaLink(o.customerPhone);
                  return (
                    <tr key={o.id}>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-ink-900">{o.customerName}</p>
                        <p className="text-xs text-ink-500">{o.customerPhone}</p>
                      </td>
                      <td className="py-3 pr-4 text-ink-500">
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        }).format(o.createdAt)}
                      </td>
                      <td className="py-3 pr-4 font-semibold">{formatCurrency(o.total)}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${st.badge}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Link href={`/admin/pedidos/${o.id}`} className="rounded-md border border-ink-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-900 hover:bg-ink-100">
                            Ver
                          </Link>
                          {waLink && (
                            <a href={waLink} target="_blank" rel="noreferrer" className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─────── Checklist da loja ─────── */}
      <section className="space-y-3">
        <SectionTitle hint="Itens essenciais para a loja parecer profissional ao cliente">
          Checklist da loja
        </SectionTitle>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {checklist.map((item) => (
            <ChecklistRow key={item.label} label={item.label} state={item.state} href={item.href} />
          ))}
        </div>
      </section>
    </div>
  );
}
