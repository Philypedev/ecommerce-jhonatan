'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SearchIcon } from '@/components/ui/Icon';
import { formatCurrency } from '@/utils/formatCurrency';

type SuggestionItem = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image: string;
  category: string;
};

type Props = {
  /** 'desktop' usa o estilo da barra inline do header lg+, 'mobile' usa o estilo do drawer de busca */
  variant: 'desktop' | 'mobile';
  /** chamado quando o usuário finaliza a busca (submete ou clica num item) */
  onClose?: () => void;
};

const DEBOUNCE_MS = 220;

export const HeaderSearch = ({ variant, onClose }: Props) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SuggestionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // ---------- Busca com debounce ----------
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const data: { items: SuggestionItem[]; total: number } = await res.json();
        setItems(data.items);
        setTotal(data.total);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  // ---------- Fecha ao clicar fora ----------
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // ---------- Esc fecha ----------
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const term = query.trim();
      if (!term) return;
      onClose?.();
      window.location.href = `/busca?q=${encodeURIComponent(term)}`;
    },
    [query, onClose],
  );

  const handleItemClick = () => {
    setOpen(false);
    onClose?.();
  };

  const showDropdown = open && query.trim().length >= 2;
  const hasResults = items.length > 0;

  const formClass =
    variant === 'desktop'
      ? 'ml-4 hidden flex-1 items-center rounded-full border border-ink-300 bg-white pl-4 pr-1 focus-within:border-brand-700 lg:flex'
      : 'flex items-center gap-2 rounded-full border border-ink-300 bg-white px-3';

  return (
    <div ref={containerRef} className={`relative ${variant === 'desktop' ? 'ml-4 hidden flex-1 lg:block' : 'w-full'}`}>
      <form
        onSubmit={submit}
        role="search"
        className={
          variant === 'desktop'
            ? 'flex items-center rounded-full border border-ink-300 bg-white pl-4 pr-1 focus-within:border-brand-700'
            : formClass
        }
      >
        <SearchIcon className="text-ink-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={
            variant === 'desktop'
              ? 'O que você procura? Malas, mochilas, adaptadores...'
              : 'Buscar produtos...'
          }
          className="h-11 w-full bg-transparent px-3 text-sm outline-none placeholder:text-ink-500"
          aria-label="Buscar produtos"
          aria-controls={listboxId}
          autoComplete="off"
        />
        {variant === 'desktop' ? (
          <button type="submit" className="btn-primary h-9 rounded-full px-4">
            Buscar
          </button>
        ) : (
          <button type="submit" className="btn-primary h-9 rounded-full px-4">
            Ok
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-2xl"
        >
          {loading && items.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink-500">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-brand-700" />
              Buscando...
            </div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-ink-500">
              Nenhum produto encontrado para{' '}
              <span className="font-semibold text-ink-900">&ldquo;{query.trim()}&rdquo;</span>
            </div>
          )}

          {hasResults && (
            <>
              <ul className="max-h-[60vh] divide-y divide-ink-100 overflow-y-auto">
                {items.map((it) => {
                  const outOfStock = it.stock <= 0;
                  return (
                    <li key={it.id}>
                      <Link
                        href={`/produto/${it.slug}`}
                        onClick={handleItemClick}
                        className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ink-100/60"
                        role="option"
                      >
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-ink-100">
                          <Image
                            src={it.image}
                            alt={it.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </span>
                        <span className="flex flex-1 flex-col min-w-0">
                          <span className="line-clamp-1 text-sm font-semibold text-ink-900">
                            {it.name}
                          </span>
                          <span className="text-[11px] text-ink-500">
                            {it.category} · SKU {it.sku}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          {outOfStock ? (
                            <span className="text-[11px] font-semibold text-amber-700">
                              Sob consulta
                            </span>
                          ) : (
                            <span className="text-sm font-extrabold text-ink-900">
                              {formatCurrency(it.price)}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => submit()}
                className="block w-full border-t border-ink-100 bg-ink-100/40 px-4 py-3 text-left text-sm font-semibold text-brand-700 hover:bg-ink-100"
              >
                Ver todos os {total} resultado{total === 1 ? '' : 's'} para &ldquo;{query.trim()}
                &rdquo; →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
