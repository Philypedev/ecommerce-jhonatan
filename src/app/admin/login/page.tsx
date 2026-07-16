import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/db/settings';
import { siteConfig } from '@/config/site';
import { LoginForm } from './LoginForm';
import { LoginHero } from './LoginHero';

export const metadata: Metadata = {
  title: 'Entrar — Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  // Personaliza o hero com o nome da loja + logo real, se configurados. Cai
  // pro siteConfig se o banco ainda não retornar (fresh install, erro).
  let storeName: string = siteConfig.shortName;
  let logoUrl: string | null = null;
  try {
    const settings = await getStoreSettings();
    if (settings.shortName?.trim()) storeName = settings.shortName;
    // Só usa a logo se for URL real (não placeholder).
    if (settings.logoUrl && !/placeholder/i.test(settings.logoUrl)) {
      logoUrl = settings.logoUrl;
    }
  } catch {
    /* silencioso — usa fallback */
  }

  return (
    <main className="relative grid min-h-screen bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Painel esquerdo — hero premium (desktop) */}
      <LoginHero storeName={storeName} logoUrl={logoUrl} />

      {/* Painel direito — card de login. No mobile o conteúdo ancora no topo
          com pouco padding pra caber tudo sem parecer "perdido no branco";
          no lg volta a centralizar verticalmente. */}
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-white px-4 pt-7 pb-10 sm:px-8 sm:pt-10 sm:pb-14 lg:min-h-0 lg:justify-center lg:py-16">
        {/* Radial suave de fundo — leve halo brand no canto */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_100%_-10%,rgba(0,115,150,0.08),transparent_50%)]"
        />

        {/* Cabeçalho mobile — mais presente, com divisória sutil */}
        <header className="mx-auto mb-7 flex w-full max-w-md items-center justify-between border-b border-ink-100 pb-5 lg:hidden animate-fade-in-up">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={storeName}
                className="h-11 w-auto max-w-[150px] object-contain"
              />
            ) : (
              // Fallback padrão: símbolo oficial TravelTech (PNG).
              <span aria-hidden className="relative h-11 w-11 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/traveltech-mark.png"
                  alt={storeName}
                  className="h-11 w-11 object-contain"
                />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-tight text-ink-900">{storeName}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-500">
                Painel administrativo
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
            <ShieldIcon />
            Seguro
          </span>
        </header>

        {/* Card premium — sombra levemente mais firme no mobile pra "ancorar"
            visualmente sobre o fundo branco; no desktop mantém a sombra sutil. */}
        <div className="mx-auto w-full max-w-md animate-fade-in-up [animation-delay:60ms]">
          <div className="rounded-3xl border border-ink-100 bg-white/95 p-7 shadow-[0_2px_4px_rgba(15,23,42,0.05),0_20px_50px_-20px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-9 lg:p-10 lg:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_-24px_rgba(15,23,42,0.20)]">
            {/* label pequeno acima do título */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-900">
              <ShieldIcon />
              Acesso administrativo
            </span>

            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              Acesse o painel
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Use suas credenciais para acessar a gestão da loja — pedidos, produtos e conteúdo em um só lugar.
            </p>

            <LoginForm redirectTo={redirect} />
          </div>

          {/* Rodapé fino */}
          <p className="mt-5 text-center text-[11px] text-ink-500">
            © {new Date().getFullYear()} {storeName} · Painel de gestão da loja
          </p>
        </div>
      </section>
    </main>
  );
}
