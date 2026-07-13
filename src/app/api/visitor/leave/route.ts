import { NextResponse, type NextRequest } from 'next/server';
import { markSessionLeft, markVisitorLeft } from '@/lib/db/visitors';

export const runtime = 'nodejs';

/**
 * Endpoint chamado quando o navegador detecta saída real (pagehide).
 * Costuma chegar via `navigator.sendBeacon`, então o body pode vir como
 * `application/json` ou `text/plain` — tratamos as duas formas.
 *
 * Marca a sessão como offline (isActive=false, leftAt=now). Best-effort:
 * nunca derruba a navegação se algo falhar.
 */
export async function POST(req: NextRequest) {
  let raw: string | null = null;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!raw) return NextResponse.json({ ok: false }, { status: 400 });

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const b = body as { visitorId?: unknown; sessionId?: unknown };
  const visitorId = typeof b.visitorId === 'string' ? b.visitorId.trim() : '';
  const sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : '';

  const validSession = sessionId.length >= 6 && sessionId.length <= 64;
  const validVisitor = visitorId.length >= 6 && visitorId.length <= 64;

  if (!validSession && !validVisitor) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    let marked = false;
    if (validSession) {
      marked = await markSessionLeft(sessionId);
    }
    // Fallback: se a sessão não foi encontrada (ou veio só visitorId),
    // marca todas as sessões ativas daquele visitor.
    if (!marked && validVisitor) {
      await markVisitorLeft(visitorId);
    }
    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
