'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProductImage } from '@/types';

type Props = {
  images: ProductImage[];
  productName: string;
  /**
   * Se preenchido, essa imagem passa a ser a "principal" no lugar da capa do
   * produto — usado para trocar a foto da galeria quando o cliente seleciona
   * uma variante com imagem própria. Clicar em uma miniatura ainda funciona:
   * a escolha manual vence até que `variantImageUrl` mude para outro valor
   * (aí resetamos e voltamos a mostrar a imagem da variante).
   */
  variantImageUrl?: string | null;
};

export const ProductGallery = ({ images, productName, variantImageUrl }: Props) => {
  const [manualIdx, setManualIdx] = useState<number | null>(null);

  // Quando a variante muda de imagem, descartamos a escolha manual — a nova
  // variante manda. Se `variantImageUrl` for null, também resetamos para o
  // comportamento padrão do produto pai.
  useEffect(() => {
    setManualIdx(null);
  }, [variantImageUrl]);

  const hasVariantImage = typeof variantImageUrl === 'string' && variantImageUrl.length > 0;
  const showVariant = hasVariantImage && manualIdx === null;
  const thumbIdx = manualIdx ?? 0;

  const main = showVariant
    ? { src: variantImageUrl as string, alt: productName }
    : (images[thumbIdx] ?? images[0]);

  if (!main) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink-100">
        <Image
          src={main.src}
          alt={main.alt}
          fill
          priority
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul
          className="grid grid-cols-5 gap-2"
          role="tablist"
          aria-label={`Imagens de ${productName}`}
        >
          {images.map((img, i) => {
            // Selecionado visualmente se a variante NÃO está mandando e o índice bate.
            const isSelected = !showVariant && i === thumbIdx;
            return (
              <li key={`${img.src}-${i}`}>
                <button
                  type="button"
                  onClick={() => setManualIdx(i)}
                  role="tab"
                  aria-selected={isSelected}
                  className={`relative block aspect-square w-full overflow-hidden rounded-lg ring-2 transition-all ${
                    isSelected ? 'ring-brand-700' : 'ring-transparent hover:ring-ink-300'
                  }`}
                  aria-label={`Ver imagem ${i + 1}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="100px"
                    className="object-cover"
                    loading="lazy"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
