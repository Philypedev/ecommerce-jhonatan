'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCart, cartSubtotal, cartLineKey } from '@/store/cart';
import { formatCurrency } from '@/utils/formatCurrency';
import { CartItem } from './CartItem';
import { CartIcon, CloseIcon, WhatsAppIcon } from '@/components/ui/Icon';

export const CartDrawer = () => {
  const isOpen = useCart((s) => s.isOpen);
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const close = useCart((s) => s.close);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const subtotal = cartSubtotal(lines);
  const isEmpty = !hydrated || lines.length === 0;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Carrinho">
      <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="inline-flex items-center gap-2 text-base font-bold text-ink-900">
            <CartIcon size={20} /> Seu carrinho
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar carrinho"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-ink-100"
          >
            <CloseIcon />
          </button>
        </header>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-ink-100 text-ink-500">
              <CartIcon size={28} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink-900">Seu carrinho está vazio</h3>
            <p className="mt-1 text-sm text-ink-500">
              Explore nossos produtos selecionados com pronta entrega.
            </p>
            <button type="button" onClick={close} className="btn-primary mt-5">
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5">
              {lines.map((line) => (
                <CartItem
                  key={cartLineKey({ productId: line.productId, variantId: line.variantId })}
                  line={line}
                  onNavigate={close}
                />
              ))}
            </ul>

            <footer className="border-t border-ink-100 bg-white p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="text-base font-extrabold text-ink-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Frete e disponibilidade serão confirmados pelo WhatsApp.
              </p>

              <Link
                href="/checkout"
                onClick={close}
                className="btn-accent mt-4 w-full h-12 text-base"
              >
                <WhatsAppIcon size={20} />
                Finalizar pelo WhatsApp
              </Link>
              <button
                type="button"
                onClick={close}
                className="btn-outline mt-2 w-full"
              >
                Continuar comprando
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
};
