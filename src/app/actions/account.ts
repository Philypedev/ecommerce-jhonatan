'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/lib/validation/schemas';

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user) return { ok: false, error: 'Sessão inválida — faça login novamente.' };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { ok: false, error: 'Senha atual incorreta.' };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { ok: true };
}

/** Detecta se o usuário ainda está com a senha padrão do seed. */
export async function isUsingDefaultPassword(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return false;
  try {
    return await bcrypt.compare('admin123', user.passwordHash);
  } catch {
    return false;
  }
}
