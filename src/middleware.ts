import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

// Cobre TODAS as rotas do painel admin + qualquer endpoint futuro sob
// /api/admin/*. Cada API já valida sessão por conta própria, mas o
// middleware serve de defesa em profundidade: rota nova esquecida aqui
// já cai barrada.
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login continua público
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    // Rotas de API sob /api/admin retornam 401 JSON. Redirect pra HTML só
    // faz sentido em navegação (páginas do admin).
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { error: 'Sessão administrativa necessária.' },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
