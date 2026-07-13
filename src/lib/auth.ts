import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const SESSION_COOKIE = 'traveltech_admin';
const SESSION_DURATION = 60 * 60 * 8; // 8 horas em segundos

const WEAK_DEFAULTS = [
  'dev-secret-troque-em-producao-com-32-chars-ou-mais',
  'troque-este-valor-por-um-secret-forte-de-32+chars',
  'change-me',
  'secret',
  'dev-secret',
];

const getSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET ausente ou muito curto (mínimo 16 caracteres). Defina no .env.');
  }
  // Em produção, exige secret forte (32+ chars) e recusa defaults conhecidos.
  if (process.env.NODE_ENV === 'production') {
    if (secret.length < 32) {
      throw new Error(
        'AUTH_SECRET muito fraco para produção: use ao menos 32 caracteres aleatórios.',
      );
    }
    if (WEAK_DEFAULTS.includes(secret)) {
      throw new Error(
        'AUTH_SECRET ainda está com valor padrão. Gere um secret forte antes de subir para produção.',
      );
    }
  }
  return new TextEncoder().encode(secret);
};

export type SessionPayload = {
  uid: string;
  email: string;
  role: string;
};

export const signSession = async (payload: SessionPayload): Promise<string> => {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());
};

export const verifySession = async (token: string): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') return null;
    return {
      uid: payload.uid,
      email: payload.email,
      role: typeof payload.role === 'string' ? payload.role : 'ADMIN',
    };
  } catch {
    return null;
  }
};

/** Lê e valida a sessão a partir dos cookies (server components / actions). */
export const getSession = async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
};

/** Garante sessão. Se não houver, redireciona para /admin/login. */
export const requireAdmin = async (): Promise<SessionPayload> => {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return session;
};

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DURATION,
};
