'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botão de confirmação em vermelho (para ações irreversíveis). */
  destructive?: boolean;
};

type State = ConfirmOptions & {
  id: number;
  resolve: (v: boolean) => void;
};

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<State | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ id: Date.now() + Math.random(), ...opts, resolve });
      }),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      setState((s) => {
        if (s) s.resolve(result);
        return null;
      });
    },
    [],
  );

  // Foco no botão Cancelar (default seguro) ao abrir + Esc fecha
  useEffect(() => {
    if (!state) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  // Trava o scroll do body enquanto o dialog está aberto
  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => close(false)}
            className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start gap-4 p-6">
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  state.destructive
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-brand-50 text-brand-700'
                }`}
                aria-hidden
              >
                {state.destructive ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>
                )}
              </span>
              <div className="flex-1">
                <h3
                  id="confirm-title"
                  className="text-base font-bold text-ink-900"
                >
                  {state.title}
                </h3>
                {state.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                    {state.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-ink-100 bg-ink-100/40 px-6 py-4">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="btn-outline"
              >
                {state.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={
                  state.destructive
                    ? 'btn h-10 bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:ring-rose-500'
                    : 'btn-primary'
                }
              >
                {state.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
