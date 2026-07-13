'use client';

import { useState, useTransition } from 'react';
import { loginAction } from '@/app/actions/auth';

// ─────────────────────────── ícones inline (zero request) ───────────────────────────

const MailIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M17.94 17.94A10.5 10.5 0 0 1 12 20c-6.5 0-10-8-10-8a19.5 19.5 0 0 1 4.22-5.06" />
    <path d="M9.9 4.24A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a19.3 19.3 0 0 1-2.16 3.19" />
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M2 2l20 20" />
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
    <path d="M21 12a9 9 0 1 1-9-9" />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

// ─────────────────────────── formulário ───────────────────────────

export const LoginForm = ({ redirectTo }: { redirectTo?: string }) => {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (redirectTo) formData.set('redirect', redirectTo);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  };

  const inputBase =
    'peer w-full rounded-xl border border-ink-300 bg-white pl-10 pr-3 py-3 text-sm text-ink-900 placeholder:text-ink-500 transition-colors focus:border-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-700/15 hover:border-ink-500 disabled:bg-ink-100/60';

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
      {/* ─── E-mail ─── */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          E-mail
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-500 peer-focus:text-brand-700">
            <MailIcon />
          </span>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@suaempresa.com"
            aria-invalid={!!error}
            className={inputBase}
            disabled={pending}
          />
        </div>
      </div>

      {/* ─── Senha ─── */}
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500">
          Senha
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-500">
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-invalid={!!error}
            className={`${inputBase} pr-11`}
            disabled={pending}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-2 my-1 grid w-8 place-items-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700/40"
            tabIndex={0}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {/* ─── Erro ─── */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2.5 text-sm text-rose-700 animate-fade-in"
        >
          <AlertIcon className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Botão ─── */}
      <button
        type="submit"
        disabled={pending}
        className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand-900 px-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,115,150,0.6)] transition-all hover:bg-brand-700 hover:shadow-[0_14px_36px_-10px_rgba(0,115,150,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-700/25 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
      >
        {/* brilho sutil que passa quando não está pendente */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 opacity-0 transition-all duration-700 group-hover:left-full group-hover:opacity-100 motion-reduce:transition-none"
        />
        {pending ? (
          <>
            <SpinnerIcon className="animate-spin" />
            Autenticando…
          </>
        ) : (
          <>Entrar no painel</>
        )}
      </button>

      {/* ─── Micro-copy final ─── */}
      <p className="pt-2 text-xs leading-relaxed text-ink-500">
        Para redefinição de acesso, entre em contato com o responsável técnico da loja.
      </p>
    </form>
  );
};
