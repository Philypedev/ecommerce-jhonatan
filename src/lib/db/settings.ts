import { prisma } from '@/lib/prisma';
import { siteConfig as fallbackConfig } from '@/config/site';
import type { StoreSettings } from './types';

export type StoreSettingsRecord = StoreSettings;

/**
 * O Prisma Client em runtime só seleciona as colunas que CONHECIA no momento da
 * geração do client. As colunas adicionadas via `prisma db push --skip-generate`
 * (logoSize, homeContentJson, etc.) existem no DB mas não chegam no retorno do
 * findUnique/upsert. Por isso fazemos um SELECT raw em paralelo para mesclar
 * esses campos novos no objeto final.
 *
 * Quando rodar `npx prisma generate` (com dev parado), o client passa a incluir
 * as colunas automaticamente e essa mesclagem fica redundante mas inofensiva.
 */
export const getStoreSettings = async (): Promise<StoreSettings> => {
  const [settings, extras] = await Promise.all([
    prisma.storeSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    }),
    prisma.$queryRaw<
      Array<{
        logoSize: number | null;
        homeContentJson: string | null;
        defaultOgImageUrl: string | null;
        searchConsoleVerification: string | null;
        heroCarouselIntervalSeconds: number | null;
      }>
    >`SELECT "logoSize", "homeContentJson", "defaultOgImageUrl",
             "searchConsoleVerification", "heroCarouselIntervalSeconds"
      FROM "StoreSettings" WHERE "id" = 'singleton'`,
  ]);

  const ext = extras[0] ?? {
    logoSize: 36,
    homeContentJson: '{}',
    defaultOgImageUrl: null,
    searchConsoleVerification: null,
    heroCarouselIntervalSeconds: 5,
  };
  return {
    ...settings,
    logoSize: typeof ext.logoSize === 'number' ? ext.logoSize : 36,
    homeContentJson: ext.homeContentJson ?? '{}',
    defaultOgImageUrl: ext.defaultOgImageUrl ?? null,
    searchConsoleVerification: ext.searchConsoleVerification ?? null,
    heroCarouselIntervalSeconds:
      typeof ext.heroCarouselIntervalSeconds === 'number' && ext.heroCarouselIntervalSeconds >= 2
        ? Math.min(10, Math.max(2, ext.heroCarouselIntervalSeconds))
        : 5,
  } as unknown as StoreSettings;
};

/** Mantém o mesmo formato do siteConfig estático para compatibilidade. */
export const settingsToSiteConfig = (s: Awaited<ReturnType<typeof getStoreSettings>>) => ({
  name: s.storeName,
  shortName: s.shortName,
  tagline: s.tagline,
  description: s.defaultMetaDescription,
  url: process.env.NEXT_PUBLIC_SITE_URL || fallbackConfig.url,
  whatsapp: s.whatsappNumber,
  whatsappDisplay: s.whatsappDisplay,
  email: s.email,
  address: s.address,
  businessHours: s.businessHours,
  logoUrl: s.logoUrl,
  logoSize: s.logoSize ?? 36,
  socials: {
    instagram: s.instagram,
    facebook: s.facebook,
    youtube: s.youtube,
    tiktok: s.tiktok,
  },
  hero: {
    title: s.heroTitle,
    subtitle: s.heroSubtitle,
    imageUrl: s.heroImageUrl,
    primaryCta: s.heroPrimaryButtonText,
    secondaryCta: s.heroSecondaryButtonText,
  },
  colors: {
    primary: s.primaryColor,
    secondary: s.secondaryColor,
    accent: s.accentColor,
    background: s.backgroundColor,
    text: s.textColor,
  },
  shippingNote: s.shippingNote,
  footerText: s.footerText,
});

export type SiteRuntimeConfig = ReturnType<typeof settingsToSiteConfig>;

export const getRotatingMessages = async (): Promise<string[]> => {
  const list = await prisma.rotatingMessage.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
  });
  if (list.length === 0) return fallbackConfig.trustMessages.slice();
  return list.map((m) => m.text);
};
