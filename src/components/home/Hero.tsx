import Link from 'next/link';
import Image from 'next/image';
import { WhatsAppIcon } from '@/components/ui/Icon';
import { HomeIcon } from './HomeIcon';
import type { SiteRuntimeConfig } from '@/lib/db/settings';
import type { HeroBadge } from '@/lib/homeContent';

const DEFAULT_HERO_IMG =
  'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&w=1400&q=70';

type Props = {
  config: SiteRuntimeConfig;
  badges: HeroBadge[];
};

export const Hero = ({ config, badges }: Props) => {
  const heroImg = config.hero.imageUrl || DEFAULT_HERO_IMG;

  return (
    <section className="relative overflow-hidden bg-brand-950 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          background:
            'radial-gradient(60% 50% at 80% 20%, rgba(14,165,233,0.30) 0%, transparent 60%), radial-gradient(40% 40% at 10% 90%, rgba(34,197,94,0.18) 0%, transparent 60%)',
        }}
      />

      <div className="container-x relative grid gap-10 py-12 md:grid-cols-2 md:items-center md:py-20">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-100 ring-1 ring-white/15 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Curadoria em viagem &amp; tecnologia útil
          </span>

          <h1 className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            {config.hero.title}
          </h1>

          <p className="mt-4 max-w-lg text-balance text-base text-brand-100/85 md:text-lg">
            {config.hero.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="#produtos" className="btn-accent h-12 px-5 text-base">
              {config.hero.primaryCta}
            </Link>
            <a
              href={`https://wa.me/${config.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="btn h-12 border border-white/20 bg-white/5 px-5 text-base text-white hover:bg-white/10 focus-visible:ring-white/30"
            >
              <WhatsAppIcon size={20} />
              {config.hero.secondaryCta}
            </a>
          </div>

          {badges.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
              {badges.map((b) => (
                <li key={b.label} className="flex items-start gap-2 text-brand-100/90">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-accent ring-1 ring-white/10">
                    <HomeIcon name={b.icon} size={18} />
                  </span>
                  <span className="leading-tight">{b.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-brand-500/30 via-transparent to-accent/20 blur-2xl" aria-hidden />
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-2xl">
            <Image
              src={heroImg}
              alt={config.hero.title}
              fill
              priority
              sizes="(min-width: 1024px) 560px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-ink-900 shadow-lg ring-1 ring-black/5">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-brand-700">Em destaque</span>
            Essenciais de viagem com pronta entrega
          </div>
        </div>
      </div>
    </section>
  );
};
