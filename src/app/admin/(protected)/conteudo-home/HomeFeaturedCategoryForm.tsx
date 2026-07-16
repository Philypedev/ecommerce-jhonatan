'use client';

import { useState, useTransition } from 'react';
import { updateHomeFeaturedCategoryAction } from '@/app/actions/settings';

type CategoryOption = { id: string; name: string };

type Props = {
  categories: CategoryOption[];
  initial: string | null;
};

/**
 * Escolha da coleção que alimenta a vitrine "Novidades para sua viagem".
 * Server-side: apenas produtos ACTIVE + featured + categoryId dessa coleção
 * aparecem. Sem seleção (opção vazia) → vitrine some da home.
 */
export const HomeFeaturedCategoryForm = ({ categories, initial }: Props) => {
  const [value, setValue] = useState<string>(initial ?? '');
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const dirty = (initial ?? '') !== value;

  const save = () => {
    setFeedback(null);
    start(async () => {
      const res = await updateHomeFeaturedCategoryAction({
        featuredCategoryId: value ? value : null,
      });
      if (res.ok) {
        setFeedback({ ok: true, msg: 'Coleção da vitrine atualizada.' });
      } else {
        setFeedback({ ok: false, msg: res.error });
      }
    });
  };

  return (
    <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink-900">
            Coleção da vitrine &quot;Novidades para sua viagem&quot;
          </h3>
          <p className="mt-1 text-xs text-ink-500">
            A vitrine mostra apenas produtos <strong>ativos</strong> com
            <strong> &quot;Destacar na home&quot;</strong> marcado.
            Se você escolher uma coleção aqui, o destaque também precisa
            pertencer a ela. Sem destaques cadastrados, a seção não
            aparece na home.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label
            htmlFor="featured-category"
            className="mb-1 block text-xs font-semibold text-ink-700"
          >
            Coleção da vitrine
          </label>
          <select
            id="featured-category"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field-input"
          >
            <option value="">— Sem restrição de coleção</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="btn-primary h-11 whitespace-nowrap sm:h-10"
        >
          {pending ? 'Salvando…' : 'Salvar coleção'}
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          className={`mt-3 rounded-md px-3 py-2 text-xs ${
            feedback.ok
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-rose-50 text-rose-800'
          }`}
        >
          {feedback.msg}
        </p>
      )}
    </article>
  );
};
