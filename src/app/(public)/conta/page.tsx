import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireCustomer } from '@/lib/customer-auth';
import { customerLogoutAction } from '@/app/actions/customer-auth';

export const metadata: Metadata = {
  title: 'Minha conta',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function AccountHubPage() {
  const session = await requireCustomer('/conta');
  const customer = await prisma.customer.findUnique({
    where: { id: session.cid },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });
  if (!customer) {
    // Cliente deletado com sessão viva — força logout limpo.
    await customerLogoutAction();
    return null;
  }

  const [addressesCount, ordersCount] = await Promise.all([
    prisma.customerAddress.count({ where: { customerId: customer.id } }),
    prisma.leadOrder.count({ where: { customerId: customer.id } }),
  ]);

  return (
    <section className="container-x py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Minha conta
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
            Olá, {customer.name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Gerencie seus dados, pedidos e endereços salvos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card md:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
              Dados pessoais
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  Nome
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink-900">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  E-mail
                </dt>
                <dd className="mt-0.5 break-all text-sm font-semibold text-ink-900">
                  {customer.email}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  Telefone
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink-900">
                  {customer.phone || '—'}
                </dd>
              </div>
            </dl>
          </article>

          <ShortcutCard
            title="Meus pedidos"
            href="/conta/pedidos"
            hint={`${ordersCount} pedido${ordersCount === 1 ? '' : 's'} vinculado${ordersCount === 1 ? '' : 's'}`}
          />
          <ShortcutCard
            title="Meus endereços"
            href="/conta/enderecos"
            hint={`${addressesCount} endereço${addressesCount === 1 ? '' : 's'} salvo${addressesCount === 1 ? '' : 's'}`}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/" className="btn-outline">
            Voltar à loja
          </Link>
          <form action={customerLogoutAction}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

const ShortcutCard = ({
  title,
  href,
  hint,
}: {
  title: string;
  href: string;
  hint: string;
}) => (
  <Link
    href={href}
    className="group flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card transition-colors hover:border-brand-300"
  >
    <div>
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-0.5 text-xs text-ink-500">{hint}</p>
    </div>
    <span
      aria-hidden
      className="text-ink-400 transition-transform group-hover:translate-x-0.5"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </span>
  </Link>
);
