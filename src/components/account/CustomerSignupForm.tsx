'use client';

import { useState, useTransition } from 'react';
import { customerSignupAction } from '@/app/actions/customer-auth';

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

type Props = {
  redirect?: string;
};

export const CustomerSignupForm = ({ redirect = '/conta' }: Props) => {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await customerSignupAction(fd);
      if (res && 'ok' in res && !res.ok) setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="redirect" value={redirect} />

      <div>
        <label htmlFor="name" className="field-label">
          Nome completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="field-input"
          placeholder="Como devemos te chamar"
        />
      </div>

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
        <label htmlFor="phone" className="field-label">
          WhatsApp (opcional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          className="field-input"
          placeholder="(11) 99999-9999"
          inputMode="numeric"
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
          autoComplete="new-password"
          minLength={6}
          required
          className="field-input"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="field-input"
          placeholder="Repita sua senha"
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
        {pending ? 'Criando…' : 'Criar conta'}
      </button>
    </form>
  );
};
