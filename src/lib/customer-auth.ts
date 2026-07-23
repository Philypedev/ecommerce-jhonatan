/**
 * Autenticação de CLIENTE do ecommerce público.
 *
 * COMPLETAMENTE separada de src/lib/auth.ts (admin):
 *   - Cookie diferente: `traveltech_customer` (admin usa `traveltech_admin`)
 *   - Payload JWT com `type: 'customer'`. Mesmo que alguém tente reaproveitar
 *     um token de admin no cookie do cliente (ou vice-versa), a verificação
 *     rejeita porque `type` não bate.
 *   - Duração maior (30 dias) — clientes esperam continuar logados; admins
 *     têm sessão curta (8h) por segurança operacional.
 *
 * Zero acoplamento com o admin: nenhuma função aqui é chamada pelo middleware
 * de /admin ou pelas actions de /admin.
 */
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const CUSTOMER_SESSION_COOKIE = 'traveltech_customer';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 dias
const TOKEN_TYPE = 'customer' as const;

const WEAK_DEFAULTS = [
  'dev-secret-troque-em-producao-com-32-chars-ou-mais',
  'troque-este-valor-por-um-secret-forte-de-32+chars',
  'change-me',
  'secret',
  'dev-secret',
];

const getSecret = (): Uint8Array => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET ausente ou muito curto (mínimo 16 caracteres). Defina no .env.',
    );
  }
  if (process.env.NODE_ENV === 'production') {
    if (secret.length < 32) {
      throw new Error('AUTH_SECRET muito fraco para produção: use ao menos 32 caracteres.');
    }
    if (WEAK_DEFAULTS.includes(secret)) {
      throw new Error('AUTH_SECRET ainda está com valor padrão.');
    }
  }
  return new TextEncoder().encode(secret);
};

export type CustomerSessionPayload = {
  cid: string;   // customer id — distinto do `uid` do admin
  email: string;
  name: string;
};

export const signCustomerSession = async (
  payload: CustomerSessionPayload,
): Promise<string> => {
  return new SignJWT({ ...payload, type: TOKEN_TYPE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
};

export const verifyCustomerSession = async (
  token: string,
): Promise<CustomerSessionPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Rejeita explicitamente qualquer token que não seja de cliente — impede
    // um token de admin de valer aqui, mesmo se for injetado no cookie.
    if (payload.type !== TOKEN_TYPE) return null;
    if (typeof payload.cid !== 'string' || typeof payload.email !== 'string') return null;
    return {
      cid: payload.cid,
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  } catch {
    return null;
  }
};

/** Lê e valida a sessão do cliente. Devolve null se não houver. */
export const getCustomerSession = async (): Promise<CustomerSessionPayload | null> => {
  const store = await cookies();
  const token = store.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyCustomerSession(token);
};

/**
 * Garante sessão de cliente. Se não houver, redireciona para /conta/entrar
 * com `redirect=<pathname>` para retomar após login.
 */
export const requireCustomer = async (
  redirectPath = '/conta',
): Promise<CustomerSessionPayload> => {
  const session = await getCustomerSession();
  if (!session) {
    const target = `/conta/entrar?redirect=${encodeURIComponent(redirectPath)}`;
    redirect(target);
  }
  return session;
};

export const customerSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DURATION_SECONDS,
};

/** Normaliza email pra o esquema único (lowercase + trim). Aplicar SEMPRE. */
export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

/**
 * Sanitiza um path recebido no query `?redirect=…` ou no hidden `redirect`
 * dos formulários de login/signup. Sempre devolve um path SEGURO dentro do
 * escopo `/conta`. Motivação:
 *   - `startsWith('/conta')` pega também `/contato`, `/conta.evil`,
 *     `/contatoss` — o cliente cairia em página errada ou em 404.
 *   - Deve rejeitar tentativa de path-traversal (`/conta/../admin`) e
 *     protocol-relative URLs (`//evil.com/path`) que browsers interpretam
 *     como host externo.
 *
 * Regra:
 *   ok  → `/conta` ou `/conta/<algo-sem-..>`
 *   nok → qualquer outra coisa vira `/conta`.
 */
export const safeAccountRedirect = (
  raw: string | null | undefined,
  fallback: string = '/conta',
): string => {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (trimmed === '') return fallback;
  // Rejeita protocol-relative (//host), URL absoluta (http://…) e path
  // que não começa com barra.
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  // Barra + segmento exato "conta" (nada de "contato" nem "conta.evil").
  if (trimmed !== '/conta' && !trimmed.startsWith('/conta/')) return fallback;
  // Path-traversal — recusa qualquer ".." em qualquer segmento.
  if (trimmed.split('/').some((seg) => seg === '..')) return fallback;
  return trimmed;
};
