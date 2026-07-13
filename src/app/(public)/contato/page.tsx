import type { Metadata } from 'next';
import { getStoreSettings, settingsToSiteConfig } from '@/lib/db/settings';
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
} from '@/components/ui/Icon';

export const revalidate = 300;

export const generateMetadata = async (): Promise<Metadata> => {
  const settings = await getStoreSettings();
  return {
    title: 'Contato',
    description: `Fale com a ${settings.storeName} pelo WhatsApp, e-mail ou telefone. Atendimento humano, rápido e especializado.`,
  };
};

export default async function ContactPage() {
  const settings = await getStoreSettings();
  const config = settingsToSiteConfig(settings);

  return (
    <>
      <section className="bg-brand-950 text-white">
        <div className="container-x py-10">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Fale com a gente</h1>
          <p className="mt-2 max-w-xl text-brand-100/85">
            Tem uma dúvida, quer uma indicação ou precisa de ajuda com seu pedido? Nosso time responde rápido.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-6 py-12 md:grid-cols-3">
        <a
          href={`https://wa.me/${config.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="group rounded-2xl bg-white p-6 shadow-card transition-shadow hover:shadow-cardHover"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <WhatsAppIcon size={22} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">WhatsApp</h2>
          <p className="mt-1 text-sm text-ink-500">Resposta rápida com atendimento humano.</p>
          <span className="mt-3 block text-sm font-bold text-emerald-700">{config.whatsappDisplay}</span>
        </a>

        <a
          href={`mailto:${config.email}`}
          className="rounded-2xl bg-white p-6 shadow-card"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <MailIcon size={22} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">E-mail</h2>
          <p className="mt-1 text-sm text-ink-500">Para orçamentos, parcerias e pós-venda.</p>
          <span className="mt-3 block text-sm font-bold text-brand-700">{config.email}</span>
        </a>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <MapPinIcon size={22} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-ink-900">Endereço</h2>
          <p className="mt-1 text-sm text-ink-500">{config.address}</p>
          {config.businessHours && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-ink-700">
              <PhoneIcon size={14} /> {config.businessHours}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
