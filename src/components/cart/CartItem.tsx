'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { CartLine } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { cartLineKey, useCart } from '@/store/cart';
import { MinusIcon, PlusIcon, TrashIcon } from '@/components/ui/Icon';

type Props = {
  line: CartLine;
  onNavigate?: () => void;
};

const formatVariantSummary = (line: CartLine): string | null => {
  if (line.variantOptionsMap && Object.keys(line.variantOptionsMap).length > 0) {
    return Object.entries(line.variantOptionsMap)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  }
  return line.variantTitle ?? null;
};

export const CartItem = ({ line, onNavigate }: Props) => {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  const key = cartLineKey({ productId: line.productId, variantId: line.variantId });
  const subtotal = line.price * line.quantity;
  const variantSummary = formatVariantSummary(line);

  return (
    <li className="flex gap-3 border-b border-ink-100 py-4 last:border-b-0">
      <Link
        href={`/produto/${line.slug}`}
        onClick={onNavigate}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100"
      >
        <Image
          src={line.image}
          alt={line.name}
          fill
          sizes="80px"
          className="object-cover"
          loading="lazy"
        />
      </Link>
      <div className="flex flex-1 flex-col">
        <Link
          href={`/produto/${line.slug}`}
          onClick={onNavigate}
          className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700"
        >
          {line.name}
        </Link>
        {variantSummary && (
          <span className="mt-0.5 text-xs font-medium text-ink-700">{variantSummary}</span>
        )}
        <span className="text-xs text-ink-500">SKU {line.sku}</span>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-md border border-ink-300">
            <button
              type="button"
              onClick={() => setQuantity(key, line.quantity - 1)}
              className="grid h-8 w-8 place-items-center text-ink-700 hover:bg-ink-100"
              aria-label={`Diminuir quantidade de ${line.name}`}
            >
              <MinusIcon size={14} />
            </button>
            <span className="min-w-8 text-center text-sm font-semibold">{line.quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(key, line.quantity + 1)}
              className="grid h-8 w-8 place-items-center text-ink-700 hover:bg-ink-100"
              aria-label={`Aumentar quantidade de ${line.name}`}
            >
              <PlusIcon size={14} />
            </button>
          </div>
          <span className="text-sm font-bold text-ink-900">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => remove(key)}
        className="self-start rounded-md p-1.5 text-ink-500 hover:bg-rose-50 hover:text-rose-600"
        aria-label={`Remover ${line.name}`}
      >
        <TrashIcon size={18} />
      </button>
    </li>
  );
};
