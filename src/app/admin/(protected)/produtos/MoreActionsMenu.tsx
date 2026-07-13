'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Props = {
  /** Query string atual da listagem (ex.: "?status=ACTIVE&sort=name-asc") */
  currentQuery: string;
};

export const MoreActionsMenu = ({ currentQuery }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const exportUrlFiltered = `/api/admin/products/export${currentQuery || ''}`;
  const exportUrlAll = `/api/admin/products/export`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn-outline"
      >
        Mais ações ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-cardHover"
        >
          <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Exportar CSV
          </p>
          <a
            href={exportUrlFiltered}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ink-900 hover:bg-ink-100"
          >
            Exportar produtos filtrados
          </a>
          <a
            href={exportUrlAll}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ink-900 hover:bg-ink-100"
          >
            Exportar todos os produtos
          </a>
          <div className="my-1 border-t border-ink-100" />
          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ink-900 hover:bg-ink-100"
          >
            Ver loja
          </Link>
        </div>
      )}
    </div>
  );
};
