/**
 * Tipos estendidos que refletem campos adicionados ao schema mas ainda
 * não regenerados no Prisma Client (porque o dev server está segurando
 * o DLL do query engine no Windows).
 *
 * Quando `npx prisma generate` rodar com sucesso (no próximo build com
 * dev parado), os campos passam a existir nos tipos nativos do Prisma
 * e estas extensões viram redundantes — mas seguem inofensivas.
 */
import type {
  HomeBanner as PrismaBanner,
  StoreSettings as PrismaSettings,
  Category as PrismaCategory,
  Product as PrismaProduct,
} from '@prisma/client';

export type HomeBanner = PrismaBanner & {
  internalName: string;
  imageMobileUrl: string | null;
  videoUrl: string | null;
  videoMobileUrl: string | null;
  posterUrl: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
  linkTarget: '_self' | '_blank';
  placement: string;
};

export type StoreSettings = PrismaSettings & {
  homeContentJson: string;
  logoSize: number;
  defaultOgImageUrl: string | null;
  searchConsoleVerification: string | null;
  heroCarouselIntervalSeconds: number;
};

export type Category = PrismaCategory & {
  longDescription: string;
  imageMobileUrl: string | null;
  showInMenu: boolean;
  showOnHome: boolean;
  showInFooter: boolean;
};

export type Product = PrismaProduct & {
  position: number;
};
