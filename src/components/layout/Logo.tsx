import Link from 'next/link';
import Image from 'next/image';

type Props = {
  light?: boolean;
  shortName: string;
  logoUrl?: string | null;
  /** Tamanho da caixa do logo em pixels. Default 36. */
  size?: number;
};

export const Logo = ({ light = false, shortName, logoUrl, size = 36 }: Props) => {
  const boxStyle = { width: size, height: size };

  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2"
      aria-label={`${shortName} — ir para a página inicial`}
    >
      {logoUrl ? (
        <span
          className="relative overflow-hidden rounded-lg"
          style={boxStyle}
        >
          <Image
            src={logoUrl}
            alt={shortName}
            fill
            sizes={`${size}px`}
            className="object-contain"
          />
        </span>
      ) : (
        // Fallback padrão da marca: PNG oficial em /public/traveltech-mark.png
        // (símbolo azul geométrico original — não confundir com /favicon.svg,
        // que é um wrapper base64 do mesmo arquivo).
        <span
          className="relative shrink-0 overflow-hidden rounded-lg"
          style={boxStyle}
        >
          <Image
            src="/traveltech-mark.png"
            alt={shortName}
            fill
            sizes={`${size}px`}
            className="object-contain"
            priority
          />
        </span>
      )}
      <span className="flex flex-col leading-tight">
        <span
          className={`text-base font-extrabold tracking-tight ${
            light ? 'text-white' : 'text-brand-900'
          }`}
        >
          {shortName}
        </span>
        <span
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
            light ? 'text-brand-100' : 'text-ink-500'
          }`}
        >
          Tecnologia para sua viagem
        </span>
      </span>
    </Link>
  );
};
