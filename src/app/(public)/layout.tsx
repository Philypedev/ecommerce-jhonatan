import { siteConfig as fallbackConfig } from '@/config/site';
import { getStoreSettings, settingsToSiteConfig } from '@/lib/db/settings';
import { getFooterCategories, getMenuCategories } from '@/lib/db/categories';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingWhatsAppButton } from '@/components/layout/FloatingWhatsAppButton';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Analytics } from '@/components/analytics/Analytics';
import { WhatsAppProvider } from '@/components/layout/WhatsAppProvider';
import { VisitorHeartbeat } from '@/components/layout/VisitorHeartbeat';

type CatLink = { slug: string; name: string; highlight?: boolean };

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  let runtime: ReturnType<typeof settingsToSiteConfig>;
  let menuCats: CatLink[] = [];
  let footerCats: CatLink[] = [];

  try {
    // getMenuCategories / getFooterCategories já filtram: categoria ACTIVE
    // + flag correspondente + tem ao menos 1 produto ACTIVE dentro. Isso
    // impede coleções vazias de aparecerem no menu/footer.
    const [settings, menu, footer] = await Promise.all([
      getStoreSettings(),
      getMenuCategories(),
      getFooterCategories(),
    ]);
    runtime = settingsToSiteConfig(settings);
    menuCats = menu.map((c) => ({ slug: c.slug, name: c.name, highlight: c.highlight }));
    footerCats = footer.map((c) => ({ slug: c.slug, name: c.name }));
  } catch {
    runtime = {
      name: fallbackConfig.name,
      shortName: fallbackConfig.shortName,
      tagline: fallbackConfig.tagline,
      description: fallbackConfig.description,
      url: fallbackConfig.url,
      whatsapp: fallbackConfig.whatsapp,
      whatsappDisplay: fallbackConfig.whatsappDisplay,
      email: fallbackConfig.email,
      address: fallbackConfig.address,
      businessHours: fallbackConfig.businessHours,
      logoUrl: null,
      logoSize: 36,
      socials: {
        instagram: fallbackConfig.socials.instagram,
        facebook: fallbackConfig.socials.facebook,
        youtube: fallbackConfig.socials.youtube,
        tiktok: '',
      },
      hero: {
        title: fallbackConfig.tagline,
        subtitle: 'Compra rápida, atendimento humano e envio para todo o Brasil.',
        imageUrl: null,
        primaryCta: 'Ver produtos',
        secondaryCta: 'Comprar pelo WhatsApp',
      },
      colors: {
        primary: '#007396',
        secondary: '#0369a1',
        accent: '#22c55e',
        background: '#f8fafc',
        text: '#0f172a',
      },
      shippingNote: 'Frete e disponibilidade serão confirmados pelo WhatsApp.',
      footerText: fallbackConfig.description,
    };
  }

  return (
    <WhatsAppProvider value={runtime.whatsapp}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Header config={runtime} categories={menuCats} />
      <main id="main">{children}</main>
      <Footer config={runtime} categories={footerCats} />
      <FloatingWhatsAppButton whatsapp={runtime.whatsapp} />
      <CartDrawer />
      <Analytics />
      <VisitorHeartbeat />
    </WhatsAppProvider>
  );
}
