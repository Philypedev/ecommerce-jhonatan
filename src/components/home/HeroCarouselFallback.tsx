import Link from 'next/link';
import { ChevronRight } from '@/components/ui/Icon';

type Props = {
  /**
   * Rota para o botão "Ver produtos". Idealmente o slug da primeira coleção
   * ativa; se não houver, cai em `/categoria/ofertas` ou raiz.
   */
  ctaHref: string;
};

/**
 * Fallback do carrossel principal — mostra o mesmo card grande, no mesmo
 * tamanho/proporção, quando o lojista ainda não cadastrou nenhum banner
 * ativo em `main_carousel`. Visual limpo e premium (sem o hero antigo).
 */
export const HeroCarouselFallback = ({ ctaHref }: Props) => (
  <section
    aria-label="Destaque principal"
    className="container-x pt-4 md:pt-6"
  >
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-100 shadow-cardHover">
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/7]">
        {/* Camada decorativa — pontos radiais suaves */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(rgba(0,115,150,0.10) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* Halo brand no canto */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl"
        />

        {/* Conteúdo */}
        <div className="absolute inset-0 flex items-end sm:items-center">
          <div className="w-full px-6 pb-8 sm:pb-0 md:px-14">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-900 backdrop-blur">
                Bem-vindo
              </span>
              <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-5xl">
                Sua próxima viagem começa aqui
              </h2>
              <p className="mt-3 max-w-lg text-balance text-sm text-ink-700 md:text-base">
                Produtos selecionados para viajar com mais praticidade, tecnologia e segurança.
              </p>
              <div className="mt-5">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-1 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:translate-x-0.5 hover:bg-brand-900"
                >
                  Ver produtos
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
