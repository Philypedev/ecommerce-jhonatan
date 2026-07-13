import { NextResponse, type NextRequest } from 'next/server';
import { upsertSession } from '@/lib/db/visitors';

export const runtime = 'nodejs';

/**
 * Endpoint chamado periodicamente pelo VisitorHeartbeat client.
 *
 * Sanitiza tudo — nada de IP, user-agent completo, e-mail ou qualquer outro
 * dado pessoal. Só dispositivo (classe), pathname (sem query string) e
 * contagem de carrinho.
 *
 * Aceita pares (visitorId, sessionId). UPSERT é por sessionId.
 */
export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const b = body as {
    visitorId?: unknown;
    sessionId?: unknown;
    device?: unknown;
    currentPath?: unknown;
    cartItems?: unknown;
  };

  const visitorId = typeof b.visitorId === 'string' ? b.visitorId.trim() : '';
  if (!visitorId || visitorId.length < 6 || visitorId.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : '';
  if (!sessionId || sessionId.length < 6 || sessionId.length > 64) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const device =
    typeof b.device === 'string' && ['desktop', 'mobile', 'tablet'].includes(b.device)
      ? b.device
      : null;
  const currentPath =
    typeof b.currentPath === 'string'
      ? // Tira query string e limita o tamanho.
        b.currentPath.split('?')[0].slice(0, 200)
      : null;
  const cartItems =
    typeof b.cartItems === 'number' && Number.isFinite(b.cartItems)
      ? Math.max(0, Math.min(999, Math.trunc(b.cartItems)))
      : null;

  try {
    await upsertSession({ visitorId, sessionId, device, currentPath, cartItems });
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
