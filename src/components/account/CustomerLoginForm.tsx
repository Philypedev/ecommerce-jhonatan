'use client';

import { useState, useTransition } from 'react';
import { customerLoginAction } from '@/app/actions/customer-auth';

type Props = {
  redirect?: string;
};

export const CustomerLoginForm = ({ redirect = '/conta' }: Props) => {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await customerLoginAction(fd);
      // O caminho de sucesso redireciona (throw NEXT_REDIRECT) — só cai aqui
      // se der erro validável.
      if (res && 'ok' in res && !res.ok) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="redirect" value={redirect} />

      <div>
        <label htmlFor="email" className="field-label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="field-input"
          placeholder="voce@exemplo.com.br"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field-input"
          placeholder="Sua senha"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary h-11 w-full text-base"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
};
