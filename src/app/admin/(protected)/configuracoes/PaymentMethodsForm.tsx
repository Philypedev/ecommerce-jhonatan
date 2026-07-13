'use client';

import { useState, useTransition } from 'react';
import { updatePaymentMethodsAction } from '@/app/actions/settings';
import {
  ALL_PAYMENT_METHODS,
  type PaymentMethodValue,
} from '@/lib/payments';

export const PaymentMethodsForm = ({ initial }: { initial: PaymentMethodValue[] }) => {
  const [active, setActive] = useState<PaymentMethodValue[]>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggle = (value: PaymentMethodValue) => {
    setActive((curr) =>
      curr.includes(value) ? curr.filter((v) => v !== value) : [...curr, value],
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const result = await updatePaymentMethodsAction({ methods: active });
      if (result.ok) setSuccess(true);
      else setError(result.error);
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card"
    >
      <h2 className="text-base font-bold text-ink-900">Formas de pagamento</h2>
      <p className="mt-1 text-xs text-ink-500">
        Apenas as opções marcadas aparecerão no checkout do cliente. O pagamento sempre
        é confirmado pelo WhatsApp — nenhum valor é cobrado neste site.
      </p>

      {success && (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Métodos de pagamento atualizados.
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {ALL_PAYMENT_METHODS.map((m) => (
          <li key={m.value}>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                active.includes(m.value)
                  ? 'border-brand-700 bg-brand-50/40'
                  : 'border-ink-300 hover:border-ink-500'
              }`}
            >
              <input
                type="checkbox"
                checked={active.includes(m.value)}
                onChange={() => toggle(m.value)}
              />
              <span className="text-sm font-medium text-ink-900">{m.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <button
        type="submit"
        disabled={pending || active.length === 0}
        className="btn-primary mt-5 h-11 text-base sm:w-auto"
      >
        {pending ? 'Salvando...' : 'Salvar formas de pagamento'}
      </button>
    </form>
  );
};
