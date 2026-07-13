'use client';

import { useState, useTransition } from 'react';
import { updateHeroCarouselIntervalAction } from '@/app/actions/banners';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

type Props = {
  initialSeconds: number;
};

/**
 * Editor discreto do tempo de troca do carrossel principal.
 * Fica na área de configurações do topo da tela /admin/banners.
 */
export const CarouselIntervalForm = ({ initialSeconds }: Props) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateHeroCarouselIntervalAction({ intervalSeconds: seconds });
      if (res.ok) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
            Configurações do carrossel principal
            <HelpTooltip label="Carrossel principal" size="sm">
              Estes banners aparecem no topo da home, logo abaixo do menu. Você pode usar até 3 imagens ou vídeos misturados. Se não houver nenhum ativo, a loja mostra um destaque limpo padrão.
            </HelpTooltip>
          </p>
          <p className="mt-0.5 text-xs text-ink-500">
            Ajuste o tempo entre trocas automáticas dos banners no topo da home.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor="carouselInterval" className="field-label">
              Tempo de troca
            </label>
            <div className="relative">
              <input
                id="carouselInterval"
                type="number"
                min={2}
                max={10}
                step={1}
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="field-input h-10 w-24 pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                segundos
              </span>
            </div>
          </div>
          <button
            type="submit"
            disabled={pending || seconds < 2 || seconds > 10}
            className="btn-primary h-10"
          >
            {pending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        Entre 2 e 10 segundos. Padrão: 5 segundos.
      </p>
      {saved && (
        <p role="status" className="mt-2 text-[11px] font-semibold text-emerald-700">
          Tempo salvo.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[11px] font-semibold text-rose-700">
          {error}
        </p>
      )}
    </form>
  );
};
