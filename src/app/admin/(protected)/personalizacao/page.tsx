import { prisma } from '@/lib/prisma';
import { getStoreSettings } from '@/lib/db/settings';
import { PersonalizationForm } from './PersonalizationForm';
import { RotatingMessagesEditor } from './RotatingMessagesEditor';

export const dynamic = 'force-dynamic';

export default async function PersonalizationPage() {
  const [settings, messages] = await Promise.all([
    getStoreSettings(),
    prisma.rotatingMessage.findMany({ orderBy: { position: 'asc' } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Personalização</h1>
        <p className="text-sm text-ink-500">Identidade visual, hero, mensagens e rodapé.</p>
      </div>

      <PersonalizationForm
        initial={{
          storeName: settings.storeName,
          shortName: settings.shortName,
          tagline: settings.tagline,
          logoUrl: settings.logoUrl,
          logoSize: settings.logoSize ?? 36,
          faviconUrl: settings.faviconUrl,
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          accentColor: settings.accentColor,
          backgroundColor: settings.backgroundColor,
          textColor: settings.textColor,
          heroTitle: settings.heroTitle,
          heroSubtitle: settings.heroSubtitle,
          heroImageUrl: settings.heroImageUrl,
          heroPrimaryButtonText: settings.heroPrimaryButtonText,
          heroSecondaryButtonText: settings.heroSecondaryButtonText,
          footerText: settings.footerText,
          email: settings.email,
          phone: settings.phone,
          whatsappNumber: settings.whatsappNumber,
          whatsappDisplay: settings.whatsappDisplay,
          instagram: settings.instagram,
          facebook: settings.facebook,
          tiktok: settings.tiktok,
          youtube: settings.youtube,
          address: settings.address,
          businessHours: settings.businessHours,
          shippingNote: settings.shippingNote,
          defaultMetaTitle: settings.defaultMetaTitle,
          defaultMetaDescription: settings.defaultMetaDescription,
        }}
      />

      <RotatingMessagesEditor messages={messages} />
    </div>
  );
}
