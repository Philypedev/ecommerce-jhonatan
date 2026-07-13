'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCart, cartItemsCount } from '@/store/cart';

export const VISITOR_ID_KEY = 'traveltech-visitor-id';
export const SESSION_ID_KEY = 'traveltech-session-id';
export const SESSION_STARTED_AT_KEY = 'traveltech-session-started-at';
export const LAST_ACTIVITY_AT_KEY = 'traveltech-last-activity-at';

const HEARTBEAT_INTERVAL_MS = 30_000;
// Janela de inatividade que encerra a sessão atual e abre uma nova na
// próxima interação (padrão de mercado, mesmo critério do GA4).
const SESSION_IDLE_MS = 30 * 60 * 1000;

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const isSameDay = (a: number, b: number): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const detectDevice = (): 'desktop' | 'mobile' | 'tablet' => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
};

const safeGet = (key: string): string | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {
    /* silent — modo privado em alguns browsers bloqueia localStorage */
  }
};

const getOrCreateVisitorId = (): string => {
  const existing = safeGet(VISITOR_ID_KEY);
  if (existing) return existing;
  const fresh = generateId();
  safeSet(VISITOR_ID_KEY, fresh);
  return fresh;
};

/**
 * Garante um sessionId válido. Cria um novo quando:
 *  - não existe sessionId;
 *  - última atividade local foi há mais de 30 minutos;
 *  - mudou o dia desde o início da sessão.
 */
const ensureSessionId = (): string => {
  const now = Date.now();
  const existing = safeGet(SESSION_ID_KEY);
  const startedAtRaw = safeGet(SESSION_STARTED_AT_KEY);
  const lastActivityRaw = safeGet(LAST_ACTIVITY_AT_KEY);

  const startedAt = startedAtRaw ? Number.parseInt(startedAtRaw, 10) : 0;
  const lastActivity = lastActivityRaw ? Number.parseInt(lastActivityRaw, 10) : 0;

  const idleTooLong =
    Number.isFinite(lastActivity) &&
    lastActivity > 0 &&
    now - lastActivity > SESSION_IDLE_MS;
  const dayChanged =
    Number.isFinite(startedAt) && startedAt > 0 && !isSameDay(startedAt, now);

  let sessionId = existing;
  if (!sessionId || idleTooLong || dayChanged) {
    sessionId = generateId();
    safeSet(SESSION_ID_KEY, sessionId);
    safeSet(SESSION_STARTED_AT_KEY, String(now));
  }
  safeSet(LAST_ACTIVITY_AT_KEY, String(now));
  return sessionId;
};

const sendHeartbeat = (payload: {
  visitorId: string;
  sessionId: string;
  device: string;
  currentPath: string;
  cartItems: number;
}) => {
  try {
    void fetch('/api/visitor/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* nunca quebra a UX por causa de tracking */
    });
  } catch {
    /* silent */
  }
};

/**
 * Sinal de saída — usa sendBeacon (sobrevive ao unload) com fallback pra
 * fetch keepalive. Disparado em pagehide e beforeunload.
 */
const sendLeave = (visitorId: string, sessionId: string) => {
  try {
    const body = JSON.stringify({ visitorId, sessionId });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      // sendBeacon precisa de Blob com Content-Type, senão alguns browsers
      // tratam como application/octet-stream e o endpoint quebra ao parsear.
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/visitor/leave', blob);
      return;
    }
    void fetch('/api/visitor/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* silent */
    });
  } catch {
    /* silent */
  }
};

/**
 * Heartbeat discreto + sinal de saída.
 *
 * Online:  POST /api/visitor/heartbeat a cada 30s (renova isActive=true).
 * Offline: POST /api/visitor/leave em pagehide/beforeunload via sendBeacon.
 *
 * NÃO marca offline em visibilitychange (troca de aba, abrir DevTools) —
 * isso geraria falsos negativos. A janela curta de 90s no backend já cobre
 * o caso de o pagehide falhar.
 *
 * Trocar de rota dentro do Next.js (SPA navigation) NÃO dispara pagehide,
 * então não há risco de marcar offline indevidamente.
 */
export const VisitorHeartbeat = () => {
  const pathname = usePathname() ?? '/';
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const cartItems = hydrated ? cartItemsCount(lines) : 0;

  // Safety: jamais conta navegação dentro do painel admin como sessão de
  // visitante. O componente só é renderizado pelo layout público, mas se
  // alguém um dia colocar no layout raiz, esse guard previne falsos positivos.
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAdminRoute) return;
    const visitorId = getOrCreateVisitorId();
    if (!visitorId) return;
    const device = detectDevice();

    let currentSessionId = ensureSessionId();

    const tick = () => {
      currentSessionId = ensureSessionId();
      if (!currentSessionId) return;
      sendHeartbeat({
        visitorId,
        sessionId: currentSessionId,
        device,
        currentPath: pathname,
        cartItems,
      });
    };

    const onLeave = () => {
      if (!currentSessionId) return;
      sendLeave(visitorId, currentSessionId);
    };

    tick();
    const intervalId = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);

    // pagehide é o evento canônico de saída (cobre fechar aba, ir pra outra
    // origem, mobile background). beforeunload é backup pros browsers que
    // ainda não emitem pagehide de forma confiável em desktop.
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [pathname, cartItems, isAdminRoute]);

  return null;
};
