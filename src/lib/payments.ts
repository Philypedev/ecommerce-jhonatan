export const ALL_PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'cartao-credito', label: 'Cartão de Crédito' },
  { value: 'cartao-debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto bancário' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'a-combinar', label: 'A combinar pelo WhatsApp' },
] as const;

export type PaymentMethodValue = (typeof ALL_PAYMENT_METHODS)[number]['value'];

const DEFAULT_ACTIVE: PaymentMethodValue[] = ALL_PAYMENT_METHODS.map((m) => m.value);

export const parseActivePaymentMethods = (json: string | undefined | null): PaymentMethodValue[] => {
  if (!json) return DEFAULT_ACTIVE;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return DEFAULT_ACTIVE;
    const valid = parsed.filter(
      (v): v is PaymentMethodValue =>
        typeof v === 'string' &&
        ALL_PAYMENT_METHODS.some((m) => m.value === v),
    );
    return valid.length > 0 ? valid : DEFAULT_ACTIVE;
  } catch {
    return DEFAULT_ACTIVE;
  }
};

export const stringifyActivePaymentMethods = (active: PaymentMethodValue[]): string =>
  JSON.stringify(
    ALL_PAYMENT_METHODS.map((m) => m.value).filter((v) => active.includes(v)),
  );
