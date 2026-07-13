const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

export const formatCurrency = (value: number): string => BRL.format(value);

export const formatInstallments = (price: number, installments: number): string => {
  if (installments <= 1) return formatCurrency(price);
  const installmentValue = price / installments;
  return `${installments}x de ${formatCurrency(installmentValue)} sem juros`;
};
