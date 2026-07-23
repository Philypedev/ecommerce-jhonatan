import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireCustomer } from '@/lib/customer-auth';
import { formatCurrency } from '@/utils/formatCurrency';

export const metadata: Metadata = {
  title: 'Meus pedidos',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  NOVO: 'Novo pedido',
  EM_ATENDIMENTO: 'Em atendimento',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  FECHADO: 'Fechado',
};

const STATUS_TONE: Record<string, string> = {
  NOVO: 'bg-brand-50 text-brand-700',
  EM_ATENDIMENTO: 'bg-amber-50 text-amber-700',
  CONFIRMADO: 'bg-emerald-50 text-emerald-700',
  CANCELADO: 'bg-rose-50 text-rose-700',
  FECHADO: 'bg-ink-100 text-ink-700',
};

const formatDate = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export default async function CustomerOrdersPage() {
  const session = await requireCustomer('/conta/pedidos');
  const orders = await prisma.leadOrder.findMany({
    where: { customerId: session.cid },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      items: {
        select: { productName: true, quantity: true, subtotal: true },
        take: 10,
      },
    },
  });

  return (
    <section className="container-x py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-4 text-xs text-ink-500">
          <Link href="/conta" className="hover:text-ink-900">
            Minha conta
          </Link>{' '}
          / <span className="text-ink-700">Pedidos</span>
        </nav>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
          Meus pedidos
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Todos os pedidos vinculados à sua conta.
        </p>

        {orders.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
            <p className="text-base font-semibold text-ink-900">
              Você ainda não possui pedidos vinculados à sua conta.
            </p>
            <p className="mt-1 text-sm text-ink-500">
              Ao finalizar uma compra estando logado, ela aparece aqui automaticamente.
            </p>
            <Link href="/" className="btn-primary mt-6 inline-flex">
              Explorar produtos
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-500">
                      Pedido #{o.id.slice(-8).toUpperCase()} · {formatDate(o.createdAt)}
                    </p>
                    <p className="mt-1 text-base font-bold text-ink-900">
                      {formatCurrency(o.total)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      STATUS_TONE[o.status] ?? STATUS_TONE.NOVO
                    }`}
                  >
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>

                {o.items.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-ink-700">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="truncate">
                          {it.quantity}× {it.productName}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatCurrency(it.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
