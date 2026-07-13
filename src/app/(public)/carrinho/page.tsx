'use client';

import Link from 'next/link';
import { useCart, cartSubtotal, cartLineKey } from '@/store/cart';
import { formatCurrency } from '@/utils/formatCurrency';
import { CartItem } from '@/components/cart/CartItem';
import { CartIcon, WhatsAppIcon } from '@/components/ui/Icon';

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const subtotal = cartSubtotal(lines);

  const isEmpty = !hydrated || lines.length === 0;

  return (
    <div className="container-x py-10">
      <h1 className="text-2xl font-extrabold text-ink-900 md:text-3xl">Carrinho</h1>

      {isEmpty ? (
        <div className="mt-10 rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ink-100 text-ink-500">
            <CartIcon size={28} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">Seu carrinho está vazio</h2>
          <p className="mt-1 text-sm text-ink-500">
            Conheça nossos produtos em destaque ou fale com um especialista pelo WhatsApp.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Voltar para a loja
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <ul className="rounded-2xl border border-ink-100 bg-white p-2 shadow-card lg:col-span-2">
            {lines.map((line) => (
              <CartItem
                key={cartLineKey({ productId: line.productId, variantId: line.variantId })}
                line={line}
              />
            ))}
          </ul>

          <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-5 shadow-card lg:sticky lg:top-28">
            <h2 className="text-base font-bold text-ink-900">Resumo do pedido</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-semibold text-ink-900">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Frete</dt>
                <dd className="text-ink-700">A confirmar</dd>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-3 text-base">
                <dt className="font-bold text-ink-900">Total estimado</dt>
                <dd className="font-extrabold text-ink-900">{formatCurrency(subtotal)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-500">
              Frete e disponibilidade serão confirmados pelo WhatsApp.
            </p>

            <Link href="/checkout" className="btn-accent mt-5 w-full h-12 text-base">
              <WhatsAppIcon size={20} />
              Finalizar pelo WhatsApp
            </Link>
            <Link href="/" className="btn-outline mt-2 w-full">
              Continuar comprando
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
