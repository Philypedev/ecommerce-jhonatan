import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const SearchIcon = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const CartIcon = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 8H6" />
    <circle cx="9" cy="21" r="1.4" />
    <circle cx="18" cy="21" r="1.4" />
  </svg>
);

export const MenuIcon = ({ size = 24, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const WhatsAppIcon = ({ size = 22, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M19.05 4.91A10.05 10.05 0 0 0 12.04 2C6.5 2 2 6.5 2 12.04c0 1.77.47 3.49 1.34 5L2 22l5.06-1.32a10 10 0 0 0 4.97 1.27h.01c5.54 0 10.03-4.5 10.04-10.04 0-2.68-1.04-5.2-2.93-7Zm-7.01 15.42h-.01a8.3 8.3 0 0 1-4.24-1.16l-.3-.18-3 .79.8-2.93-.2-.31a8.32 8.32 0 0 1-1.28-4.4c0-4.6 3.74-8.34 8.34-8.34 2.23 0 4.32.87 5.9 2.44a8.27 8.27 0 0 1 2.44 5.9c0 4.6-3.75 8.33-8.35 8.33Zm4.57-6.24c-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.56.13-.17.25-.65.81-.79.97-.15.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.09s.9 2.42 1.03 2.59c.13.17 1.78 2.72 4.32 3.81 1.61.7 2.24.76 3.05.64.49-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.3Z" />
  </svg>
);

export const CheckIcon = ({ size = 20, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export const ShieldIcon = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 3 4 6v6c0 4.5 3.2 8.5 8 9 4.8-.5 8-4.5 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const TruckIcon = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M3 6h12v9H3z" />
    <path d="M15 9h4l2 3v3h-6" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </svg>
);

export const HeadsetIcon = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 13a8 8 0 1 1 16 0" />
    <path d="M4 13v3a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2zM20 13v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" />
  </svg>
);

export const CreditCardIcon = ({ size = 22, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
    <path d="M2.5 10h19" />
    <path d="M6 15h4" />
  </svg>
);

export const StarIcon = ({ size = 16, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M12 2.5 14.6 8l6.1.9-4.4 4.3 1 6.1L12 16.6 6.7 19.3l1-6.1L3.3 8.9 9.4 8 12 2.5Z" />
  </svg>
);

export const ChevronRight = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ChevronDown = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const PlusIcon = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const TrashIcon = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
);

export const MailIcon = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const PhoneIcon = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M5 4h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);

export const MapPinIcon = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M12 21s-7-7.2-7-12a7 7 0 1 1 14 0c0 4.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

export const InstagramIcon = ({ size = 18, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

export const FacebookIcon = ({ size = 18, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3A21 21 0 0 0 14.3 4c-2.5 0-4.2 1.5-4.2 4.4v2.4H7.5V14h2.6v8h3.4Z" />
  </svg>
);

export const AlertIcon = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export const InfoIcon = ({ size = 16, ...p }: IconProps) => (
  <svg {...base(size)} {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

export const YoutubeIcon = ({ size = 18, ...p }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M22 8.2a3 3 0 0 0-2.1-2.2C18 5.5 12 5.5 12 5.5s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12c0 1.3.1 2.5.4 3.8a3 3 0 0 0 2.1 2.2c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.2c.3-1.3.4-2.5.4-3.8s-.1-2.5-.4-3.8ZM10 15V9l5.2 3L10 15Z" />
  </svg>
);
