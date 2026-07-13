'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';
import { loginSchema } from '@/lib/validation/schemas';

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) return { error: 'E-mail ou senha incorretos.' };

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return { error: 'E-mail ou senha incorretos.' };

  const token = await signSession({ uid: user.id, email: user.email, role: user.role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);

  const redirectTo = (formData.get('redirect') as string | null) || '/admin';
  redirect(redirectTo.startsWith('/admin') ? redirectTo : '/admin');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/admin/login');
}
