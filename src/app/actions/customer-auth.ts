'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_SESSION_COOKIE,
  customerSessionCookieOptions,
  normalizeEmail,
  safeAccountRedirect,
  signCustomerSession,
} from '@/lib/customer-auth';
import {
  customerLoginSchema,
  customerSignupSchema,
} from '@/lib/validation/schemas';

const BCRYPT_COST = 10;
// Mensagem GENÉRICA para login inválido — nunca revela se o email existe
// (evita user-enumeration). Mesmo texto para "email não existe" e "senha errada".
const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';

// Hash "de mentira" com o mesmo custo do real, usado APENAS para uniformizar
// o tempo de resposta do login quando o email não existe. Sem isso, um
// atacante consegue distinguir "email existe" (⏱ ~100ms do bcrypt) de "email
// não existe" (⏱ instant), e enumerar contas por timing side-channel. Este
// hash é apenas um placeholder — nunca compara true com nenhuma senha real.
const DUMMY_BCRYPT_HASH =
  '$2b$10$0123456789012345678901uYQoT7XjnvJqBpZ5Sf5Ns7lOpZQnbXxu';

type ActionResult = { ok: true } | { ok: false; error: string };

export async function customerSignupAction(formData: FormData): Promise<ActionResult> {
  const parsed = customerSignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Aqui podemos revelar porque a intenção é criar conta — se o email já
    // está cadastrado, dizemos para o usuário fazer login.
    return { ok: false, error: 'Já existe uma conta com esse e-mail. Faça login para continuar.' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      phone: parsed.data.phone || null,
      passwordHash,
    },
    select: { id: true, email: true, name: true },
  });

  const token = await signCustomerSession({
    cid: customer.id,
    email: customer.email,
    name: customer.name,
  });
  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions);

  const target = safeAccountRedirect(formData.get('redirect') as string | null);
  redirect(target);
}

export async function customerLoginAction(formData: FormData): Promise<ActionResult> {
  const parsed = customerLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Dados inválidos' };
  }

  const email = normalizeEmail(parsed.data.email);
  const customer = await prisma.customer.findUnique({ where: { email } });

  // Rodamos bcrypt.compare mesmo quando o email não existe. Assim o tempo
  // total do login fica constante e um atacante não consegue enumerar
  // e-mails cadastrados observando latência (timing side-channel).
  const hashToCompare = customer?.passwordHash ?? DUMMY_BCRYPT_HASH;
  const passwordOk = await bcrypt.compare(parsed.data.password, hashToCompare);

  if (!customer || !passwordOk) {
    return { ok: false, error: INVALID_CREDENTIALS };
  }

  const token = await signCustomerSession({
    cid: customer.id,
    email: customer.email,
    name: customer.name,
  });
  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, token, customerSessionCookieOptions);

  const target = safeAccountRedirect(formData.get('redirect') as string | null);
  redirect(target);
}

export async function customerLogoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_SESSION_COOKIE);
  redirect('/conta/entrar');
}
