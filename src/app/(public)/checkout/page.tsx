import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { getStoreSettings } from '@/lib/db/settings';
import { parseActivePaymentMethods } from '@/lib/payments';

export const metadata: Metadata = {
  title: 'Checkout pelo WhatsApp',
  description:
    'Preencha seus dados e finalize seu pedido com segurança pelo WhatsApp. Nossa equipe confirma disponibilidade, frete e pagamento.',
  robots: { index: false, follow: true },
};

export default async function CheckoutPage() {
  const settings = await getStoreSettings();
  const activePayments = parseActivePaymentMethods(settings.paymentMethodsJson);
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
      />
    </>
  );
}
