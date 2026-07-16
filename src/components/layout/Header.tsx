'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  SearchIcon,
  CartIcon,
  MenuIcon,
  CloseIcon,
  WhatsAppIcon,
  TruckIcon,
  HeadsetIcon,
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
  const pathname = usePathname();
  const closeMobile = () => setMobileOpen(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const count = hydrated ? cartItemsCount(lines) : 0;

  const trackHeaderContact = () =>
    trackEvent('Contact', { source: 'header_whatsapp' });

  // Trava scroll do body enquanto o drawer estiver aberto.
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  // ESC fecha o drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Ao abrir, move o foco para o botão fechar (acessibilidade + evita foco
  // preso no botão do hambúrguer que fica atrás do drawer).
  useEffect(() => {
    if (mobileOpen) closeButtonRef.current?.focus();
  }, [mobileOpen]);

  // Marca link como ativo (destaque discreto) — pathname exato ou prefixo
  // para páginas dinâmicas como /categoria/[slug].
  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          {/* Overlay escuro — clique fora fecha */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeMobile}
            aria-hidden
          />

          {/* Drawer da esquerda */}
          <div className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl animate-slide-in-left">
            {/* ─── Header do drawer: logo + fechar ─── */}
            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
              <Link href="/" onClick={closeMobile} aria-label="Ir para a página inicial">
                <Logo
                  shortName={config.shortName}
                  logoUrl={config.logoUrl}
                  size={config.logoSize}
                />
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMobile}
                aria-label="Fechar menu"
                className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink-700 transition-colors hover:bg-ink-100"
              >
                <CloseIcon />
              </button>
            </div>

            {/* ─── Busca — reaproveita HeaderSearch/mobile ─── */}
            <div className="border-b border-ink-100 bg-ink-100/40 p-3">
              <HeaderSearch variant="mobile" onClose={closeMobile} />
            </div>

            {/* ─── Navegação scrollável ─── */}
            <nav
              className="flex-1 overflow-y-auto overscroll-contain"
              aria-label="Navegação principal"
            >
              {/* Links principais */}
              <MobileSection title="Navegar">
                <MobileLink href="/"          label="Início"     active={isActive('/')}          onClose={closeMobile} />
                <MobileLink href="/sobre"     label="Quem somos" active={isActive('/sobre')}     onClose={closeMobile} />
                <MobileLink href="/contato"   label="Contato"    active={isActive('/contato')}   onClose={closeMobile} />
                <MobileLink href="/politicas" label="Políticas"  active={isActive('/politicas')} onClose={closeMobile} />
              </MobileSection>

              {/* Coleções — só renderiza se houver categorias ativas */}
              {categories.length > 0 && (
                <MobileSection title="Coleções">
                  {categories.map((c) => (
                    <MobileLink
                      key={c.slug}
                      href={`/categoria/${c.slug}`}
                      label={c.name}
                      active={isActive(`/categoria/${c.slug}`)}
                      onClose={closeMobile}
                      highlight={c.highlight}
                    />
                  ))}
                </MobileSection>
              )}

              {/* Institucional — atalhos secundários */}
              <MobileSection title="Institucional">
                <MobileLink href="/faq"       label="Perguntas frequentes" active={isActive('/faq')}       onClose={closeMobile} />
                <MobileLink href="/garantia"  label="Garantia"             active={isActive('/garantia')}  onClose={closeMobile} />
                <MobileLink href="/termos"    label="Termos de uso"        active={isActive('/termos')}    onClose={closeMobile} />
              </MobileSection>
            </nav>

            {/* ─── Ações principais: WhatsApp + Carrinho ─── */}
            <div className="border-t border-ink-100 p-3 pb-4">
              <a
                href={`https://wa.me/${config.whatsapp}`}
                onClick={() => {
                  trackHeaderContact();
                  closeMobile();
                }}
                target="_blank"
                rel="noreferrer"
                className="btn-accent flex h-12 w-full items-center justify-center gap-2 text-base"
              >
                <WhatsAppIcon size={20} />
                Falar no WhatsApp
              </a>

              <button
                type="button"
                onClick={() => {
                  closeMobile();
                  openCart();
                }}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-ink-300 bg-white text-base font-semibold text-ink-900 transition-colors hover:bg-ink-100"
              >
                <CartIcon size={18} />
                Ver carrinho
                {count > 0 && (
                  <span className="grid h-6 min-w-[1.5rem] place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>

              {/* Informações rápidas — reforço visual */}
              <div className="mt-4 grid gap-2 rounded-lg bg-ink-100/50 p-3 text-xs text-ink-700">
                <span className="flex items-center gap-2">
                  <TruckIcon size={16} className="shrink-0 text-brand-700" />
                  Entrega para todo o Brasil
                </span>
                <span className="flex items-center gap-2">
                  <HeadsetIcon size={16} className="shrink-0 text-brand-700" />
                  Atendimento humano via WhatsApp
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// ─────────────────────────── Helpers do drawer ───────────────────────────

const MobileSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="border-b border-ink-100 last:border-b-0">
    <p className="px-4 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
      {title}
    </p>
    <ul className="pb-2">{children}</ul>
  </div>
);

const MobileLink = ({
  href,
  label,
  active,
  highlight,
  onClose,
}: {
  href: string;
  label: string;
  active?: boolean;
  highlight?: boolean;
  onClose: () => void;
}) => (
  <li>
    <Link
      href={href}
      onClick={onClose}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
        active
          ? 'bg-brand-50 font-semibold text-brand-800'
          : highlight
            ? 'font-semibold text-brand-700 hover:bg-ink-100'
            : 'text-ink-900 hover:bg-ink-100'
      }`}
    >
      <span>{label}</span>
      {active && (
        <span
          aria-hidden
          className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-brand-700"
        />
      )}
    </Link>
  </li>
);
