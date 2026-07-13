'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import {
  deleteProductAction,
  duplicateProductAction,
  toggleProductStatusAction,
} from '@/app/actions/products';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/components/admin/Toaster';

type Props = {
  productId: string;
  slug: string;
  status: string;
  isPublic: boolean; // se o produto aparece na loja pública (usado pra "Ver na loja")
};

export const ProductsListActions = ({ productId, slug, status, isPublic }: Props) => {
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Excluir produto definitivamente?',
      description:
        'O produto será removido do catálogo, junto com imagens, especificações e FAQ. Preferimos "Desativar" — o produto some da loja mas o histórico é preservado. Pedidos antigos com este produto não são afetados.',
      confirmLabel: 'Excluir mesmo assim',
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      try {
        await deleteProductAction(productId);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')) {
          toast.error(e.message);
        }
      }
    });
  };

  const handleToggle = () => {
    const next = status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    start(async () => {
      try {
        await toggleProductStatusAction(productId, next);
        toast.success(next === 'ACTIVE' ? 'Produto ativado.' : 'Produto desativado.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível alterar o status.');
      }
    });
  };

  const handleDuplicate = () => {
    start(async () => {
      try {
        await duplicateProductAction(productId);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')) {
          toast.error(e.message);
        }
      }
    });
  };

  const smallBtn = 'rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link
        href={`/admin/produtos/${productId}`}
        className={`${smallBtn} border-brand-700 bg-brand-700 text-white hover:bg-brand-900`}
      >
        Editar
      </Link>
      {isPublic ? (
        <Link
          href={`/produto/${slug}`}
          target="_blank"
          rel="noreferrer"
          className={`${smallBtn} border-ink-300 bg-white text-ink-900 hover:bg-ink-100`}
        >
          Ver na loja
        </Link>
      ) : null}
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={pending}
        className={`${smallBtn} border-ink-300 bg-white text-ink-700 hover:bg-ink-100`}
      >
        Duplicar
      </button>
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        className={`${smallBtn} border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100`}
      >
        {status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`${smallBtn} border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100`}
      >
        Excluir
      </button>
    </div>
  );
};
