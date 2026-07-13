/**
 * Helper unificado de tracking para Meta Pixel + Google Analytics 4.
 *
 * Usamos os nomes de evento do Meta Pixel como API pública (ViewContent,
 * AddToCart, etc.) e mapeamos para os equivalentes do GA4. Os parâmetros
 * são repassados como `params` em ambos.
 *
 * É seguro chamar trackEvent() em qualquer contexto — se o pixel/ga não
 * estiverem carregados (env vazia em dev), o no-op silencia.
 */

export type MetaEvent =
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Contact'
  | 'Lead'
  | 'Search';

const META_TO_GA: Record<MetaEvent, string> = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Contact: 'contact',
  Lead: 'generate_lead',
  Search: 'search',
};

type AnalyticsWindow = {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

export const trackEvent = (
  event: MetaEvent,
  params: Record<string, unknown> = {},
): void => {
  if (typeof window === 'undefined') return;
  const w = window as unknown as AnalyticsWindow;
  try {
    w.fbq?.('track', event, params);
    w.gtag?.('event', META_TO_GA[event], params);
  } catch {
    /* silencioso — analytics nunca deve quebrar a loja */
  }
};
