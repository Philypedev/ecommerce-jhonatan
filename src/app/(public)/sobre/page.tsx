import type { Metadata } from 'next';
import Link from 'next/link';
import { getStoreSettings, settingsToSiteConfig } from '@/lib/db/settings';
import { getPageContent } from '@/lib/db/pages';
import { renderMarkdown } from '@/lib/markdown';
import {
  HeadsetIcon,
  ShieldIcon,
  TruckIcon,
  WhatsAppIcon,
} from '@/components/ui/Icon';

export const revalidate = 300;

const FALLBACK = {
  title: 'Sua viagem começa antes do embarque',
  content:
    'A TravelTech reúne malas, mochilas, acessórios inteligentes e eletrônicos úteis para deixar cada deslocamento mais leve, prático e seguro. Unimos curadoria de produtos com um atendimento humano e direto pelo WhatsApp.\n\n## Nossa missão\n\nTornar a sua viagem mais simples e tranquila — com produtos selecionados, envio rápido para todo o Brasil e suporte humano antes, durante e depois da compra.',
};

export const generateMetadata = async (): Promise<Metadata> => {
  const [settings, page] = await Promise.all([
    getStoreSettings(),
    getPageContent('sobre'),
  ]);
  return {
    title: page?.metaTitle || 'Quem somos',
    description:
      page?.metaDescription ||
      `Conheça a ${settings.storeName}. Curadoria em malas, mochilas e acessórios de viagem com atendimento humano e finalização segura pelo WhatsApp.`,
  };
};

export default async function AboutPage() {
  const [settings, page] = await Promise.all([
    getStoreSettings(),
    getPageContent('sobre'),
  ]);
  const config = settingsToSiteConfig(settings);
  const title = page?.title || FALLBACK.title;
  const content = page?.content || FALLBACK.content;

  return (
    <>
      <section className="bg-brand-950 text-white">
        <div className="container-x py-12">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { Icon: TruckIcon, title: 'Entrega para todo o Brasil', text: 'Envios rastreados, com confirmação humana por WhatsApp.' },
            { Icon: ShieldIcon, title: 'Procedência e garantia', text: 'Produtos selecionados, com nota fiscal e suporte.' },
            { Icon: HeadsetIcon, title: 'Atendimento especializado', text: 'Antes e depois da compra, com pessoas reais.' },
          ].map(({ Icon, title: ttl, text }) => (
            <div key={ttl} className="rounded-2xl bg-white p-6 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={22} />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink-900">{ttl}</h2>
              <p className="mt-1 text-sm text-ink-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x pb-16">
        <article className="rounded-2xl bg-white p-8 shadow-card">
          {renderMarkdown(content)}
          <Link
            href={`https://wa.me/${config.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="btn-accent mt-6 inline-flex"
          >
            <WhatsAppIcon size={18} /> Falar com nossa equipe
          </Link>
        </article>
      </section>
    </>
  );
}
