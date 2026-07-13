'use client';

import { useState, useTransition } from 'react';
import { updateStoreSettingsAction } from '@/app/actions/settings';
import type { StoreSettingsInput } from '@/lib/validation/schemas';
import { CheckIcon } from '@/components/ui/Icon';
import { WhatsAppConnectionPanel } from './WhatsAppConnectionPanel';

type Settings = {
  storeName: string;
  shortName: string;
  tagline: string;
  logoUrl: string | null;
  logoSize: number;
  faviconUrl: string | null;
  whatsappNumber: string;
  whatsappDisplay: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  address: string;
  businessHours: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  heroPrimaryButtonText: string;
  heroSecondaryButtonText: string;
  shippingNote: string;
  footerText: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
};

export const SettingsForm = ({ initial }: { initial: Settings }) => {
  const [data, setData] = useState<StoreSettingsInput>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = <K extends keyof StoreSettingsInput>(k: K, v: StoreSettingsInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const result = await updateStoreSettingsAction(data);
      if (result.ok) setSuccess(true);
      else setError(result.error);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Configurações salvas.</div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">WhatsApp</h2>
        <p className="mt-1 text-xs text-ink-500">
          O número internacional é usado para gerar o link wa.me. Use apenas dígitos (55 + DDD + número).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Número (internacional, só dígitos)</label>
            <input
              value={data.whatsappNumber}
              onChange={(e) => set('whatsappNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="5511999999999"
              inputMode="numeric"
              className="field-input font-mono"
            />
          </div>
          <div>
            <label className="field-label">Exibição (formatada)</label>
            <input
              value={data.whatsappDisplay}
              onChange={(e) => set('whatsappDisplay', e.target.value)}
              placeholder="(11) 99999-9999"
              className="field-input"
            />
          </div>
        </div>

        <WhatsAppConnectionPanel
          number={data.whatsappNumber}
          display={data.whatsappDisplay}
        />
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Frete</h2>
        <div className="mt-4">
          <label className="field-label">Aviso de frete (exibido no checkout/carrinho)</label>
          <textarea
            rows={2}
            value={data.shippingNote}
            onChange={(e) => set('shippingNote', e.target.value)}
            className="field-input"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Formas de pagamento</h2>
        <p className="mt-1 text-xs text-ink-500">
          Estão sempre disponíveis no checkout (PIX, cartão de crédito/débito, boleto, dinheiro e &quot;a combinar&quot;).
          O pagamento é sempre confirmado por um atendente no WhatsApp — sem cobranças automatizadas neste site.
        </p>
        <ul className="mt-3 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
          {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto bancário', 'Dinheiro', 'A combinar pelo WhatsApp'].map((m) => (
            <li
              key={m}
              className="inline-flex items-center gap-2 rounded-md bg-ink-100/60 px-3 py-2"
            >
              <CheckIcon size={14} className="text-emerald-700" aria-hidden />
              {m}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Dados da loja</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Nome da loja</label>
            <input value={data.storeName} onChange={(e) => set('storeName', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">E-mail</label>
            <input value={data.email} onChange={(e) => set('email', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Endereço</label>
            <input value={data.address} onChange={(e) => set('address', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Horário</label>
            <input value={data.businessHours} onChange={(e) => set('businessHours', e.target.value)} className="field-input" />
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-ink-100 bg-white/95 p-4 shadow-cardHover backdrop-blur">
        <button type="submit" disabled={pending} className="btn-primary h-11 w-full text-base sm:w-auto">
          {pending ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </form>
  );
};
