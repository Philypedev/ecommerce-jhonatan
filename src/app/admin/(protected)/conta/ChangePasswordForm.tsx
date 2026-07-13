'use client';

import { useState, useTransition } from 'react';
import { changePasswordAction } from '@/app/actions/account';

export const ChangePasswordForm = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    start(async () => {
      const result = await changePasswordAction({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      if (result.ok) {
        setSuccess(true);
        setCurrent('');
        setNext('');
        setConfirm('');
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card"
    >
      <h2 className="text-base font-bold text-ink-900">Trocar senha</h2>
      <p className="mt-1 text-xs text-ink-500">
        Mínimo de 8 caracteres, com pelo menos uma letra e um número. Não use senhas comuns.
      </p>

      {success && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Senha atualizada com sucesso. Ela já vale na sua próxima sessão.
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor="current" className="field-label">
            Senha atual
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="field-input"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="next" className="field-label">
              Nova senha
            </label>
            <input
              id="next"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="field-label">
              Confirmar nova senha
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="field-input"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-6 h-11 text-base"
      >
        {pending ? 'Salvando...' : 'Atualizar senha'}
      </button>
    </form>
  );
};
