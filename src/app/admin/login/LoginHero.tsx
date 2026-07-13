/**
 * Painel esquerdo do login — premium hero com:
 *  - fundo escuro brand-950 + camadas de "aurora" (blobs desfocados animados)
 *  - grid de pontos discreto (SVG data-uri, zero request extra)
 *  - headline forte + subtítulo + benefícios + selo de segurança
 *
 * Tudo em CSS. Animações respeitam `prefers-reduced-motion` via
 * classes `motion-reduce:animate-none`.
 */

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const BENEFITS: { label: string; hint: string }[] = [
  { label: 'Pedidos e atendimento',      hint: 'Acompanhe cada pedido pelo WhatsApp em um só lugar.' },
  { label: 'Produtos e coleções',        hint: 'Catálogo, estoque e destaques com poucos cliques.' },
  { label: 'Página inicial e banners',   hint: 'Personalize hero, faixas e vitrines sem tocar em código.' },
  { label: 'SEO e configurações',        hint: 'Meta, GA4, Pixel e formas de pagamento no controle certo.' },
];

/** Grid discreto de pontos, embutido como data-URI (nada a baixar). */
const DOT_GRID_BG =
  'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)';

export const LoginHero = ({
  storeName,
  logoUrl,
}: {
  storeName: string;
  logoUrl?: string | null;
}) => (
  <aside
    aria-hidden={false}
    className="relative isolate hidden overflow-hidden bg-brand-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12"
  >
    {/* Camada 1 — blobs desfocados (aurora) */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute -left-24 top-8 h-[360px] w-[360px] rounded-full bg-brand-500/40 blur-3xl animate-blob-a motion-reduce:animate-none"
      />
      <div
        className="absolute right-[-8%] top-1/3 h-[420px] w-[420px] rounded-full bg-brand-700/50 blur-3xl animate-blob-b motion-reduce:animate-none"
      />
      <div
        className="absolute bottom-[-10%] left-1/3 h-[380px] w-[380px] rounded-full bg-cyan-400/25 blur-3xl animate-blob-c motion-reduce:animate-none"
      />
      {/* Vignette suave por cima pra escurecer as bordas */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
    </div>

    {/* Camada 2 — grid de pontos discreto */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-60"
      style={{ backgroundImage: DOT_GRID_BG, backgroundSize: '22px 22px' }}
    />

    {/* Topo — logotipo/marca + selo */}
    <header className="animate-fade-in-up">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            className="h-10 w-auto max-w-[160px] object-contain"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur"
          >
            <span className="text-sm font-black tracking-tight text-white">
              {storeName.slice(0, 1).toUpperCase()}
            </span>
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{storeName}</p>
          <p className="text-[11px] font-medium uppercase tracking-widest text-white/60">
            Painel administrativo
          </p>
        </div>
      </div>

      <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/80 backdrop-blur">
        <ShieldIcon className="text-emerald-300" />
        Acesso seguro
      </div>
    </header>

    {/* Centro — headline + subtítulo + benefícios */}
    <div className="mt-10 max-w-lg animate-fade-in-up [animation-delay:80ms]">
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
        Gerencie sua loja com{' '}
        <span className="bg-gradient-to-r from-cyan-200 via-white to-brand-100 bg-clip-text text-transparent">
          mais controle
        </span>
        .
      </h2>
      <p className="mt-3 text-base leading-relaxed text-white/70">
        Pedidos, catálogo, conteúdo e configurações — um só lugar, feito para operar seu ecommerce
        com clareza e velocidade.
      </p>

      <ul className="mt-8 space-y-3">
        {BENEFITS.map((b, i) => (
          <li
            key={b.label}
            className="flex items-start gap-3 animate-fade-in-up"
            style={{ animationDelay: `${160 + i * 60}ms` }}
          >
            <span
              aria-hidden
              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-300/30"
            >
              <CheckIcon className="text-emerald-300" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{b.label}</p>
              <p className="text-xs text-white/60">{b.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>

    {/* Rodapé — micro-copy institucional */}
    <footer className="mt-10 animate-fade-in-up [animation-delay:420ms]">
      <p className="text-[11px] leading-relaxed text-white/50">
        Ambiente restrito à equipe responsável pela operação. Todas as ações ficam registradas
        para auditoria.
      </p>
    </footer>
  </aside>
);
