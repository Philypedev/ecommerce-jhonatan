import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatCurrency, formatInstallments } from '@/utils/formatCurrency';

type Props = {
  product: Product;
  priority?: boolean;
};

const badgeClass = {
  promo: 'badge-promo',
  novo: 'badge-novo',
  destaque: 'badge-destaque',
} as const;

const badgeLabel = {
  promo: 'Oferta',
  novo: 'Novidade',
  destaque: 'Destaque',
} as const;

/**
 * Card de produto — visual comercial no padrão marketplace (ML-inspired):
 *
 *  - imagem valorizada no topo (fundo branco, aspect square)
 *  - nome do produto direto abaixo, sem prefixo de marca ("TRAVELTECH" foi
 *    removido — herança do design antigo)
 *  - preço grande e forte, com preço antigo riscado acima e selo verde
 *    "N% OFF" inline quando há promoção
 *  - parcelamento em verde discreto abaixo
 *  - CARD INTEIRO CLICÁVEL → `/produto/[slug]`, sem botão de compra
 *  - server component: zero JS extra na vitrine
 */
export const ProductCard = ({ product, priority = false }: Props) => {
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.oldPrice! - product.price) / product.oldPrice!) * 100)
    : 0;

  const outOfStock = product.stock <= 0;
  const image = product.images[0];

  return (
    <article className="group h-full">
      <Link
        href={`/produto/${product.slug}`}
        aria-label={`${product.name} — ${formatCurrency(product.price)}`}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-ink-100 bg-white transition-shadow duration-300 hover:shadow-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40 focus-visible:ring-offset-2"
      >
        {/* ─── Imagem ─── */}
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt || product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="grid h-full place-items-center bg-ink-100 text-xs text-ink-500">
              Sem imagem
            </div>
          )}

          {/* Badges do topo esquerdo */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            {product.badge && (
              <span className={badgeClass[product.badge]}>{badgeLabel[product.badge]}</span>
            )}
            {outOfStock && (
              <span className="badge bg-amber-100 text-amber-700">Sob consulta</span>
            )}
          </div>
        </div>

        {/* ─── Conteúdo ─── */}
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          {/* Nome do produto — sem prefixo de marca acima */}
          <h3
            className="line-clamp-2 text-sm font-medium leading-snug text-ink-700"
            style={{ minHeight: '2.5rem' }}
          >
            {product.name}
          </h3>

          {/* Preço antigo pequeno (só se houver desconto real) */}
          {hasDiscount && (
            <p className="mt-2 text-[11px] text-ink-500 line-through">
              {formatCurrency(product.oldPrice!)}
            </p>
          )}

          {/* Preço atual grande + selo de desconto inline (padrão ML) */}
          <div className={`flex flex-wrap items-baseline gap-x-2 ${hasDiscount ? 'mt-0.5' : 'mt-2'}`}>
            <span className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
              {formatCurrency(product.price)}
            </span>
            {hasDiscount && !outOfStock && (
              <span className="text-xs font-bold text-emerald-700">
                {discountPct}% OFF
              </span>
            )}
          </div>

          {/* Parcelamento em verde discreto — só se >= 2 parcelas */}
          {product.installments > 1 && (
            <p className="mt-1 text-xs font-medium text-emerald-700">
              em {formatInstallments(product.price, product.installments)}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
};
