'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product, ProductVariantPublic } from '@/types';
import { formatCurrency, formatInstallments } from '@/utils/formatCurrency';
import { useCart } from '@/store/cart';
import {
  buildAvailabilityCheckMessage,
  buildQuickWhatsAppMessage,
  buildWhatsAppLink,
} from '@/utils/whatsapp';
import {
  CartIcon,
  CheckIcon,
  HeadsetIcon,
  MinusIcon,
  PlusIcon,
  ShieldIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/ui/Icon';
import { trackEvent } from '@/lib/analytics';
import { useWhatsApp } from '@/components/layout/WhatsAppProvider';

/**
 * Encontra a variante que bate com todas as opções selecionadas.
 * Retorna null se a seleção ainda está incompleta ou não existe combinação
 * cadastrada (defensivo — normalmente as combinações são cartesianas).
 */
const findMatchingVariant = (
  variants: ProductVariantPublic[],
  selection: Record<string, string>,
  optionCount: number,
): ProductVariantPublic | null => {
  const selectedCount = Object.values(selection).filter(Boolean).length;
  if (selectedCount < optionCount) return null;
  return (
    variants.find((v) =>
      Object.entries(selection).every(([k, val]) => v.optionsMap[k] === val),
    ) ?? null
  );
};

type Props = {
  product: Product;
  /**
   * Emite a variante atualmente selecionada (ou null quando a seleção está
   * incompleta / produto simples). O parent usa isso para snapshot do carrinho.
   */
  onVariantChange?: (variant: ProductVariantPublic | null) => void;
  /**
   * Emite a URL preferida de imagem seguindo a prioridade:
   *   1. variant.imageUrl da combinação final (quando existe e está selecionada)
   *   2. imageUrl do último valor de opção clicado (quando existe)
   *   3. null → parent volta pra imagem do produto pai
   */
  onPreferredImageChange?: (url: string | null) => void;
};

export const ProductDetails = ({
  product,
  onVariantChange,
  onPreferredImageChange,
}: Props) => {
  const add = useCart((s) => s.add);
  const whatsapp = useWhatsApp();
  const [qty, setQty] = useState(1);

  const variantOptions = useMemo(
    () => product.variantOptions ?? [],
    [product.variantOptions],
  );

  // Filtra variantes ativas. Inativas ficam invisíveis para o cliente.
  const activeVariants = useMemo(
    () => (product.variants ?? []).filter((v) => v.active),
    [product.variants],
  );
  const hasVariants = variantOptions.length > 0 && activeVariants.length > 0;

  const [selection, setSelection] = useState<Record<string, string>>({});
  const selectedVariant = hasVariants
    ? findMatchingVariant(activeVariants, selection, variantOptions.length)
    : null;

  // Último valor clicado (por opção). Usado para descobrir "última imagem
  // de valor clicada" — que serve de fallback quando a combinação final
  // ainda não tem imageUrl própria.
  const [lastClicked, setLastClicked] = useState<{ optionName: string; value: string } | null>(
    null,
  );

  // Descobre o `imageUrl` do valor selecionado (dentro das opções do produto)
  const lastValueImage = useMemo<string | null>(() => {
    if (!lastClicked) return null;
    const opt = variantOptions.find((o) => o.name === lastClicked.optionName);
    const val = opt?.values.find((v) => v.value === lastClicked.value);
    return val?.imageUrl ?? null;
  }, [lastClicked, variantOptions]);

  // Prioridade: variant.imageUrl > lastValueImage > null (parent decide fallback)
  const preferredImageUrl =
    selectedVariant?.imageUrl && selectedVariant.imageUrl.length > 0
      ? selectedVariant.imageUrl
      : lastValueImage;

  // Propaga variante + URL preferida ao parent
  useEffect(() => {
    onVariantChange?.(selectedVariant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant]);

  useEffect(() => {
    onPreferredImageChange?.(preferredImageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredImageUrl]);

  // Escolhas efetivas — se há variação selecionada, sobrescreve valores do produto pai.
  const effective = selectedVariant
    ? {
        price: selectedVariant.price,
        oldPrice: selectedVariant.oldPrice ?? undefined,
        stock: selectedVariant.stock,
        sku: selectedVariant.sku,
      }
    : {
        price: product.price,
        oldPrice: product.oldPrice,
        stock: product.stock,
        sku: product.sku,
      };

  const discount =
    effective.oldPrice && effective.oldPrice > effective.price
      ? Math.round(((effective.oldPrice - effective.price) / effective.oldPrice) * 100)
      : 0;

  // "Sob consulta" quando: produto sem variantes com stock<=0, ou variante escolhida sem estoque.
  const outOfStock = hasVariants
    ? selectedVariant
      ? selectedVariant.stock <= 0
      : false // ainda escolhendo — só bloqueia depois de selecionar
    : product.stock <= 0;

  const needsSelection = hasVariants && !selectedVariant;

  const onAdd = () => {
    if (needsSelection) return;
    add(product, qty, selectedVariant ?? undefined, preferredImageUrl ?? undefined);
  };

  // Descobrir quais valores geram alguma combinação ativa dado o restante da
  // seleção — usado para desabilitar visualmente combinações inexistentes.
  const valueIsPossible = (optionName: string, value: string): boolean => {
    const trial = { ...selection, [optionName]: value };
    return activeVariants.some((v) =>
      Object.entries(trial).every(([k, val]) => v.optionsMap[k] === val),
    );
  };

  const purchaseLink = buildWhatsAppLink(
    buildQuickWhatsAppMessage(product, qty, selectedVariant),
    whatsapp,
  );
  const consultLink = buildWhatsAppLink(
    buildAvailabilityCheckMessage(product),
    whatsapp,
  );

  const trackContact = (source: string) =>
    trackEvent('Contact', {
      content_name: product.name,
      content_ids: [effective.sku],
      currency: 'BRL',
      value: effective.price,
      source,
    });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {product.brand} · SKU {effective.sku}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
          {product.name}
        </h1>
        <p className="mt-2 text-sm text-ink-500">{product.shortDescription}</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        {outOfStock ? (
          <span className="badge bg-amber-100 text-amber-700">
            Consultar disponibilidade
          </span>
        ) : (
          <span className="badge bg-emerald-100 text-emerald-700">
            <CheckIcon size={14} /> Em estoque
          </span>
        )}
        {product.badge === 'novo' && <span className="badge-novo">Novidade</span>}
        {product.badge === 'destaque' && <span className="badge-destaque">Destaque</span>}
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
        <div className="flex items-baseline gap-3">
          {effective.oldPrice && effective.oldPrice > effective.price && (
            <span className="text-sm text-ink-500 line-through">
              {formatCurrency(effective.oldPrice)}
            </span>
          )}
          <span className="text-3xl font-extrabold text-ink-900">
            {formatCurrency(effective.price)}
          </span>
          {discount > 0 && !outOfStock && (
            <span className="badge bg-brand-900 text-white">-{discount}%</span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-500">
          ou {formatInstallments(effective.price, product.installments)}
        </p>

        {/* ───── Seletor de variação ───── */}
        {hasVariants && (
          <div className="mt-5 space-y-4">
            {variantOptions.map((opt) => (
              <div key={opt.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-700">
                  {opt.name}
                  {selection[opt.name] && (
                    <span className="ml-1 font-normal text-ink-500">
                      · {selection[opt.name]}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {opt.values.map((val) => {
                    const isSelected = selection[opt.name] === val.value;
                    const possible = valueIsPossible(opt.name, val.value);
                    return (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => {
                          setSelection((s) => ({ ...s, [opt.name]: val.value }));
                          setLastClicked({ optionName: opt.name, value: val.value });
                        }}
                        disabled={!possible}
                        aria-pressed={isSelected}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'border-brand-700 bg-brand-700 text-white'
                            : possible
                              ? 'border-ink-300 bg-white text-ink-900 hover:border-brand-500 hover:bg-brand-50'
                              : 'cursor-not-allowed border-ink-100 bg-ink-100/40 text-ink-500 line-through'
                        }`}
                      >
                        {val.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {needsSelection && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
                Escolha as opções acima para adicionar ao carrinho.
              </p>
            )}
          </div>
        )}

        {outOfStock ? (
          <>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-900">
              {hasVariants && selectedVariant
                ? 'Esta variação está sob consulta no momento. Fale com nossa equipe para confirmar disponibilidade.'
                : 'Este produto está temporariamente sob consulta. Fale com nossa equipe para confirmar disponibilidade, prazo e formas de pagamento.'}
            </div>
            <a
              href={consultLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackContact('product_detail_consult')}
              className="btn-accent mt-3 w-full h-12 text-base"
            >
              <WhatsAppIcon size={20} /> Consultar disponibilidade pelo WhatsApp
            </a>
          </>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-3">
              <div className="inline-flex items-center rounded-lg border border-ink-300 bg-white">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center text-ink-700 hover:bg-ink-100"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                >
                  <MinusIcon />
                </button>
                <span
                  className="min-w-10 text-center text-sm font-semibold text-ink-900"
                  aria-live="polite"
                >
                  {qty}
                </span>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center text-ink-700 hover:bg-ink-100"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label="Aumentar quantidade"
                >
                  <PlusIcon />
                </button>
              </div>

              <button
                type="button"
                onClick={onAdd}
                disabled={needsSelection}
                className="btn-primary flex-1 h-12 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CartIcon size={18} />
                {needsSelection ? 'Selecione uma variação' : 'Adicionar ao carrinho'}
              </button>
            </div>

            <a
              href={purchaseLink}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackContact('product_detail_buy')}
              className={`btn-accent mt-3 w-full h-12 text-base ${
                needsSelection ? 'pointer-events-none opacity-60' : ''
              }`}
              aria-disabled={needsSelection}
            >
              <WhatsAppIcon size={20} /> Comprar agora pelo WhatsApp
            </a>
          </>
        )}

        {/* Selos curtos de conversão — sem texto longo de garantia (essa
            movimento pra seção própria abaixo). */}
        <div className="mt-5 grid gap-2 text-xs text-ink-700 sm:grid-cols-3 sm:text-sm">
          <div className="flex items-start gap-2">
            <TruckIcon size={18} className="shrink-0 text-brand-700" />
            <span>Envio para todo o Brasil</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldIcon size={18} className="shrink-0 text-brand-700" />
            <span>Compra segura</span>
          </div>
          <div className="flex items-start gap-2">
            <HeadsetIcon size={18} className="shrink-0 text-brand-700" />
            <span>Atendimento pelo WhatsApp</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-500">
        Categoria:{' '}
        <Link
          href={`/categoria/${product.categorySlug}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          {product.categorySlug}
        </Link>
      </p>
    </div>
  );
};
