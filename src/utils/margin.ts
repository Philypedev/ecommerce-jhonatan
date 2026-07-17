/**
 * Cálculo de lucro/margem para o painel admin. Nunca é exibido no
 * ecommerce público — os consumidores desta função vivem em
 * /admin/produtos/*.
 *
 * Regras (espelham o briefing):
 *  - Preço ou custo vazio/zero → margin = null (UI mostra "—")
 *  - Custo == preço            → profit = 0,   marginPct = 0
 *  - Custo  > preço            → profit e marginPct negativos + status 'danger'
 *  - Custo  < preço            → profit e marginPct positivos + status 'ok' ou 'low'
 *
 * `status` classifica o resultado pra UI decidir a cor sem re-decidir a
 * regra por página:
 *   'none'   → sem dados suficientes
 *   'danger' → preço abaixo do custo (vermelho)
 *   'low'    → margem positiva mas < LOW_MARGIN_THRESHOLD_PCT (amarelo)
 *   'ok'     → margem saudável (verde/neutro)
 */
export const LOW_MARGIN_THRESHOLD_PCT = 10;

export type MarginStatus = 'none' | 'danger' | 'low' | 'ok';

export type MarginResult = {
  profit: number | null;
  marginPct: number | null;
  status: MarginStatus;
};

export const computeMargin = (
  price: number | null | undefined,
  cost: number | null | undefined,
): MarginResult => {
  const p = typeof price === 'number' && Number.isFinite(price) ? price : 0;
  const c = typeof cost === 'number' && Number.isFinite(cost) ? cost : 0;

  if (p <= 0 || c <= 0) {
    return { profit: null, marginPct: null, status: 'none' };
  }

  const profit = p - c;
  const marginPct = (profit / p) * 100;

  let status: MarginStatus;
  if (profit < 0) status = 'danger';
  else if (marginPct < LOW_MARGIN_THRESHOLD_PCT) status = 'low';
  else status = 'ok';

  return { profit, marginPct, status };
};
