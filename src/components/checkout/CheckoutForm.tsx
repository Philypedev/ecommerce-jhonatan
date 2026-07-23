'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useCart, cartSubtotal } from '@/store/cart';
import { formatCurrency } from '@/utils/formatCurrency';
import { buildWhatsAppLink } from '@/utils/whatsapp';
import { saveLeadOrderAction } from '@/app/actions/checkout';
import { siteConfig } from '@/config/site';
import type { CheckoutData, DeliveryType, PaymentMethod } from '@/types';
import { CartIcon, ShieldIcon, WhatsAppIcon } from '@/components/ui/Icon';
import { trackEvent } from '@/lib/analytics';

const ufs = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const ALL_PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao-credito', label: 'Cartão de Crédito' },
  { value: 'cartao-debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto bancário' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'a-combinar', label: 'A combinar pelo WhatsApp' },
];

const formatPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const formatCep = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
};

export type CheckoutInitial = {
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
};

const makeInitialData = (
  payment: PaymentMethod,
  prefill?: CheckoutInitial | null,
): CheckoutData => ({
  name: prefill?.name ?? '',
  phone: prefill?.phone ? formatPhone(prefill.phone) : '',
  document: '',
  email: prefill?.email ?? '',
  cep: prefill?.zipCode ? formatCep(prefill.zipCode) : '',
  street: prefill?.street ?? '',
  number: prefill?.number ?? '',
  complement: prefill?.complement ?? '',
  district: prefill?.district ?? '',
  city: prefill?.city ?? '',
  state: prefill?.state ?? '',
  deliveryType: 'entrega',
  deliveryNote: '',
  payment,
  notes: '',
});

type Props = {
  whatsappNumber: string;
  activePayments?: string[];
  initial?: CheckoutInitial | null;
};

export const CheckoutForm = ({ whatsappNumber, activePayments, initial }: Props) => {
  const paymentOptions =
    activePayments && activePayments.length > 0
      ? ALL_PAYMENT_OPTIONS.filter((o) => activePayments.includes(o.value))
      : ALL_PAYMENT_OPTIONS;
  // Ajusta o default se o pagamento atual não estiver entre os ativos
  const defaultPayment = (paymentOptions[0]?.value ?? 'pix') as PaymentMethod;
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const [form, setForm] = useState<CheckoutData>(() => makeInitialData(defaultPayment, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cepLoading, setCepLoading] = useState(false);

  const subtotal = cartSubtotal(lines);
  const isEmpty = lines.length === 0;
  const isDelivery = form.deliveryType === 'entrega';

  const set = <K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Dispara InitiateCheckout uma vez que o carrinho hidratou e tem itens.
  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    trackEvent('InitiateCheckout', {
      num_items: lines.reduce((n, l) => n + l.quantity, 0),
      content_ids: lines.map((l) => l.sku),
      contents: lines.map((l) => ({
        id: l.sku,
        quantity: l.quantity,
        item_price: l.price,
      })),
      currency: 'BRL',
      value: subtotal,
    });
    // dispara só na montagem com carrinho hidratado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ViaCEP — consulta o endereço quando o CEP fica completo.
  const lookupCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('http');
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        setErrors((e) => ({ ...e, cep: 'CEP não encontrado.' }));
        return;
      }
      setForm((f) => ({
        ...f,
        street: data.logradouro || f.street,
        district: data.bairro || f.district,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
      setErrors((e) => {
        const next = { ...e };
        delete next.cep;
        return next;
      });
    } catch {
      // Falhou rede — não trava o checkout, deixa o cliente preencher manual.
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (raw: string) => {
    const formatted = formatCep(raw);
    set('cep', formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) void lookupCep(formatted);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Informe seu nome.';
    if (form.phone.replace(/\D/g, '').length < 10)
      next.phone = 'Informe um telefone válido com DDD.';
    if (isDelivery) {
      if (form.cep.replace(/\D/g, '').length < 8) next.cep = 'CEP inválido.';
      if (!form.street.trim()) next.street = 'Informe a rua.';
      if (!form.number.trim()) next.number = 'Informe o número.';
      if (!form.district.trim()) next.district = 'Informe o bairro.';
      if (!form.city.trim()) next.city = 'Informe a cidade.';
      if (!form.state) next.state = 'Selecione o estado.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (isEmpty) return;
    if (!validate()) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const cartItems = lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      variantId: l.variantId,
    }));

    // Vincula o pedido à sessão do visitante (best-effort, não bloqueia).
    // sessionId é o vínculo preciso; visitorId é fallback.
    let sessionId: string | undefined;
    let visitorId: string | undefined;
    try {
      if (typeof window !== 'undefined') {
        sessionId = window.localStorage.getItem('traveltech-session-id') ?? undefined;
        visitorId = window.localStorage.getItem('traveltech-visitor-id') ?? undefined;
      }
    } catch {
      sessionId = undefined;
      visitorId = undefined;
    }

    startTransition(async () => {
      const result = await saveLeadOrderAction(form, cartItems, sessionId, visitorId);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      trackEvent('Lead', {
        content_ids: lines.map((l) => l.sku),
        currency: 'BRL',
        value: subtotal,
        order_id: result.leadOrderId,
        payment_method: form.payment,
        delivery_type: form.deliveryType,
      });
      const link = buildWhatsAppLink(result.whatsappMessage, whatsappNumber);
      window.open(link, '_blank', 'noopener');
    });
  };

  if (!hydrated) {
    return (
      <div className="container-x py-16 text-center text-sm text-ink-500">
        Carregando seu carrinho...
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="container-x py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-ink-100 bg-white p-10 text-center shadow-card">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ink-100 text-ink-500">
            <CartIcon size={28} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-ink-900">Seu carrinho está vazio</h1>
          <p className="mt-1 text-sm text-ink-500">
            Adicione produtos para prosseguir com o checkout pelo WhatsApp.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex">
            Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  const inputProps = (field: keyof CheckoutData) => ({
    id: field,
    name: field,
    'aria-invalid': Boolean(errors[field]),
    className: `field-input ${errors[field] ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}`,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="container-x grid gap-8 py-10 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-ink-900">1. Dados do cliente</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="field-label">Nome completo *</label>
              <input
                {...inputProps('name')}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                autoComplete="name"
                placeholder="Ex.: Maria da Silva"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="field-label">Telefone (WhatsApp) *</label>
              <input
                {...inputProps('phone')}
                value={form.phone}
                onChange={(e) => set('phone', formatPhone(e.target.value))}
                autoComplete="tel"
                inputMode="tel"
                placeholder="(11) 99999-9999"
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="document" className="field-label">CPF ou CNPJ (opcional)</label>
              <input
                {...inputProps('document')}
                value={form.document}
                onChange={(e) => set('document', e.target.value)}
                placeholder="Para emissão de NF"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="field-label">E-mail (opcional)</label>
              <input
                {...inputProps('email')}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
                placeholder="seuemail@dominio.com"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-ink-900">2. Entrega</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(['entrega', 'retirada'] as DeliveryType[]).map((t) => (
              <label
                key={t}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  form.deliveryType === t
                    ? 'border-brand-700 bg-brand-50/40'
                    : 'border-ink-300 hover:border-ink-500'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryType"
                  value={t}
                  checked={form.deliveryType === t}
                  onChange={() => set('deliveryType', t)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-900">
                    {t === 'entrega' ? 'Entrega no endereço' : 'Retirada na loja'}
                  </span>
                  <span className="block text-xs text-ink-500">
                    {t === 'entrega'
                      ? 'Frete confirmado pelo WhatsApp.'
                      : 'Combinaremos data e horário para retirada.'}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {isDelivery && (
            <div className="mt-5 grid gap-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="cep" className="field-label">
                  CEP *
                  {cepLoading && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal text-brand-700">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-700" />
                      buscando...
                    </span>
                  )}
                </label>
                <input
                  {...inputProps('cep')}
                  value={form.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  onBlur={(e) => handleCepChange(e.target.value)}
                  autoComplete="postal-code"
                  inputMode="numeric"
                  placeholder="00000-000"
                />
                {errors.cep && <p className="mt-1 text-xs text-rose-600">{errors.cep}</p>}
                <p className="mt-1 text-xs text-ink-500">
                  Preenchemos o endereço automaticamente para você.
                </p>
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="street" className="field-label">Rua *</label>
                <input
                  {...inputProps('street')}
                  value={form.street}
                  onChange={(e) => set('street', e.target.value)}
                  autoComplete="address-line1"
                />
                {errors.street && <p className="mt-1 text-xs text-rose-600">{errors.street}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="number" className="field-label">Número *</label>
                <input
                  {...inputProps('number')}
                  value={form.number}
                  onChange={(e) => set('number', e.target.value)}
                />
                {errors.number && <p className="mt-1 text-xs text-rose-600">{errors.number}</p>}
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="complement" className="field-label">Complemento</label>
                <input
                  {...inputProps('complement')}
                  value={form.complement}
                  onChange={(e) => set('complement', e.target.value)}
                  placeholder="Apto, bloco, referência..."
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="district" className="field-label">Bairro *</label>
                <input
                  {...inputProps('district')}
                  value={form.district}
                  onChange={(e) => set('district', e.target.value)}
                />
                {errors.district && <p className="mt-1 text-xs text-rose-600">{errors.district}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="city" className="field-label">Cidade *</label>
                <input
                  {...inputProps('city')}
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  autoComplete="address-level2"
                />
                {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
              </div>
              <div>
                <label htmlFor="state" className="field-label">UF *</label>
                <select
                  {...inputProps('state')}
                  value={form.state}
                  onChange={(e) => set('state', e.target.value)}
                  autoComplete="address-level1"
                >
                  <option value="">--</option>
                  {ufs.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-xs text-rose-600">{errors.state}</p>}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="deliveryNote" className="field-label">Observação de entrega</label>
            <input
              {...inputProps('deliveryNote')}
              value={form.deliveryNote}
              onChange={(e) => set('deliveryNote', e.target.value)}
              placeholder="Ex.: deixar com o porteiro"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-ink-900">3. Pagamento</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {paymentOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                  form.payment === opt.value
                    ? 'border-brand-700 bg-brand-50/40'
                    : 'border-ink-300 hover:border-ink-500'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={opt.value}
                  checked={form.payment === opt.value}
                  onChange={() => set('payment', opt.value)}
                />
                <span className="text-sm font-medium text-ink-900">{opt.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-ink-500">
            <ShieldIcon size={14} />
            O pagamento será confirmado pela equipe via WhatsApp. Nenhum valor é cobrado neste site.
          </p>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="text-base font-bold text-ink-900">4. Observações do pedido</h2>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={4}
            placeholder="Algo que devemos saber? Ex.: prazo desejado, melhor horário para contato..."
            className="field-input mt-3 resize-y"
          />
        </div>
      </div>

      <aside className="h-fit space-y-4 lg:sticky lg:top-28">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="text-base font-bold text-ink-900">Resumo do pedido</h2>
          <ul className="mt-3 divide-y divide-ink-100">
            {lines.map((line) => {
              const key = `${line.productId}::${line.variantId ?? ''}`;
              const variantSummary =
                line.variantOptionsMap && Object.keys(line.variantOptionsMap).length > 0
                  ? Object.entries(line.variantOptionsMap)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')
                  : line.variantTitle ?? null;
              return (
                <li key={key} className="flex justify-between gap-3 py-2 text-sm">
                  <span className="flex-1">
                    <span className="block font-medium text-ink-900 line-clamp-2">
                      {line.quantity}x {line.name}
                    </span>
                    {variantSummary && (
                      <span className="block text-xs text-ink-700">{variantSummary}</span>
                    )}
                    <span className="block text-xs text-ink-500">SKU {line.sku}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-ink-900">
                    {formatCurrency(line.price * line.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>

          <dl className="mt-4 space-y-1.5 border-t border-ink-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-semibold text-ink-900">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Frete</dt>
              <dd className="text-ink-700">A confirmar</dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2 text-base">
              <dt className="font-bold text-ink-900">Total estimado</dt>
              <dd className="font-extrabold text-ink-900">{formatCurrency(subtotal)}</dd>
            </div>
          </dl>

          {submitError && (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="btn-accent mt-5 w-full h-12 text-base"
          >
            <WhatsAppIcon size={20} />
            {pending ? 'Enviando...' : 'Finalizar pelo WhatsApp'}
          </button>

          <p className="mt-3 text-xs text-ink-500">
            Ao finalizar, o WhatsApp da nossa equipe abrirá com seu pedido pronto para envio.
            Confirmaremos disponibilidade, frete e pagamento.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs text-emerald-900">
          <p className="font-semibold">Compra segura e humana</p>
          <p className="mt-1">
            Atendimento de {siteConfig.businessHours.toLowerCase()}. Sua compra é
            confirmada por uma pessoa real antes de qualquer pagamento.
          </p>
        </div>
      </aside>
    </form>
  );
};
