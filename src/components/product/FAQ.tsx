'use client';

import { useState } from 'react';
import type { FAQItem } from '@/types';
import { ChevronDown } from '@/components/ui/Icon';

export const FAQ = ({ items, title = 'Perguntas frequentes' }: { items: FAQItem[]; title?: string }) => {
  const [open, setOpen] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <section aria-labelledby="faq-title" className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
      <h2 id="faq-title" className="text-lg font-bold text-ink-900">{title}</h2>
      <ul className="mt-4 divide-y divide-ink-100">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={it.question}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-ink-900"
                aria-expanded={isOpen}
              >
                <span>{it.question}</span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-ink-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <p className="pb-4 pr-8 text-sm leading-relaxed text-ink-700">{it.answer}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
