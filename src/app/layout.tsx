import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { siteConfig as fallbackConfig } from '@/config/site';
import { getStoreSettings } from '@/lib/db/settings';
import { hexToRgbTriplet, darkenHex } from '@/lib/color';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const generateMetadata = async (): Promise<Metadata> => {
  let settings;
  try {
    settings = await getStoreSettings();
  } catch {
    settings = null;
  }
  const title = settings?.defaultMetaTitle || `${fallbackConfig.name} — ${fallbackConfig.tagline}`;
  const description = settings?.defaultMetaDescription || fallbackConfig.description;
  const url = process.env.NEXT_PUBLIC_SITE_URL || fallbackConfig.url;

  // Imagem OG global — só entra no metadata se realmente configurada, para
  // não gerar tag apontando pra placeholder.
  const ogImage = settings?.defaultOgImageUrl ?? null;
  const hasRealOg = !!ogImage && !/placeholder/i.test(ogImage);

  return {
    metadataBase: new URL(url),
    title: { default: title, template: `%s — ${settings?.storeName || fallbackConfig.name}` },
    description,
    keywords: [
      'malas de viagem',
      'mochila antifurto',
      'adaptador universal',
      'organizador de mala',
      'travesseiro de pescoço',
      'power bank viagem',
      'acessórios de viagem',
      'compra pelo whatsapp',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'pt_BR',
      url,
      siteName: settings?.storeName || fallbackConfig.name,
      ...(hasRealOg ? { images: [{ url: ogImage as string, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(hasRealOg ? { images: [ogImage as string] } : {}),
    },
    // Search Console — só emite verification quando o lojista configurou.
    ...(settings?.searchConsoleVerification?.trim()
      ? { verification: { google: settings.searchConsoleVerification.trim() } }
      : {}),
    robots: { index: true, follow: true },
    // Favicons + PWA manifest — arquivos ficam em /public. Browser prioriza
    // SVG onde suporta (Chrome/Firefox/Safari modernos); .ico serve como
    // fallback em Windows/legado; apple-touch-icon vai pro iOS home screen.
    // Cobre tanto a loja pública quanto /admin (mesmo root layout).
    //
    // O sufixo `?v=4` força browsers/PWA a descartarem o favicon antigo
    // cacheado (troca de arte da marca). Bumpar o número em cada regeração
    // dos arquivos em /public.
    icons: {
      icon: [
        { url: '/favicon.ico?v=4', sizes: 'any' },
        { url: '/favicon.svg?v=4', type: 'image/svg+xml' },
        { url: '/icon-192.png?v=4', type: 'image/png', sizes: '192x192' },
        { url: '/icon-512.png?v=4', type: 'image/png', sizes: '512x512' },
      ],
      shortcut: [{ url: '/favicon.ico?v=4' }],
      apple: [{ url: '/apple-touch-icon.png?v=4', sizes: '180x180' }],
    },
    manifest: '/site.webmanifest?v=4',
  };
};

export const viewport: Viewport = {
  themeColor: '#007396',
  width: 'device-width',
  initialScale: 1,
};

const fallbackColors = {
  primary: '#007396',
  secondary: '#0369a1',
  accent: '#22c55e',
  background: '#f8fafc',
  text: '#0f172a',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let colors = fallbackColors;
  try {
    const settings = await getStoreSettings();
    colors = {
      primary: settings.primaryColor,
      secondary: settings.secondaryColor,
      accent: settings.accentColor,
      background: settings.backgroundColor,
      text: settings.textColor,
    };
  } catch {
    /* fallback */
  }

  const themeStyle = `:root{
    --color-primary:${hexToRgbTriplet(colors.primary)};
    --color-primary-dark:${hexToRgbTriplet(darkenHex(colors.primary, 0.18))};
    --color-secondary:${hexToRgbTriplet(colors.secondary)};
    --color-accent:${hexToRgbTriplet(colors.accent)};
    --color-accent-dark:${hexToRgbTriplet(darkenHex(colors.accent, 0.12))};
    --color-background:${hexToRgbTriplet(colors.background)};
    --color-text:${hexToRgbTriplet(colors.text)};
  }`;

  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
