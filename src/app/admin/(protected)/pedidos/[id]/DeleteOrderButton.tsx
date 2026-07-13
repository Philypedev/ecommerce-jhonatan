'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteOrderAction } from '@/app/actions/orders';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toaster';

export const DeleteOrderButton = ({ id }: { id: string }) => {
  const router = useRouter();
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const handle = async () => {
    const ok = await confirm({
      title: 'Excluir este pedido?',
      description:
        'O pedido será removido permanentemente do painel. A conversa no WhatsApp não é afetada, mas você perderá o histórico salvo no admin.',
      confirmLabel: 'Excluir pedido',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      try {
        await deleteOrderAction(id);
        toast.success('Pedido excluído.');
        router.push('/admin/pedidos');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível excluir.');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
    >
      {pending ? 'Excluindo...' : 'Excluir pedido'}
    </button>
  );
};
