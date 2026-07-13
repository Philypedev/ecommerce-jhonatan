'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { CloseIcon, MenuIcon } from '@/components/ui/Icon';
import { ConfirmProvider } from './ConfirmDialog';
import { ToastProvider } from './Toaster';

type NavItem = { href: string; label: string; icon: React.ReactNode };

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: 'Painel',
    items: [
      { href: '/admin', label: 'Visão geral', icon: <Icon d="M3 12 12 4l9 8M5 10v10h14V10" /> },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { href: '/admin/pedidos', label: 'Pedidos', icon: <Icon d="M5 7h14l-1.5 12h-11Z M9 7V4h6v3" /> },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/admin/produtos', label: 'Produtos', icon: <Icon d="M4 7h16v4H4zM4 13h16v8H4zM9 4h6v3H9z" /> },
      { href: '/admin/categorias', label: 'Coleções', icon: <Icon d="M3 12V4h8l10 10-8 8L3 12Z" /> },
    ],
  },
  {
    title: 'Loja',
    items: [
      { href: '/admin/personalizacao', label: 'Identidade visual', icon: <Icon d="M4 18 14 8l3 3-10 10H4ZM14 4l6 6" /> },
      { href: '/admin/banners', label: 'Banners', icon: <Icon d="M3 6h18v12H3zM3 10h18M9 14h6" /> },
      { href: '/admin/conteudo-home', label: 'Página inicial', icon: <Icon d="M3 9l9-6 9 6v12H3zM9 21V12h6v9" /> },
      { href: '/admin/paginas', label: 'Páginas institucionais', icon: <Icon d="M6 3h9l4 4v14H6zM14 3v5h5" /> },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { href: '/admin/seo', label: 'SEO e compartilhamento', icon: <Icon d="M3 6h18M3 12h18M3 18h12" /> },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/admin/configuracoes', label: 'Configurações da loja', icon: <Icon d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M19 12a7 7 0 0 0-.1-1.2l2.1-1.6-2-3.4-2.4 1a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2l-2.4-1-2 3.4 2.1 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2.1 1.6 2 3.4 2.4-1a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.6a7 7 0 0 0 2.1-1.2l2.4 1 2-3.4-2.1-1.6c.1-.4.1-.8.1-1.2Z" /> },
    ],
  },
];

type BrandInfo = {
  shortName: string;
  logoUrl: string | null;
};

/** Marca renderizada no topo da sidebar/topbar. Mostra a logo configurada
 *  em /admin/personalizacao quando ela existe; caso contrário, fica o
 *  ícone genérico como fallback. O `gap-3` interno controla o espaçamento
 *  entre logo e texto independentemente do gap do parent. */
const BrandMark = ({ shortName, logoUrl }: BrandInfo) => (
  <div className="flex items-center gap-3">
    {logoUrl ? (
      <span className="relative h-11 w-11 shrink-0">
        <Image
          src={logoUrl}
          alt={shortName}
          fill
          sizes="44px"
          className="object-contain"
        />
      </span>
    ) : (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-900 text-white">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M3 12h4l2-4 4 8 2-4h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )}
    <span className="truncate text-base font-extrabold text-brand-900">
      Painel {shortName}
    </span>
  </div>
);

export const AdminShell = ({
  user,
  brand = { shortName: 'TravelTech', logoUrl: null },
  children,
}: {
  user: { email: string; name?: string };
  brand?: BrandInfo;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderNav = (onClick?: () => void) => (
    <nav className="space-y-5" aria-label="Menu admin">
      {navGroups.map((group, idx) => (
        <div key={group.title} className={idx === 0 ? '' : ''}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-300">
            {group.title}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClick}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-900 text-white'
                        : 'text-ink-700 hover:bg-ink-100'
                    }`}
                  >
                    <span className={active ? 'text-white' : 'text-ink-500'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <ToastProvider>
      <ConfirmProvider>
    <div className="min-h-screen bg-ink-100/50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-5">
          <BrandMark {...brand} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">{renderNav()}</div>
        <div className="border-t border-ink-100 p-3">
          <div className="mb-2 px-3 text-xs text-ink-500">
            <p className="font-medium text-ink-900 truncate">{user.name || user.email}</p>
            <p className="truncate">{user.email}</p>
          </div>
          <Link
            href="/admin/conta"
            className="mb-2 block rounded-md px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            Minha conta
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="btn-outline w-full text-sm">Sair</button>
          </form>
        </div>
      </aside>

      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-100 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-md text-ink-700 hover:bg-ink-100"
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </button>
          <BrandMark {...brand} />
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-xs font-semibold text-ink-700 hover:text-ink-900">Sair</button>
        </form>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-ink-100 px-4">
              <div className="flex items-center gap-2">
                <BrandMark {...brand} />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar"
                className="grid h-9 w-9 place-items-center rounded-md hover:bg-ink-100"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{renderNav(() => setMobileOpen(false))}</div>
          </aside>
        </div>
      )}

      {/* Content */}
      <div className="lg:pl-64">
        <main className="container-x py-8">{children}</main>
      </div>
    </div>
      </ConfirmProvider>
    </ToastProvider>
  );
};
