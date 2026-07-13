import Link from 'next/link';
import { Logo } from './Logo';
import {
  WhatsAppIcon,
  MailIcon,
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  ShieldIcon,
} from '@/components/ui/Icon';
import type { SiteRuntimeConfig } from '@/lib/db/settings';

type Props = {
  config: SiteRuntimeConfig;
  categories?: { slug: string; name: string }[];
};

export const Footer = ({ config, categories = [] }: Props) => {
  return (
    <footer className="mt-20 bg-brand-950 text-brand-50">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Logo light shortName={config.shortName} logoUrl={config.logoUrl} size={config.logoSize} />
          <p className="mt-4 text-sm leading-relaxed text-brand-100/80">
            {config.footerText || config.description}
          </p>
          <div className="mt-5 flex items-center gap-3 text-brand-100">
            {config.socials.instagram && (
              <a aria-label="Instagram" href={config.socials.instagram} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full border border-white/20 hover:bg-white/10">
                <InstagramIcon />
              </a>
            )}
            {config.socials.facebook && (
              <a aria-label="Facebook" href={config.socials.facebook} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full border border-white/20 hover:bg-white/10">
                <FacebookIcon />
              </a>
            )}
            {config.socials.youtube && (
              <a aria-label="YouTube" href={config.socials.youtube} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full border border-white/20 hover:bg-white/10">
                <YoutubeIcon />
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100/70">Categorias</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/categoria/${c.slug}`} className="text-brand-50/90 hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100/70">Institucional</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/sobre" className="text-brand-50/90 hover:text-white">Quem somos</Link></li>
            <li><Link href="/contato" className="text-brand-50/90 hover:text-white">Contato</Link></li>
            <li><Link href="/faq" className="text-brand-50/90 hover:text-white">Perguntas frequentes</Link></li>
            <li><Link href="/politicas" className="text-brand-50/90 hover:text-white">Política de entrega e troca</Link></li>
            <li><Link href="/garantia" className="text-brand-50/90 hover:text-white">Garantia</Link></li>
            <li><Link href="/termos" className="text-brand-50/90 hover:text-white">Termos de uso</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-brand-100/70">Atendimento</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-brand-50 hover:text-white">
                <WhatsAppIcon size={16} />
                {config.whatsappDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${config.email}`} className="inline-flex items-center gap-2 text-brand-50 hover:text-white">
                <MailIcon size={16} />
                {config.email}
              </a>
            </li>
            {config.businessHours && <li className="text-brand-100/80">{config.businessHours}</li>}
          </ul>

          <a
            href={`https://wa.me/${config.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="btn-accent mt-5 w-full"
          >
            <WhatsAppIcon size={18} />
            Falar com especialista
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-start justify-between gap-3 py-5 text-xs text-brand-100/70 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <ShieldIcon size={16} />
            <span>Compra segura · Atendimento humano · Confirmação por WhatsApp</span>
          </div>
          <p>© {new Date().getFullYear()} {config.name}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};
