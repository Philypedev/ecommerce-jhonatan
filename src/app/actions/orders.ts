'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

const ALLOWED = ['NOVO', 'EM_ATENDIMENTO', 'CONFIRMADO', 'CANCELADO', 'FECHADO'];

export async function updateOrderStatusAction(id: string, status: string) {
  await requireAdmin();
  if (!ALLOWED.includes(status)) throw new Error('Status inválido');
  await prisma.leadOrder.update({ where: { id }, data: { status } });
  revalidatePath('/admin/pedidos');
  revalidatePath(`/admin/pedidos/${id}`);
}

export async function deleteOrderAction(id: string) {
  await requireAdmin();
  await prisma.leadOrder.delete({ where: { id } });
  revalidatePath('/admin/pedidos');
}
