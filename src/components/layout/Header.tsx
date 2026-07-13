'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import {
  SearchIcon,
  CartIcon,
  MenuIcon,
  CloseIcon,
  WhatsAppIcon,
} from '@/components/ui/Icon';
import { useCart, cartItemsCount } from '@/store/cart';
import type { SiteRuntimeConfig } from '@/lib/db/settings';
import { trackEvent } from '@/lib/analytics';
import { HeaderSearch } from './HeaderSearch';

export type HeaderCategoryLink = { slug: string; name: string; highlight?: boolean };

type Props = {
  config: SiteRuntimeConfig;
  categories: HeaderCategoryLink[];
};

export const Header = ({ config, categories }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const openCart = useCart((s) => s.open);

  const count = hydrated ? cartItemsCount(lines) : 0;

  const trackHeaderContact = () =>
    trackEvent('Contact', { source: 'header_whatsapp' });

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {/* Top bar */}
      <div className="hidden border-b border-ink-100 bg-brand-900 text-brand-50 md:block">
        <div className="container-x flex h-9 items-center justify-between text-xs">
          <span>Entrega para todo o Brasil · Atendimento humano via WhatsApp</span>
          <div className="flex items-center gap-4">
            <a href={`mailto:${config.email}`} className="hover:text-white">
              {config.email}
            </a>
            <a
              href={`https://wa.me/${config.whatsapp}`}
              onClick={trackHeaderContact}
              className="inline-flex items-center gap-1 hover:text-white"
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppIcon size={14} />
              {config.whatsappDisplay}
            </a>
          </div>
        </div>
      </div>

      <div className="container-x flex h-16 items-center gap-3 lg:gap-6">
        <button
          type="button"
          className="-ml-2 grid h-10 w-10 place-items-center rounded-md text-ink-700 hover:bg-ink-100 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <MenuIcon />
        </button>

        <Logo shortName={config.shortName} logoUrl={config.logoUrl} size={config.logoSize} />

        <HeaderSearch variant="desktop" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md text-ink-700 hover:bg-ink-100 lg:hidden"
            aria-label="Buscar"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <SearchIcon />
          </button>

          <a
            href={`https://wa.me/${config.whatsapp}`}
            onClick={trackHeaderContact}
            target="_blank"
            rel="noreferrer"
            className="hidden h-10 items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-dark sm:inline-flex"
            aria-label="Falar no WhatsApp"
          >
            <WhatsAppIcon size={18} />
            <span className="hidden md:inline">WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={openCart}
            className="relative grid h-10 w-10 place-items-center rounded-md text-ink-900 hover:bg-ink-100"
            aria-label={`Abrir carrinho${count ? `, ${count} ${count === 1 ? 'item' : 'itens'}` : ''}`}
          >
            <CartIcon />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav className="hidden border-t border-ink-100 bg-white lg:block" aria-label="Categorias">
        <div className="container-x flex h-11 items-center gap-1 overflow-x-auto text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 font-semibold text-ink-900 hover:bg-ink-100">
            Início
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categoria/${c.slug}`}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 hover:bg-ink-100 ${
                c.highlight ? 'font-semibold text-brand-700' : 'text-ink-700'
              }`}
            >
              {c.name}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px bg-ink-300" />
          <Link href="/sobre" className="whitespace-nowrap rounded-md px-3 py-1.5 text-ink-700 hover:bg-ink-100">
            Quem somos
          </Link>
          <Link href="/contato" className="whitespace-nowrap rounded-md px-3 py-1.5 text-ink-700 hover:bg-ink-100">
            Contato
          </Link>
          <Link href="/politicas" className="whitespace-nowrap rounded-md px-3 py-1.5 text-ink-700 hover:bg-ink-100">
            Políticas
          </Link>
        </div>
      </nav>

      {searchOpen && (
        <div className="border-t border-ink-100 bg-white p-3 lg:hidden">
          <HeaderSearch variant="mobile" onClose={() => setSearchOpen(false)} />
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <Logo shortName={config.shortName} logoUrl={config.logoUrl} size={config.logoSize} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="grid h-10 w-10 place-items-center rounded-md hover:bg-ink-100"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Menu principal">
              <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-ink-500">
                Categorias
              </p>
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/categoria/${c.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900 hover:bg-ink-100"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="px-2 pb-2 pt-5 text-xs font-bold uppercase tracking-wide text-ink-500">
                Institucional
              </p>
              <ul className="space-y-1">
                <li><Link href="/sobre" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100">Quem somos</Link></li>
                <li><Link href="/contato" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100">Contato</Link></li>
                <li><Link href="/faq" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100">FAQ</Link></li>
                <li><Link href="/politicas" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100">Políticas</Link></li>
                <li><Link href="/garantia" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100">Garantia</Link></li>
                <li><Link href="/termos" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-100">Termos de uso</Link></li>
              </ul>
            </nav>
            <div className="border-t border-ink-100 p-3">
              <a
                href={`https://wa.me/${config.whatsapp}`}
                onClick={trackHeaderContact}
                target="_blank"
                rel="noreferrer"
                className="btn-accent w-full"
              >
                <WhatsAppIcon size={18} />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
