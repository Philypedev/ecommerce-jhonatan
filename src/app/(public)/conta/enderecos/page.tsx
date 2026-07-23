import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireCustomer } from '@/lib/customer-auth';
import { CustomerAddressesManager } from '@/components/account/CustomerAddressesManager';

export const metadata: Metadata = {
  title: 'Meus endereços',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function CustomerAddressesPage() {
  const session = await requireCustomer('/conta/enderecos');
  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: session.cid },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <section className="container-x py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-4 text-xs text-ink-500">
          <Link href="/conta" className="hover:text-ink-900">
            Minha conta
          </Link>{' '}
          / <span className="text-ink-700">Endereços</span>
        </nav>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
          Meus endereços
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          O endereço marcado como padrão é usado automaticamente no checkout.
        </p>

        <div className="mt-6">
          <CustomerAddressesManager
            initial={addresses.map((a) => ({
              id: a.id,
              label: a.label ?? '',
              zipCode: a.zipCode,
              street: a.street,
              number: a.number,
              complement: a.complement ?? '',
              district: a.district ?? '',
              city: a.city,
              state: a.state,
              isDefault: a.isDefault,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
