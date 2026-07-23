import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { getStoreSettings } from '@/lib/db/settings';
import { parseActivePaymentMethods } from '@/lib/payments';
import { getCustomerSession } from '@/lib/customer-auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Checkout pelo WhatsApp',
  description:
    'Preencha seus dados e finalize seu pedido com segurança pelo WhatsApp. Nossa equipe confirma disponibilidade, frete e pagamento.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const settings = await getStoreSettings();
  const activePayments = parseActivePaymentMethods(settings.paymentMethodsJson);

  // Auto-fill se cliente logado — dados do cadastro + endereço padrão.
  // Guest checkout continua funcionando: `initial` fica null e o form
  // abre em branco como antes.
  const session = await getCustomerSession().catch(() => null);
  let initial: {
    name: string;
    email: string;
    phone: string;
    zipCode: string;
    street: string;
    number: string;
    complement: string;
    district: string;
    city: string;
    state: string;
  } | null = null;

  if (session) {
    const [customer, address] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: session.cid },
        select: { name: true, email: true, phone: true },
      }),
      prisma.customerAddress.findFirst({
        where: { customerId: session.cid, isDefault: true },
        select: {
          zipCode: true,
          street: true,
          number: true,
          complement: true,
          district: true,
          city: true,
          state: true,
        },
      }),
    ]);
    if (customer) {
      initial = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? '',
        zipCode: address?.zipCode ?? '',
        street: address?.street ?? '',
        number: address?.number ?? '',
        complement: address?.complement ?? '',
        district: address?.district ?? '',
        city: address?.city ?? '',
        state: address?.state ?? '',
      };
    }
  }

  return (
    <>
      <div className="bg-brand-950 text-white">
        <div className="container-x py-10">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Checkout pelo WhatsApp
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-100/85">
            Preencha seus dados em poucos passos. Ao finalizar, abriremos o WhatsApp com seu pedido formatado, e nossa equipe confirma pagamento, frete e prazo.
          </p>
        </div>
      </div>
      <CheckoutForm
        whatsappNumber={settings.whatsappNumber}
        activePayments={activePayments}
        initial={initial}
      />
    </>
  );
}
