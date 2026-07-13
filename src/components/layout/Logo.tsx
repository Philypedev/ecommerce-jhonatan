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
  // SVG interno fica em ~60% do tamanho da caixa pra manter o padding visual
  const svgSize = Math.max(16, Math.round(size * 0.6));

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
        <span
          className={`grid place-items-center rounded-lg ${
            light ? 'bg-white text-brand-900' : 'bg-brand-900 text-white'
          }`}
          style={boxStyle}
        >
          <svg
            width={svgSize}
            height={svgSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path
              d="M3 12h4l2-4 4 8 2-4h6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
