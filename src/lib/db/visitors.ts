import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

/**
 * Helpers para o tracking de VisitorSession.
 *
 * Modelagem:
 *  - visitorId → identifica o navegador (cookie/localStorage persistente).
 *  - sessionId → identifica uma visita específica. Rotaciona a cada 30 min
 *    de inatividade ou na virada do dia. UPSERT é por sessionId.
 *  - isActive/leftAt → estado online/offline. Heartbeat liga, pagehide
 *    (sendBeacon) desliga. Combinado com janela curta de lastSeenAt, mantém
 *    "Visitantes agora" próximo do tempo real.
 *
 * Como o model foi alterado via `prisma db push --skip-generate`, o Prisma
 * Client em runtime ainda não conhece `prisma.visitorSession`. Por isso
 * usamos `$executeRaw` e `$queryRaw` paramétricos (Prisma sanitiza os
 * placeholders).
 */

export type ActiveVisitor = {
  sessionId: string;
  visitorId: string;
  device: string | null;
  currentPath: string | null;
  cartItems: number | null;
  lastSeenAt: Date;
};

// Janela curta: o heartbeat roda a cada 30s, então 90s dá margem para 2 ticks
// perdidos antes de considerar "fantasma". Vai ao banco em segundos pra usar
// CURRENT_TIMESTAMP comparável.
const ACTIVE_WINDOW_SECONDS = 90;
export const ACTIVE_WINDOW_MS = ACTIVE_WINDOW_SECONDS * 1000;

const startOfTodayLocal = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Cria a sessão se não existir (chave: sessionId); senão atualiza
 * lastSeenAt + contexto e re-liga isActive. firstSeenAt nunca é reescrito.
 */
export const upsertSession = async (params: {
  sessionId: string;
  visitorId: string;
  device: string | null;
  currentPath: string | null;
  cartItems: number | null;
}): Promise<void> => {
  const { sessionId, visitorId, device, currentPath, cartItems } = params;

  const updated = await prisma.$executeRaw`
    UPDATE "VisitorSession"
    SET "lastSeenAt" = CURRENT_TIMESTAMP,
        "isActive" = 1,
        "leftAt" = NULL,
        "visitorId" = ${visitorId},
        "device" = COALESCE(${device}, "device"),
        "currentPath" = COALESCE(${currentPath}, "currentPath"),
        "cartItems" = COALESCE(${cartItems}, "cartItems")
    WHERE "sessionId" = ${sessionId}
  `;

  if (updated === 0) {
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "VisitorSession"
        ("id", "sessionId", "visitorId", "firstSeenAt", "lastSeenAt", "isActive", "device", "currentPath", "cartItems")
      VALUES
        (${id}, ${sessionId}, ${visitorId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, ${device}, ${currentPath}, ${cartItems})
    `;
  }
};

/**
 * Marca a sessão como offline (saída detectada via pagehide).
 * Retorna true se algo foi atualizado.
 */
export const markSessionLeft = async (sessionId: string): Promise<boolean> => {
  const updated = await prisma.$executeRaw`
    UPDATE "VisitorSession"
    SET "isActive" = 0,
        "leftAt" = CURRENT_TIMESTAMP,
        "lastSeenAt" = CURRENT_TIMESTAMP
    WHERE "sessionId" = ${sessionId}
  `;
  return updated > 0;
};

/**
 * Fallback de saída quando o cliente perdeu o sessionId mas mandou visitorId.
 * Marca todas as sessões ativas daquele visitor como offline.
 */
export const markVisitorLeft = async (visitorId: string): Promise<boolean> => {
  const updated = await prisma.$executeRaw`
    UPDATE "VisitorSession"
    SET "isActive" = 0,
        "leftAt" = CURRENT_TIMESTAMP,
        "lastSeenAt" = CURRENT_TIMESTAMP
    WHERE "visitorId" = ${visitorId} AND "isActive" = 1
  `;
  return updated > 0;
};

/**
 * Marca a sessão (sessionId) como convertida. Idempotente.
 */
export const markSessionConverted = async (
  sessionId: string,
  leadOrderId: string,
): Promise<boolean> => {
  const updated = await prisma.$executeRaw`
    UPDATE "VisitorSession"
    SET "convertedAt" = CURRENT_TIMESTAMP,
        "leadOrderId" = ${leadOrderId}
    WHERE "sessionId" = ${sessionId} AND "convertedAt" IS NULL
  `;
  return updated > 0;
};

/** Fallback: marca a sessão aberta mais recente do visitor como convertida. */
export const markLatestSessionByVisitorConverted = async (
  visitorId: string,
  leadOrderId: string,
): Promise<boolean> => {
  const updated = await prisma.$executeRaw`
    UPDATE "VisitorSession"
    SET "convertedAt" = CURRENT_TIMESTAMP,
        "leadOrderId" = ${leadOrderId}
    WHERE "id" = (
      SELECT "id" FROM "VisitorSession"
      WHERE "visitorId" = ${visitorId} AND "convertedAt" IS NULL
      ORDER BY "lastSeenAt" DESC
      LIMIT 1
    )
  `;
  return updated > 0;
};

const countSingle = async (sql: ReturnType<typeof prisma.$queryRaw>): Promise<number> => {
  const rows = (await sql) as Array<{ count: bigint | number }>;
  const c = rows[0]?.count ?? 0;
  return typeof c === 'bigint' ? Number(c) : Number(c);
};

/**
 * Visitantes "online agora": DISTINCT visitorId com pelo menos uma sessão
 * ATIVA (isActive=true) e lastSeenAt nos últimos 90s.
 *
 * - Janela curta (90s) elimina fantasmas mesmo quando pagehide falha
 *   (internet caiu, navegador travou).
 * - DISTINCT visitorId evita contar 2x quando o mesmo navegador tem 2 abas.
 */
export const countActiveVisitors = async (): Promise<number> => {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  return countSingle(
    prisma.$queryRaw`
      SELECT COUNT(DISTINCT "visitorId") as count
      FROM "VisitorSession"
      WHERE "isActive" = 1 AND "lastSeenAt" >= ${since}
    `,
  );
};

/** Sessões criadas hoje (firstSeenAt >= 00:00 local). */
export const countSessionsToday = async (): Promise<number> => {
  const start = startOfTodayLocal();
  return countSingle(
    prisma.$queryRaw`SELECT COUNT(*) as count FROM "VisitorSession" WHERE "firstSeenAt" >= ${start}`,
  );
};

/** Sessões criadas hoje que viraram pedido (convertedAt not null). */
export const countConvertedSessionsToday = async (): Promise<number> => {
  const start = startOfTodayLocal();
  return countSingle(
    prisma.$queryRaw`SELECT COUNT(*) as count FROM "VisitorSession" WHERE "firstSeenAt" >= ${start} AND "convertedAt" IS NOT NULL`,
  );
};

/**
 * Lista de visitantes online agora — uma linha por visitorId, com os dados
 * da sessão mais recente daquele visitor. Mesmo critério da contagem:
 * isActive=true e lastSeenAt nos últimos 90s.
 */
export const getActiveVisitors = async (limit = 12): Promise<ActiveVisitor[]> => {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows = await prisma.$queryRaw<
    Array<{
      sessionId: string;
      visitorId: string;
      device: string | null;
      currentPath: string | null;
      cartItems: number | null;
      lastSeenAt: Date | string;
    }>
  >`
    SELECT vs."sessionId", vs."visitorId", vs."device", vs."currentPath", vs."cartItems", vs."lastSeenAt"
    FROM "VisitorSession" vs
    INNER JOIN (
      SELECT "visitorId", MAX("lastSeenAt") as maxSeen
      FROM "VisitorSession"
      WHERE "isActive" = 1 AND "lastSeenAt" >= ${since}
      GROUP BY "visitorId"
    ) latest
      ON vs."visitorId" = latest."visitorId"
     AND vs."lastSeenAt" = latest.maxSeen
    WHERE vs."isActive" = 1
    ORDER BY vs."lastSeenAt" DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    sessionId: r.sessionId,
    visitorId: r.visitorId,
    device: r.device,
    currentPath: r.currentPath,
    cartItems: r.cartItems,
    lastSeenAt: typeof r.lastSeenAt === 'string' ? new Date(r.lastSeenAt) : r.lastSeenAt,
  }));
};
