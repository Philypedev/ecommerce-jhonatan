'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLine, Product, ProductVariantPublic } from '@/types';
import { trackEvent } from '@/lib/analytics';

/** Chave única de linha no carrinho — produto + variante (se houver). */
export const cartLineKey = (l: { productId: string; variantId?: string }): string =>
  `${l.productId}::${l.variantId ?? ''}`;

type CartState = {
  lines: CartLine[];
  isOpen: boolean;
  hydrated: boolean;
  /**
   * Adiciona ao carrinho. `preferredImage` permite ao caller resolver a
   * melhor foto (variant.imageUrl > value.imageUrl > produto) e passar já
   * pronta — evita o snapshot do carrinho reverter para a capa do produto
   * quando a variante final não tem foto própria mas o valor de opção tem.
   */
  add: (
    product: Product,
    quantity?: number,
    variant?: ProductVariantPublic,
    preferredImage?: string | null,
  ) => void;
  remove: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

/**
 * Store do carrinho.
 *
 * Deduplicação: `${productId}::${variantId ?? ''}` — Mala Preto/P e Mala Azul/P
 * viram linhas distintas; produto simples segue com chave `${id}::`.
 *
 * Persistência versão 3 — carrinhos antigos (v2) migram automaticamente:
 * linhas sem `variantId` ficam válidas (mapa opcional), sem perda.
 */
export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      hydrated: false,
      add: (product, quantity = 1, variant, preferredImage) => {
        // Defesa em profundidade: item sem estoque NUNCA entra no carrinho.
        // A UI já esconde o botão, mas se algum caminho indireto tentar, aborta.
        const availableStock = variant ? variant.stock : product.stock;
        if (availableStock <= 0) return;
        if (variant && !variant.active) return;

        // Prioridade da imagem no snapshot:
        //   1. preferredImage (caller já resolveu: variant.imageUrl ou value.imageUrl)
        //   2. variant.imageUrl (redundante mas seguro)
        //   3. capa do produto pai
        //   4. placeholder
        const image =
          (preferredImage && preferredImage.length > 0 ? preferredImage : null) ||
          variant?.imageUrl ||
          product.images[0]?.src ||
          '/placeholder.svg';
        const price = variant ? variant.price : product.price;
        const sku = variant ? variant.sku : product.sku;

        const lines = get().lines.slice();
        const key = cartLineKey({ productId: product.id, variantId: variant?.id });
        const existing = lines.find(
          (l) => cartLineKey({ productId: l.productId, variantId: l.variantId }) === key,
        );

        if (existing) {
          existing.quantity = Math.min(existing.quantity + quantity, 99);
          // Atualiza o snapshot caso o preço/imagem/nome tenham mudado
          existing.price = price;
          existing.name = product.name;
          existing.image = image;
          existing.sku = sku;
        } else {
          lines.push({
            productId: product.id,
            variantId: variant?.id,
            variantTitle: variant?.title,
            variantOptionsMap: variant?.optionsMap,
            quantity: Math.min(quantity, 99),
            name: product.name,
            slug: product.slug,
            sku,
            price,
            image,
          });
        }
        set({ lines, isOpen: true });
        trackEvent('AddToCart', {
          content_name: product.name,
          content_ids: [sku],
          content_type: 'product',
          currency: 'BRL',
          value: price * quantity,
          contents: [{ id: sku, quantity, item_price: price }],
        });
      },
      remove: (key) =>
        set({
          lines: get().lines.filter(
            (l) => cartLineKey({ productId: l.productId, variantId: l.variantId }) !== key,
          ),
        }),
      setQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({
            lines: get().lines.filter(
              (l) =>
                cartLineKey({ productId: l.productId, variantId: l.variantId }) !== key,
            ),
          });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            cartLineKey({ productId: l.productId, variantId: l.variantId }) === key
              ? { ...l, quantity: Math.min(quantity, 99) }
              : l,
          ),
        });
      },
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set({ isOpen: !get().isOpen }),
    }),
    {
      name: 'traveltech-cart',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // v2 → v3: campos de variante são opcionais, então carrinhos antigos
      // (sem variantId) continuam válidos sem migração.
      migrate: (persistedState) => persistedState as { lines: CartLine[] },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export const cartItemsCount = (lines: CartLine[]): number =>
  lines.reduce((acc, l) => acc + l.quantity, 0);

export const cartSubtotal = (lines: CartLine[]): number =>
  lines.reduce((acc, l) => acc + l.price * l.quantity, 0);
