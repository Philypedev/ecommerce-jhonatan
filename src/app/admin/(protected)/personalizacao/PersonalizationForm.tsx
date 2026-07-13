'use client';

import { useState, useTransition } from 'react';
import { updateStoreSettingsAction } from '@/app/actions/settings';
import type { StoreSettingsInput } from '@/lib/validation/schemas';
import { ImageUploader } from '@/components/admin/ImageUploader';

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="field-label">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-12 cursor-pointer rounded-md border border-ink-300"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input font-mono text-xs"
        placeholder="#007396"
      />
    </div>
  </div>
);

export const PersonalizationForm = ({ initial }: { initial: StoreSettingsInput }) => {
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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Alterações salvas com sucesso.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Identidade</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Nome da loja</label>
            <input value={data.storeName} onChange={(e) => set('storeName', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Nome curto (exibido no header)</label>
            <input value={data.shortName} onChange={(e) => set('shortName', e.target.value)} className="field-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Tagline</label>
            <input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} className="field-input" />
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <ImageUploader
              value={data.logoUrl ?? null}
              onChange={(url) => set('logoUrl', url)}
              label="Logo"
              hint="200 × 200 px (quadrado 1:1) — PNG com fundo transparente. Será exibida no tamanho que você ajustar no slider abaixo."
            />
            <div className="mt-4">
              <label htmlFor="logoSize" className="field-label">
                Tamanho da logo
                <span className="ml-2 inline-block rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-mono normal-case tracking-normal text-ink-700">
                  {data.logoSize}px
                </span>
              </label>
              <input
                id="logoSize"
                type="range"
                min={24}
                max={56}
                step={2}
                value={data.logoSize}
                onChange={(e) => set('logoSize', Number(e.target.value))}
                className="w-full accent-brand-900"
              />
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-ink-500">
                <span>Pequena (24)</span>
                <span>Padrão (36)</span>
                <span>Grande (56)</span>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-ink-100 bg-ink-100/40 p-3">
                <span
                  className="grid place-items-center rounded-lg bg-brand-900 text-white"
                  style={{ width: data.logoSize, height: data.logoSize }}
                >
                  <svg
                    width={Math.round(data.logoSize * 0.6)}
                    height={Math.round(data.logoSize * 0.6)}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M3 12h4l2-4 4 8 2-4h6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-xs text-ink-500">
                  Pré-visualização proporcional. O tamanho se aplica ao header e ao footer.
                </span>
              </div>
            </div>
          </div>
          <ImageUploader
            value={data.faviconUrl ?? null}
            onChange={(url) => set('faviconUrl', url)}
            label="Favicon"
            hint="64 × 64 px (quadrado) — PNG ou WEBP. Aparece na aba do navegador."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Cores principais</h2>
        <p className="mt-1 text-xs text-ink-500">
          As cores refletem em botões, header, footer e CTAs. Use HEX (#007396).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ColorField label="Primária (header/footer)" value={data.primaryColor} onChange={(v) => set('primaryColor', v)} />
          <ColorField label="Secundária (links/destaques)" value={data.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
          <ColorField label="Destaque (CTA / WhatsApp)" value={data.accentColor} onChange={(v) => set('accentColor', v)} />
          <ColorField label="Fundo" value={data.backgroundColor} onChange={(v) => set('backgroundColor', v)} />
          <ColorField label="Texto" value={data.textColor} onChange={(v) => set('textColor', v)} />
        </div>
      </section>

      <section id="hero" className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card scroll-mt-24">
        <h2 className="text-base font-bold text-ink-900">Hero (topo da home)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Título</label>
            <input value={data.heroTitle} onChange={(e) => set('heroTitle', e.target.value)} className="field-input" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Subtítulo</label>
            <textarea rows={2} value={data.heroSubtitle} onChange={(e) => set('heroSubtitle', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Botão principal</label>
            <input value={data.heroPrimaryButtonText} onChange={(e) => set('heroPrimaryButtonText', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Botão secundário (WhatsApp)</label>
            <input value={data.heroSecondaryButtonText} onChange={(e) => set('heroSecondaryButtonText', e.target.value)} className="field-input" />
          </div>
        </div>

        <div className="mt-6">
          <ImageUploader
            value={data.heroImageUrl ?? null}
            onChange={(url) => set('heroImageUrl', url)}
            label="Imagem do hero"
            height={240}
            hint="1200 × 900 px (4:3) — JPG ou WEBP até 6 MB. Aparece ao lado direito do título principal da home."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900">Rodapé e contato</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">Texto institucional</label>
            <textarea rows={2} value={data.footerText} onChange={(e) => set('footerText', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">E-mail</label>
            <input value={data.email} onChange={(e) => set('email', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Telefone</label>
            <input value={data.phone} onChange={(e) => set('phone', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Endereço</label>
            <input value={data.address} onChange={(e) => set('address', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Horário de atendimento</label>
            <input value={data.businessHours} onChange={(e) => set('businessHours', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Instagram (URL)</label>
            <input value={data.instagram} onChange={(e) => set('instagram', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Facebook (URL)</label>
            <input value={data.facebook} onChange={(e) => set('facebook', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">TikTok (URL)</label>
            <input value={data.tiktok} onChange={(e) => set('tiktok', e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">YouTube (URL)</label>
            <input value={data.youtube} onChange={(e) => set('youtube', e.target.value)} className="field-input" />
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-ink-100 bg-white/95 p-4 shadow-cardHover backdrop-blur">
        <button type="submit" disabled={pending} className="btn-primary h-11 w-full text-base sm:w-auto">
          {pending ? 'Salvando...' : 'Salvar personalização'}
        </button>
      </div>
    </form>
  );
};
