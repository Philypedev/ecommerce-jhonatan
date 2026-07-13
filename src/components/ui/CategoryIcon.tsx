import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { name: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const CategoryIcon = ({ name, size = 28, ...rest }: Props) => {
  switch (name) {
    case 'luggage':
      return (
        <svg {...base(size)} {...rest}>
          <path d="M9 6V4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v2" />
          <rect x="5" y="6" width="14" height="13" rx="2" />
          <path d="M9 10v6M15 10v6" />
          <path d="M8 19v2M16 19v2" />
        </svg>
      );
    case 'backpack':
      return (
        <svg {...base(size)} {...rest}>
          <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
          <rect x="5" y="5" width="14" height="16" rx="3" />
          <rect x="8" y="10" width="8" height="6" rx="1" />
          <path d="M8 14h8" />
        </svg>
      );
    case 'organizer':
      return (
        <svg {...base(size)} {...rest}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 12h18M9 5v14M15 5v14" />
        </svg>
      );
    case 'accessories':
      return (
        <svg {...base(size)} {...rest}>
          <path d="M6 3v4M18 3v4" />
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );
    case 'plug':
      return (
        <svg {...base(size)} {...rest}>
          <path d="M9 3v4M15 3v4" />
          <path d="M7 7h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z" />
          <path d="M12 15v6" />
        </svg>
      );
    case 'electronics':
      return (
        <svg {...base(size)} {...rest}>
          <rect x="6" y="3" width="12" height="18" rx="2.5" />
          <path d="M9 6h6" />
          <circle cx="12" cy="18" r="1" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...base(size)} {...rest}>
          <path d="M3 12V4h8l10 10-8 8L3 12Z" />
          <circle cx="8" cy="8" r="1.4" />
        </svg>
      );
    default:
      return (
        <svg {...base(size)} {...rest}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};
