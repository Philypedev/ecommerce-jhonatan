'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireCustomer } from '@/lib/customer-auth';
import {
  customerAddressSchema,
  type CustomerAddressInput,
} from '@/lib/validation/schemas';

type ActionResult = { ok: true } | { ok: false; error: string };

const revalidateAccount = () => {
  revalidatePath('/conta/enderecos');
  revalidatePath('/conta');
  // Checkout usa o endereço padrão para prefill — revalida também.
  revalidatePath('/checkout');
};

/**
 * Se `makeDefault=true`, zera `isDefault` dos demais endereços do cliente
 * ANTES de marcar o novo — SQLite não tem partial unique index, então a
 * exclusividade "só um default por cliente" é enforçada em transaction.
 */
const clearOtherDefaults = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  customerId: string,
  exceptId?: string,
): Promise<void> => {
  await tx.customerAddress.updateMany({
    where: {
      customerId,
      isDefault: true,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    data: { isDefault: false },
  });
};

export async function createAddressAction(
  input: CustomerAddressInput,
): Promise<ActionResult> {
  const session = await requireCustomer('/conta/enderecos');
  const parsed = customerAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const data = parsed.data;
  // Se é o primeiro endereço do cliente, promove a default automaticamente.
  const existingCount = await prisma.customerAddress.count({
    where: { customerId: session.cid },
  });
  const isDefault = data.isDefault || existingCount === 0;

  await prisma.$transaction(async (tx) => {
    if (isDefault) await clearOtherDefaults(tx, session.cid);
    await tx.customerAddress.create({
      data: {
        customerId: session.cid,
        label: data.label || null,
        zipCode: data.zipCode.replace(/\D/g, ''),
        street: data.street,
        number: data.number,
        complement: data.complement || null,
        district: data.district || null,
        city: data.city,
        state: data.state,
        isDefault,
      },
    });
  });

  revalidateAccount();
  return { ok: true };
}

export async function updateAddressAction(
  id: string,
  input: CustomerAddressInput,
): Promise<ActionResult> {
  const session = await requireCustomer('/conta/enderecos');
  const parsed = customerAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  // Sanidade: só o dono pode editar. Se a linha não é dele, tratamos como
  // não-encontrado — nunca revelamos existência.
  const owned = await prisma.customerAddress.findFirst({
    where: { id, customerId: session.cid },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: 'Endereço não encontrado.' };

  const data = parsed.data;
  await prisma.$transaction(async (tx) => {
    if (data.isDefault) await clearOtherDefaults(tx, session.cid, id);
    await tx.customerAddress.update({
      where: { id },
      data: {
        label: data.label || null,
        zipCode: data.zipCode.replace(/\D/g, ''),
        street: data.street,
        number: data.number,
        complement: data.complement || null,
        district: data.district || null,
        city: data.city,
        state: data.state,
        isDefault: data.isDefault,
      },
    });
  });

  revalidateAccount();
  return { ok: true };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const session = await requireCustomer('/conta/enderecos');
  const owned = await prisma.customerAddress.findFirst({
    where: { id, customerId: session.cid },
    select: { id: true, isDefault: true },
  });
  if (!owned) return { ok: false, error: 'Endereço não encontrado.' };

  await prisma.$transaction(async (tx) => {
    await tx.customerAddress.delete({ where: { id } });
    // Se removeu o default, promove o mais recente restante a default.
    if (owned.isDefault) {
      const next = await tx.customerAddress.findFirst({
        where: { customerId: session.cid },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (next) {
        await tx.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  });

  revalidateAccount();
  return { ok: true };
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  const session = await requireCustomer('/conta/enderecos');
  const owned = await prisma.customerAddress.findFirst({
    where: { id, customerId: session.cid },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: 'Endereço não encontrado.' };

  await prisma.$transaction(async (tx) => {
    await clearOtherDefaults(tx, session.cid, id);
    await tx.customerAddress.update({ where: { id }, data: { isDefault: true } });
  });

  revalidateAccount();
  return { ok: true };
}
