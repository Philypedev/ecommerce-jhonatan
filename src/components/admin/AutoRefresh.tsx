'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Discreto: chama router.refresh() periodicamente para reler dados do
 * servidor sem trocar de rota. Usado na visão geral pra manter "Visitantes
 * agora" e a lista de atividade em tempo real atualizadas sem refresh manual.
 */
export const AutoRefresh = ({ intervalMs = 20_000 }: { intervalMs?: number }) => {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);

  return null;
};
