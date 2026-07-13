import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLeadOrder } from '@/lib/db/orders';
import { formatCurrency } from '@/utils/formatCurrency';
import { OrderStatusSelector } from './OrderStatusSelector';
import { DeleteOrderButton } from './DeleteOrderButton';
import { CopyMessageButton } from './CopyMessageButton';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  NOVO: 'Novo',
  EM_ATENDIMENTO: 'Em atendimento',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  FECHADO: 'Fechado',
};

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  'cartao-credito': 'Cartão de Crédito',
  'cartao-debito': 'Cartão de Débito',
  boleto: 'Boleto bancário',
  dinheiro: 'Dinheiro',
  'a-combinar': 'A combinar pelo WhatsApp',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getLeadOrder(id);
  if (!order) notFound();

  const onlyDigits = order.customerPhone.replace(/\D/g, '');
  const phoneIntl = onlyDigits.startsWith('55') ? onlyDigits : `55${onlyDigits}`;
  const waLink = `https://wa.me/${phoneIntl}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/pedidos" className="text-xs font-semibold text-brand-700 hover:underline">← Voltar</Link>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-sm text-ink-500">
            {new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            }).format(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusSelector id={order.id} status={order.status} />
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="btn-accent"
          >
            Abrir WhatsApp do cliente
          </a>
          <CopyMessageButton message={order.whatsappMessage} />
          <DeleteOrderButton id={order.id} />
        </div>
      </div>

      <p className="rounded-lg border border-ink-100 bg-ink-100/40 px-4 py-2 text-xs text-ink-700">
        Fluxo recomendado: <span className="font-semibold text-ink-900">Novo → Em atendimento → Confirmado → Fechado</span>.
        Atualize o status conforme a conversa evoluir pelo WhatsApp.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h2 className="text-base font-bold text-ink-900">Cliente</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><dt className="text-xs text-ink-500">Nome</dt><dd className="text-sm font-medium">{order.customerName}</dd></div>
              <div><dt className="text-xs text-ink-500">Telefone</dt><dd className="text-sm font-medium">{order.customerPhone}</dd></div>
              {order.customerEmail && <div><dt className="text-xs text-ink-500">E-mail</dt><dd className="text-sm font-medium">{order.customerEmail}</dd></div>}
              {order.customerDocument && <div><dt className="text-xs text-ink-500">CPF/CNPJ</dt><dd className="text-sm font-medium">{order.customerDocument}</dd></div>}
            </dl>
          </section>

          {order.deliveryType === 'entrega' && (
            <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
              <h2 className="text-base font-bold text-ink-900">Endereço</h2>
              <p className="mt-2 text-sm text-ink-700">
                {order.street}, {order.number}{order.complement ? ` — ${order.complement}` : ''}<br />
                {order.neighborhood} — {order.city}/{order.state}<br />
                CEP {order.cep}
              </p>
            </section>
          )}

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h2 className="text-base font-bold text-ink-900">Produtos</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="py-2">Produto</th>
                  <th className="py-2">Qtd</th>
                  <th className="py-2">Unit.</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2">
                      <p className="font-medium text-ink-900">{it.productName}</p>
                      <p className="text-xs text-ink-500">SKU {it.sku}</p>
                    </td>
                    <td className="py-2">{it.quantity}</td>
                    <td className="py-2">{formatCurrency(it.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-ink-100">
                  <td colSpan={3} className="pt-3 text-right text-sm text-ink-500">Subtotal</td>
                  <td className="pt-3 text-right font-semibold">{formatCurrency(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right text-sm text-ink-500">Frete</td>
                  <td className="text-right text-ink-700">A confirmar</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-1 text-right text-base font-bold text-ink-900">Total estimado</td>
                  <td className="pt-1 text-right text-base font-extrabold text-ink-900">{formatCurrency(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink-900">Mensagem enviada ao WhatsApp</h2>
              <CopyMessageButton message={order.whatsappMessage} compact />
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-ink-100/60 p-4 text-xs text-ink-700">
              {order.whatsappMessage}
            </pre>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-ink-900">Status atual</h2>
            <p className="mt-2 text-base font-semibold text-ink-700">{statusLabels[order.status] || order.status}</p>
          </section>
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-ink-900">Pagamento</h2>
            <p className="mt-2 text-sm">{paymentLabels[order.paymentMethod] || order.paymentMethod}</p>
          </section>
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-ink-900">Entrega</h2>
            <p className="mt-2 text-sm capitalize">{order.deliveryType}</p>
          </section>
          {order.observations && (
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
              <h2 className="text-sm font-bold text-ink-900">Observações</h2>
              <p className="mt-2 text-sm text-ink-700">{order.observations}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
