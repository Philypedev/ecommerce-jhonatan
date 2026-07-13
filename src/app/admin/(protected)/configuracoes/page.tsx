import { getStoreSettings } from '@/lib/db/settings';
import { parseActivePaymentMethods } from '@/lib/payments';
import { SettingsForm } from './SettingsForm';
import { PaymentMethodsForm } from './PaymentMethodsForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();
  const activePayments = parseActivePaymentMethods(settings.paymentMethodsJson);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Configurações</h1>
        <p className="text-sm text-ink-500">WhatsApp, frete e formas de pagamento.</p>
      </div>

      <PaymentMethodsForm initial={activePayments} />

      <SettingsForm initial={settings} />
    </div>
  );
}
