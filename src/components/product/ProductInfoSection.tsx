'use client';

import { useState } from 'react';
import type { Product, ProductVariantPublic } from '@/types';
import { ProductGallery } from './ProductGallery';
import { ProductDetails } from './ProductDetails';

/**
 * Wrapper client que compartilha estado entre galeria e painel de compra:
 *
 *  - `selectedVariant` → snapshot para o carrinho quando o usuário clica Add
 *  - `preferredImageUrl` → override da imagem principal da galeria, com
 *    prioridade calculada dentro do ProductDetails:
 *      1. variant.imageUrl da combinação final
 *      2. imageUrl do último valor de opção clicado
 *      3. null → cai para a imagem do produto pai
 *
 * Retorna um Fragment para preservar o grid `md:grid-cols-2` do parent server.
 */
export const ProductInfoSection = ({ product }: { product: Product }) => {
  const [, setSelectedVariant] = useState<ProductVariantPublic | null>(null);
  const [preferredImageUrl, setPreferredImageUrl] = useState<string | null>(null);

  return (
    <>
      <ProductGallery
        images={product.images}
        productName={product.name}
        variantImageUrl={preferredImageUrl}
      />
      <ProductDetails
        product={product}
        onVariantChange={setSelectedVariant}
        onPreferredImageChange={setPreferredImageUrl}
      />
    </>
  );
};
