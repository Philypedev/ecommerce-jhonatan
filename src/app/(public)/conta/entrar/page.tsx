import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerSession, safeAccountRedirect } from '@/lib/customer-auth';
import { CustomerLoginForm } from '@/components/account/CustomerLoginForm';

export const metadata: Metadata = {
  title: 'Entrar na minha conta',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: to } = await searchParams;
  const safeTo = safeAccountRedirect(to);
  const existing = await getCustomerSession();
  if (existing) redirect(safeTo);

  return (
    <section className="container-x py-14">
      <div className="mx-auto max-w-md rounded-2xl border border-ink-100 bg-white p-8 shadow-card">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Entrar na sua conta
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Acompanhe pedidos e mantenha seus endereços salvos.
        </p>

        <div className="mt-6">
          <CustomerLoginForm redirect={safeTo} />
        </div>

        <p className="mt-6 text-center text-sm text-ink-700">
          Ainda não tem conta?{' '}
          <Link
            href={`/conta/criar${safeTo !== '/conta' ? `?redirect=${encodeURIComponent(safeTo)}` : ''}`}
            className="font-semibold text-brand-700 hover:text-brand-900"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </section>
  );
}
