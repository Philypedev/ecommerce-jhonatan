'use client';

import { useState } from 'react';
import { AlertIcon, CheckIcon } from '@/components/ui/Icon';

type Props = {
  message: string;
  className?: string;
  compact?: boolean;
};

export const CopyMessageButton = ({ message, className, compact }: Props) => {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    setFailed(false);
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        // Fallback pra browsers sem clipboard API.
        const el = document.createElement('textarea');
        el.value = message;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        if (!ok) throw new Error('copy failed');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 3000);
    }
  };

  const base = compact
    ? 'inline-flex items-center gap-1.5 rounded-md border border-ink-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-900 hover:bg-ink-100'
    : 'btn-outline text-sm inline-flex items-center gap-1.5';

  return (
    <button type="button" onClick={copy} className={`${base} ${className ?? ''}`}>
      {copied ? (
        <>
          <CheckIcon size={compact ? 12 : 14} className="text-emerald-700" aria-hidden />
          Copiado
        </>
      ) : failed ? (
        <>
          <AlertIcon size={compact ? 12 : 14} className="text-rose-700" aria-hidden />
          Falhou — copie manual
        </>
      ) : (
        'Copiar mensagem'
      )}
    </button>
  );
};
