'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi>({
  success: () => {},
  error: () => {},
  info: () => {},
});

const DURATION_MS = 4000;

const STYLES: Record<ToastType, { box: string; icon: string; iconBg: string }> = {
  success: {
    box: 'border-emerald-200 bg-white text-emerald-900',
    icon: 'M5 12 10 17 20 7',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  error: {
    box: 'border-rose-200 bg-white text-rose-900',
    icon: 'M12 9v4 M12 17h.01',
    iconBg: 'bg-rose-100 text-rose-700',
  },
  info: {
    box: 'border-ink-200 bg-white text-ink-900',
    icon: 'M12 8v4 M12 16h.01',
    iconBg: 'bg-brand-50 text-brand-700',
  },
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((curr) => [...curr, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, DURATION_MS);
  }, []);

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border ${s.box} px-4 py-3 shadow-lg`}
            >
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.iconBg}`} aria-hidden>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  {t.type === 'success' ? (
                    <path d="M5 12 10 17 20 7" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4" />
                      <path d="M12 16h.01" />
                    </>
                  )}
                </svg>
              </span>
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => setToasts((curr) => curr.filter((x) => x.id !== t.id))}
                className="text-xs text-ink-500 hover:text-ink-900"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
