'use client';

import { useTransition } from 'react';
import { updateOrderStatusAction } from '@/app/actions/orders';

const options = [
  { value: 'NOVO', label: 'Novo' },
  { value: 'EM_ATENDIMENTO', label: 'Em atendimento' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'FECHADO', label: 'Fechado' },
];

export const OrderStatusSelector = ({ id, status }: { id: string; status: string }) => {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={status}
      onChange={(e) => start(() => updateOrderStatusAction(id, e.target.value))}
      disabled={pending}
      className="field-input h-10 max-w-xs"
      aria-label="Alterar status"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
};
