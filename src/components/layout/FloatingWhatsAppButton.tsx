'use client';

import { WhatsAppIcon } from '@/components/ui/Icon';
import { trackEvent } from '@/lib/analytics';

export const FloatingWhatsAppButton = ({ whatsapp }: { whatsapp: string }) => {
  const message = encodeURIComponent('Olá! Vim pelo site e gostaria de tirar uma dúvida.');
  const href = `https://wa.me/${whatsapp}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent('Contact', { source: 'floating_whatsapp' })}
      aria-label="Falar com especialista pelo WhatsApp"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-accent-dark sm:bottom-6 sm:right-6"
    >
      <WhatsAppIcon size={22} />
      <span className="hidden sm:inline">Fale conosco</span>
    </a>
  );
};
