import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getStoreSettings } from '@/lib/db/settings';
import { getAllCategories } from '@/lib/db/categories';
import { parseHomeContent } from '@/lib/homeContent';
import {
  homeContentSavedStates,
  isRealHeroImage,
  isRealHeroTitle,
} from '@/lib/admin/configChecks';
import { HomeContentForm } from './HomeContentForm';
import { HomeFeaturedCategoryForm } from './HomeFeaturedCategoryForm';

export const dynamic = 'force-dynamic';

// ───────────────────────── tipos / styling ─────────────────────────

type SectionStatus = 'ok' | 'attention' | 'pending' | 'default';
type SectionStatusInfo = { label: string; badge: string; dot: string };
const STATUS: Record<SectionStatus, SectionStatusInfo> = {
  ok:        { label: 'Ativa',                  badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  attention: { label: 'Atenção',                badge: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500'   },
  pending:   { label: 'Pendente',               badge: 'bg-rose-100 text-rose-700',      dot: 'bg-rose-500'    },
  default:   { label: 'Usando padrão',          badge: 'bg-ink-100 text-ink-700',        dot: 'bg-ink-400'     },
};

type SectionCardData = {
  name: string;
  type: string;
  status: SectionStatus;
  metric: string;
  description: string;
  editHref: string;
  editLabel: string;
  inlineAnchor?: string;
};

// ───────────────────────── componentes UI ─────────────────────────

const SectionCard = ({ data, position }: { data: SectionCardData; position: number }) => {
  const s = STATUS[data.status];
  return (
    <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
            #{String(position).padStart(2, '0')} · {data.type}
          </p>
          <h3 className="mt-1 text-base font-bold text-ink-900">{data.name}</h3>
        </div>
        <span className={`badge ${s.badge}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
          {s.label}
        </span>
      </div>
      <p className="mt-3 text-sm text-ink-700">{data.description}</p>
      <p className="mt-2 text-xs font-medium text-ink-500">{data.metric}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {data.inlineAnchor ? (
          <a
            href={data.inlineAnchor}
            className="inline-flex items-center gap-1 rounded-md bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-700"
          >
            Editar abaixo ↓
          </a>
        ) : null}
        <Link
          href={data.editHref}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${
            data.inlineAnchor
              ? 'border border-ink-300 bg-white text-ink-900 hover:bg-ink-100'
              : 'bg-ink-900 text-white hover:bg-ink-700'
          }`}
        >
          {data.editLabel} →
        </Link>
      </div>
    </article>
  );
};

type AlertTone = 'critical' | 'warning' | 'info';
const ALERT_STYLES: Record<AlertTone, { box: string; chip: string }> = {
  critical: { box: 'border-rose-200 bg-rose-50/60',  chip: 'bg-rose-100 text-rose-700'   },
  warning:  { box: 'border-amber-200 bg-amber-50/60', chip: 'bg-amber-100 text-amber-700' },
  info:     { box: 'border-brand-100 bg-brand-50/40', chip: 'bg-brand-50 text-brand-700'  },
};

const AlertRow = ({
  tone, title, description, actionHref, actionLabel,
}: { tone: AlertTone; title: string; description: string; actionHref: string; actionLabel: string }) => {
  const s = ALERT_STYLES[tone];
  return (
    <article className={`flex flex-col gap-3 rounded-xl border ${s.box} p-4 sm:flex-row sm:items-center`}>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-ink-900">{title}</h4>
        <p className="mt-0.5 text-xs text-ink-700">{description}</p>
      </div>
      <Link
        href={actionHref}
        className="inline-flex shrink-0 items-center gap-1 self-start rounded-md bg-white px-3 py-2 text-xs font-semibold text-ink-900 ring-1 ring-ink-200 hover:bg-ink-100 sm:self-auto"
      >
        {actionLabel} →
      </Link>
    </article>
  );
};

// ───────────────────────────── página ─────────────────────────────

export default async function AdminHomePage() {
  const settings = await getStoreSettings();
  const content = parseHomeContent(settings.homeContentJson);
  const allCategories = await getAllCategories();

  // A vitrine "Novidades" mostra produtos ACTIVE (Shopify-style — publicar
  // basta). Se `featuredCategoryId` estiver configurado, restringe a esta
  // coleção. O contador reflete essa regra para o card não mentir.
  const featuredCategoryId = settings.featuredCategoryId ?? null;

  // Contagens reais — todas do banco, nada de mock.
  const [
    activeRotatingMessages,
    categoriesOnHome,
    activeProductsInVitrine,
    activeBanners,
  ] = await Promise.all([
    prisma.rotatingMessage.count({ where: { active: true } }),
    prisma.category.count({ where: { status: 'ACTIVE', showOnHome: true } }),
    prisma.product.count({
      where: {
        status: 'ACTIVE',
        ...(featuredCategoryId ? { categoryId: featuredCategoryId } : {}),
      },
    }),
    prisma.homeBanner.count({ where: { active: true } }),
  ]);

  const heroImageReal = isRealHeroImage(settings.heroImageUrl);
  const heroTitleReal = isRealHeroTitle(settings.heroTitle);
  const homeStates = homeContentSavedStates(settings.homeContentJson);

  // ───────── status por seção ─────────
  const heroStatus: SectionStatus =
    heroImageReal && heroTitleReal ? 'ok' : heroImageReal || heroTitleReal ? 'attention' : 'default';

  const rotatingStatus: SectionStatus = activeRotatingMessages > 0 ? 'ok' : 'pending';
  const categoriesStatus: SectionStatus = categoriesOnHome > 0 ? 'ok' : 'pending';
  const productsStatus: SectionStatus = activeProductsInVitrine > 0 ? 'ok' : 'pending';
  const bannersStatus: SectionStatus = activeBanners > 0 ? 'ok' : 'default';

  const heroBadgesStatus: SectionStatus =
    homeStates.heroBadges === 'configured' ? 'ok' : 'default';
  const trustStatus: SectionStatus =
    homeStates.trustCards === 'configured' ? 'ok' : 'default';
  const howStatus: SectionStatus =
    homeStates.howItWorks === 'configured' ? 'ok' : 'default';

  // ───────── seções da home (na ordem em que aparecem na página pública) ─────────
  const sections: SectionCardData[] = [
    {
      name: 'Faixa rotativa de benefícios',
      type: 'Barra de anúncio',
      status: rotatingStatus,
      metric: activeRotatingMessages > 0
        ? `${activeRotatingMessages} mensagem${activeRotatingMessages === 1 ? '' : 's'} ativa${activeRotatingMessages === 1 ? '' : 's'}`
        : 'Nenhuma mensagem ativa',
      description: 'Frases curtas que rotacionam no topo da loja, reforçando confiança e benefícios.',
      editHref: '/admin/personalizacao#mensagens',
      editLabel: 'Gerenciar mensagens',
    },
    {
      name: 'Hero principal',
      type: 'Topo da home',
      status: heroStatus,
      metric: `Texto ${heroTitleReal ? 'personalizado' : 'padrão'} · Imagem ${heroImageReal ? 'enviada' : 'pendente'}`,
      description: 'Título principal, subtítulo, botões e imagem que abrem a loja.',
      editHref: '/admin/personalizacao#hero',
      editLabel: 'Editar hero',
    },
    {
      name: 'Selos do hero',
      type: 'Hero · destaques',
      status: heroBadgesStatus,
      metric: `${content.heroBadges.length} selo${content.heroBadges.length === 1 ? '' : 's'} · ${homeStates.heroBadges === 'configured' ? 'salvos no banco' : 'usando padrão'}`,
      description: 'Pequenas frases com ícone que aparecem sobre a imagem do hero.',
      editHref: '/admin/conteudo-home#selos',
      editLabel: 'Editar selos',
      inlineAnchor: '#selos',
    },
    {
      name: 'Categorias em destaque',
      type: 'Coleções na home',
      status: categoriesStatus,
      metric: `${categoriesOnHome} coleção(ões) marcadas "Exibir na home"`,
      description: 'Coleções com a flag "Exibir na home" ativa aparecem em destaque na página inicial.',
      editHref: '/admin/categorias',
      editLabel: 'Gerenciar coleções',
    },
    {
      name: 'Vitrine "Novidades"',
      type: 'Vitrine geral',
      status: productsStatus,
      metric: featuredCategoryId
        ? `${activeProductsInVitrine} produto${activeProductsInVitrine === 1 ? '' : 's'} ativo${activeProductsInVitrine === 1 ? '' : 's'} nesta coleção`
        : `${activeProductsInVitrine} produto${activeProductsInVitrine === 1 ? '' : 's'} ativo${activeProductsInVitrine === 1 ? '' : 's'} candidato${activeProductsInVitrine === 1 ? '' : 's'}`,
      description:
        'Aparecem produtos ACTIVE (marcar "Destacar na home" não é obrigatório — só prioriza a ordem). Se uma coleção estiver configurada abaixo, a vitrine se restringe a ela. Além dessa vitrine, coleções com "Exibir na home" ganham a sua própria seção na página inicial.',
      editHref: '/admin/produtos',
      editLabel: 'Ver produtos',
      inlineAnchor: '#vitrine-colecao',
    },
    {
      name: 'Banners promocionais',
      type: 'Banners da home',
      status: bannersStatus,
      metric: `${activeBanners} banner${activeBanners === 1 ? '' : 's'} ativo${activeBanners === 1 ? '' : 's'}`,
      description: 'Cards promocionais com imagem desktop + mobile, título, subtítulo e link de ação.',
      editHref: '/admin/banners',
      editLabel: 'Gerenciar banners',
    },
    {
      name: 'Como funciona',
      type: 'Passos da compra',
      status: howStatus,
      metric: `${content.howItWorks.length} passo${content.howItWorks.length === 1 ? '' : 's'} · ${homeStates.howItWorks === 'configured' ? 'salvos no banco' : 'usando padrão'}`,
      description: 'Sequência de passos que explica como comprar pela loja, do catálogo ao WhatsApp.',
      editHref: '/admin/conteudo-home#como-funciona',
      editLabel: 'Editar passos',
      inlineAnchor: '#como-funciona',
    },
    {
      name: 'Por que comprar conosco',
      type: 'Cards de confiança',
      status: trustStatus,
      metric: `${content.trustCards.length} card${content.trustCards.length === 1 ? '' : 's'} · ${homeStates.trustCards === 'configured' ? 'salvos no banco' : 'usando padrão'}`,
      description: 'Cards com ícone, título e descrição reforçando os diferenciais da loja.',
      editHref: '/admin/conteudo-home#confianca',
      editLabel: 'Editar cards',
      inlineAnchor: '#confianca',
    },
  ];

  // ───────── alertas da página inicial ─────────
  type Alert = { tone: AlertTone; title: string; description: string; href: string; label: string };
  const alerts: Alert[] = [];
  if (!heroImageReal) alerts.push({ tone: 'warning', title: 'Hero sem imagem real', description: 'O topo da home está sem imagem personalizada. Envie uma foto que represente sua marca.', href: '/admin/personalizacao#hero', label: 'Enviar imagem' });
  if (!heroTitleReal) alerts.push({ tone: 'info', title: 'Texto do hero ainda é o padrão', description: 'Personalize o título principal para refletir o tom da sua loja.', href: '/admin/personalizacao#hero', label: 'Editar texto' });
  if (activeRotatingMessages === 0) alerts.push({ tone: 'warning', title: 'Faixa rotativa sem mensagens ativas', description: 'A barra superior aparece vazia. Cadastre ao menos 1 mensagem.', href: '/admin/personalizacao#mensagens', label: 'Adicionar mensagem' });
  if (categoriesOnHome === 0) alerts.push({ tone: 'warning', title: 'Nenhuma coleção marcada para a home', description: 'Marque a flag "Exibir na home" nas coleções que devem aparecer em destaque.', href: '/admin/categorias', label: 'Selecionar coleções' });
  if (!featuredCategoryId && activeProductsInVitrine === 0) {
    alerts.push({
      tone: 'warning',
      title: 'Nenhum produto ACTIVE cadastrado',
      description:
        'A vitrine "Novidades" fica vazia enquanto não houver produtos publicados. Publique um produto ativo para aparecer na home.',
      href: '/admin/produtos',
      label: 'Cadastrar produto',
    });
  } else if (activeProductsInVitrine === 0) {
    alerts.push({
      tone: 'warning',
      title: 'Nenhum produto ACTIVE nesta coleção',
      description:
        'A vitrine "Novidades" está restrita a uma coleção sem produtos ACTIVE. Publique produtos nesta coleção ou remova a restrição abaixo.',
      href: '/admin/produtos',
      label: 'Ver produtos',
    });
  }
  if (activeBanners === 0) alerts.push({ tone: 'info', title: 'Nenhum banner promocional ativo', description: 'Banners não são obrigatórios, mas ajudam a divulgar campanhas. Adicione um para reforçar uma oferta.', href: '/admin/banners', label: 'Criar banner' });
  if (homeStates.heroBadges !== 'configured') alerts.push({ tone: 'info', title: 'Selos do hero usando padrão', description: 'Edite os selos abaixo para refletir os benefícios reais da sua loja.', href: '#selos', label: 'Editar selos' });
  if (homeStates.howItWorks !== 'configured') alerts.push({ tone: 'info', title: 'Passos do "Como funciona" usando padrão', description: 'Personalize os passos para descrever exatamente seu fluxo de compra.', href: '#como-funciona', label: 'Editar passos' });
  if (homeStates.trustCards !== 'configured') alerts.push({ tone: 'info', title: 'Cards "Por que comprar" usando padrão', description: 'Reescreva os cards de confiança com os diferenciais reais da sua loja.', href: '#confianca', label: 'Editar cards' });

  return (
    <div className="space-y-10">
      {/* ─────── Cabeçalho ─────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">Página inicial</h1>
          <p className="mt-1 text-sm text-ink-500">
            Gerencie as seções, textos e destaques da home da sua loja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-ink-300 bg-white px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-ink-100"
          >
            Ver página inicial
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-900"
          >
            Abrir loja
          </Link>
        </div>
      </div>

      {/* ─────── Cards das seções ─────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900 md:text-lg">Seções da home</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Ordem em que aparecem na loja. Cada bloco mostra status e leva ao editor certo.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {sections.map((sec, i) => (
            <SectionCard key={sec.name} data={sec} position={i + 1} />
          ))}
        </div>
      </section>

      {/* ─────── Alertas ─────── */}
      {alerts.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-extrabold text-ink-900 md:text-lg">Atenção necessária</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Ajustes recomendados para a home parecer profissional ao cliente.
            </p>
          </div>
          <div className="grid gap-2">
            {alerts.map((a, i) => (
              <AlertRow
                key={`${a.title}-${i}`}
                tone={a.tone}
                title={a.title}
                description={a.description}
                actionHref={a.href}
                actionLabel={a.label}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─────── Coleção da vitrine principal ─────── */}
      <section className="space-y-3" id="vitrine-colecao">
        <div>
          <h2 className="text-base font-extrabold text-ink-900 md:text-lg">
            Vitrine principal
          </h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Configure qual coleção alimenta a seção &quot;Novidades para sua viagem&quot;.
          </p>
        </div>
        <HomeFeaturedCategoryForm
          categories={allCategories
            .filter((c) => c.status === 'ACTIVE')
            .map((c) => ({ id: c.id, name: c.name }))}
          initial={featuredCategoryId}
        />
      </section>

      {/* ─────── Edição inline das 3 seções textuais ─────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-extrabold text-ink-900 md:text-lg">Conteúdo editável da home</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Edite aqui os selos do hero, os cards &quot;Por que comprar&quot; e os passos do &quot;Como funciona&quot;.
          </p>
        </div>
        <HomeContentForm initial={content} />
      </section>
    </div>
  );
}
