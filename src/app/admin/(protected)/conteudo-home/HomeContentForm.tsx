'use client';

import { useState, useTransition } from 'react';
import { updateHomeContentAction } from '@/app/actions/settings';
import {
  HOME_ICON_OPTIONS,
  type HeroBadge,
  type HomeContent,
  type HomeIconName,
  type HowItWorksStep,
  type TrustCard,
} from '@/lib/homeContent';

const IconSelect = ({
  value,
  onChange,
}: {
  value: HomeIconName;
  onChange: (v: HomeIconName) => void;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as HomeIconName)}
    className="field-input h-10"
    aria-label="Ícone"
  >
    {HOME_ICON_OPTIONS.map((o) => (
      <option key={o.value} value={o.value}>{o.label}</option>
    ))}
  </select>
);

export const HomeContentForm = ({ initial }: { initial: HomeContent }) => {
  const [content, setContent] = useState<HomeContent>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const result = await updateHomeContentAction(content);
      if (result.ok) setSuccess(true);
      else setError(result.error);
    });
  };

  // --- mutators ---
  const setBadges = (next: HeroBadge[]) => setContent((c) => ({ ...c, heroBadges: next }));
  const setCards = (next: TrustCard[]) => setContent((c) => ({ ...c, trustCards: next }));
  const setSteps = (next: HowItWorksStep[]) => setContent((c) => ({ ...c, howItWorks: next }));

  return (
    <form onSubmit={submit} className="space-y-6">
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Conteúdo da home atualizado.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* HERO BADGES */}
      <section id="selos" className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card scroll-mt-24">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Selos do hero</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Aparecem abaixo dos botões de ação no topo da home. Recomendado 3–4 itens.
            </p>
          </div>
          <button
            type="button"
            disabled={content.heroBadges.length >= 8}
            onClick={() => setBadges([...content.heroBadges, { icon: 'check', label: '' }])}
            className="btn-outline h-8 text-xs"
          >
            + Adicionar
          </button>
        </header>
        <ul className="mt-4 space-y-2">
          {content.heroBadges.map((b, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
              <IconSelect
                value={b.icon}
                onChange={(v) => {
                  const next = content.heroBadges.slice();
                  next[i] = { ...next[i], icon: v };
                  setBadges(next);
                }}
              />
              <input
                value={b.label}
                onChange={(e) => {
                  const next = content.heroBadges.slice();
                  next[i] = { ...next[i], label: e.target.value };
                  setBadges(next);
                }}
                placeholder="Texto do selo"
                className="field-input h-10"
              />
              <button
                type="button"
                onClick={() => setBadges(content.heroBadges.filter((_, j) => j !== i))}
                className="btn-outline h-10 text-xs text-rose-600"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* TRUST CARDS */}
      <section id="confianca" className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card scroll-mt-24">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Cards &quot;Por que comprar&quot;</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Bloco de confiança da home. Recomendado 6 itens.
            </p>
          </div>
          <button
            type="button"
            disabled={content.trustCards.length >= 12}
            onClick={() => setCards([...content.trustCards, { icon: 'check', title: '', text: '' }])}
            className="btn-outline h-8 text-xs"
          >
            + Adicionar
          </button>
        </header>
        <ul className="mt-4 space-y-3">
          {content.trustCards.map((c, i) => (
            <li key={i} className="rounded-xl border border-ink-100 p-3">
              <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                <IconSelect
                  value={c.icon}
                  onChange={(v) => {
                    const next = content.trustCards.slice();
                    next[i] = { ...next[i], icon: v };
                    setCards(next);
                  }}
                />
                <input
                  value={c.title}
                  onChange={(e) => {
                    const next = content.trustCards.slice();
                    next[i] = { ...next[i], title: e.target.value };
                    setCards(next);
                  }}
                  placeholder="Título"
                  className="field-input h-10"
                />
                <button
                  type="button"
                  onClick={() => setCards(content.trustCards.filter((_, j) => j !== i))}
                  className="btn-outline h-10 text-xs text-rose-600"
                >
                  Remover
                </button>
              </div>
              <textarea
                value={c.text}
                onChange={(e) => {
                  const next = content.trustCards.slice();
                  next[i] = { ...next[i], text: e.target.value };
                  setCards(next);
                }}
                rows={2}
                placeholder="Descrição curta"
                className="field-input mt-2"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* HOW IT WORKS */}
      <section id="como-funciona" className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card scroll-mt-24">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Passos do &quot;Como funciona&quot;</h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Numeramos automaticamente. Recomendado 4–5 passos.
            </p>
          </div>
          <button
            type="button"
            disabled={content.howItWorks.length >= 12}
            onClick={() => setSteps([...content.howItWorks, { title: '', text: '' }])}
            className="btn-outline h-8 text-xs"
          >
            + Adicionar
          </button>
        </header>
        <ol className="mt-4 space-y-3">
          {content.howItWorks.map((s, i) => (
            <li key={i} className="rounded-xl border border-ink-100 p-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-900 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <input
                  value={s.title}
                  onChange={(e) => {
                    const next = content.howItWorks.slice();
                    next[i] = { ...next[i], title: e.target.value };
                    setSteps(next);
                  }}
                  placeholder="Título do passo"
                  className="field-input h-10 flex-1"
                />
                <button
                  type="button"
                  onClick={() => setSteps(content.howItWorks.filter((_, j) => j !== i))}
                  className="btn-outline h-10 text-xs text-rose-600"
                >
                  Remover
                </button>
              </div>
              <textarea
                value={s.text}
                onChange={(e) => {
                  const next = content.howItWorks.slice();
                  next[i] = { ...next[i], text: e.target.value };
                  setSteps(next);
                }}
                rows={2}
                placeholder="Descrição"
                className="field-input mt-2"
              />
            </li>
          ))}
        </ol>
      </section>

      <div className="sticky bottom-4 z-10 rounded-2xl border border-ink-100 bg-white/95 p-4 shadow-cardHover backdrop-blur">
        <button type="submit" disabled={pending} className="btn-primary h-11 w-full text-base sm:w-auto">
          {pending ? 'Salvando...' : 'Salvar conteúdo da home'}
        </button>
      </div>
    </form>
  );
};
