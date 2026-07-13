'use client';

import { useEffect } from 'react';
import { trackEvent, type MetaEvent } from '@/lib/analytics';

/**
 * Pequeno componente que dispara um evento de analytics quando montado.
 * Útil em páginas server-rendered (produto, busca, checkout) onde não
 * temos onClick natural.
 */
export const EventTracker = ({
  event,
  params,
}: {
  event: MetaEvent;
  params?: Record<string, unknown>;
}) => {
  useEffect(() => {
    trackEvent(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
};
