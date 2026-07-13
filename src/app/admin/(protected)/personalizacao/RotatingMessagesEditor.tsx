'use client';

import { useState, useTransition } from 'react';
import {
  createRotatingMessageAction,
  deleteRotatingMessageAction,
  moveRotatingMessageAction,
  updateRotatingMessageAction,
} from '@/app/actions/settings';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toaster';

type Message = {
  id: string;
  text: string;
  active: boolean;
  position: number;
};

export const RotatingMessagesEditor = ({ messages }: { messages: Message[] }) => {
  const [text, setText] = useState('');
  const [pending, start] = useTransition();

  const add = () => {
    if (!text.trim()) return;
    start(async () => {
      await createRotatingMessageAction(text.trim());
      setText('');
    });
  };

  return (
    <section id="mensagens" className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card scroll-mt-24">
      <h2 className="text-base font-bold text-ink-900">Faixa rotativa (abaixo do hero)</h2>
      <p className="mt-1 text-xs text-ink-500">
        Mensagens curtas que alternam automaticamente. Recomendamos até 8 frases.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ex.: Entrega para todo o Brasil"
          className="field-input"
        />
        <button type="button" onClick={add} disabled={pending} className="btn-primary shrink-0">
          + Adicionar
        </button>
      </div>

      <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100">
        {messages.length === 0 && (
          <li className="p-4 text-sm text-ink-500">Nenhuma mensagem cadastrada.</li>
        )}
        {messages.map((m, i) => (
          <MessageRow
            key={m.id}
            message={m}
            isFirst={i === 0}
            isLast={i === messages.length - 1}
          />
        ))}
      </ul>
    </section>
  );
};

const MessageRow = ({
  message,
  isFirst,
  isLast,
}: {
  message: Message;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [text, setText] = useState(message.text);
  const [active, setActive] = useState(message.active);
  const [pending, start] = useTransition();

  const confirm = useConfirm();
  const toast = useToast();
  const save = () => start(() => updateRotatingMessageAction(message.id, text, active));
  const remove = async () => {
    const ok = await confirm({
      title: 'Remover mensagem da faixa?',
      description: `"${message.text}" deixará de aparecer no carrossel rotativo da home.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      try {
        await deleteRotatingMessageAction(message.id);
        toast.success('Mensagem removida.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível remover.');
      }
    });
  };
  const move = (dir: 'up' | 'down') => start(() => moveRotatingMessageAction(message.id, dir));

  return (
    <li className="flex flex-wrap items-center gap-2 p-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        className="field-input flex-1 min-w-[200px]"
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            setActive(e.target.checked);
            start(() => updateRotatingMessageAction(message.id, text, e.target.checked));
          }}
        />
        Ativa
      </label>
      <button type="button" disabled={isFirst || pending} onClick={() => move('up')} className="rounded-md border border-ink-300 px-2 py-1 text-xs hover:bg-ink-100 disabled:opacity-30">↑</button>
      <button type="button" disabled={isLast || pending} onClick={() => move('down')} className="rounded-md border border-ink-300 px-2 py-1 text-xs hover:bg-ink-100 disabled:opacity-30">↓</button>
      <button type="button" disabled={pending} onClick={remove} className="rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
        Remover
      </button>
    </li>
  );
};
