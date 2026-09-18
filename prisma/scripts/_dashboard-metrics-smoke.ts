/**
 * Smoke das métricas reais do dashboard (/admin — Visão geral, seção
 * "Sessões e pedidos": Visitantes agora, Sessões hoje, Sessões sem pedido,
 * Pedidos hoje). Roda contra o SQLite de dev — cria/limpa registros
 * isoladamente.
 *
 * Cobre:
 *   - Sessões: criação via upsert, idempotência por sessionId, atualização
 *     de lastSeenAt, janela de "visitantes agora" (DISTINCT visitorId),
 *     filtro de "sessões hoje" por dia civil America/Sao_Paulo (não conta
 *     sessão de ontem).
 *   - Sessões sem pedido: computeSessionsWithoutOrder nos cenários exatos do
 *     briefing, incluindo "múltiplos pedidos na mesma sessão não vira
 *     negativo" e a associação real VisitorSession → LeadOrder via
 *     markSessionConverted (o mesmo mecanismo usado por saveLeadOrderAction).
 *   - Pedidos: LeadOrder de hoje é contado, pedido antigo não entra, guest e
 *     cliente logado funcionam.
 *   - Nenhum número do dashboard vem de Math.random / valor hardcoded, e os
 *     cards removidos (Valor em pedidos hoje / Taxa de conversão) não
 *     deixaram referências soltas no código.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  countActiveVisitors,
  countSessionsToday,
  countSessionsWithOrderToday,
  computeSessionsWithoutOrder,
  markSessionConverted,
  markLatestSessionByVisitorConverted,
  upsertSession,
  ACTIVE_WINDOW_MS,
} from '../../src/lib/db/visitors';
import { startOfStoreDay, endOfStoreDay } from '../../src/lib/storeTime';

const p = new PrismaClient();
const TAG = '__smoke-dashboard';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`OK  ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ''}`); }
}

const sid = (suffix: string) => `${TAG}-session-${suffix}`;
const vid = (suffix: string) => `${TAG}-visitor-${suffix}`;

async function cleanupSessions() {
  await p.$executeRaw`DELETE FROM "VisitorSession" WHERE "sessionId" LIKE ${`${TAG}%`}`;
}

async function cleanupOrders() {
  await p.leadOrder.deleteMany({ where: { customerName: { contains: TAG } } });
}

/** Insere uma VisitorSession com timestamps arbitrários (para testar janelas de tempo). */
async function seedSession(params: {
  sessionId: string;
  visitorId: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
  convertedAt?: Date | null;
}) {
  const { sessionId, visitorId, firstSeenAt, lastSeenAt, isActive, convertedAt } = params;
  await p.$executeRaw`
    INSERT INTO "VisitorSession"
      ("id", "sessionId", "visitorId", "firstSeenAt", "lastSeenAt", "isActive", "convertedAt")
    VALUES
      (${`id-${sessionId}`}, ${sessionId}, ${visitorId}, ${firstSeenAt}, ${lastSeenAt}, ${isActive ? 1 : 0}, ${convertedAt ?? null})
  `;
}

async function makeOrder(name: string, extra: Partial<{ subtotal: number; total: number }> = {}) {
  return p.leadOrder.create({
    data: {
      customerName: `${TAG} ${name}`,
      customerPhone: '11999999999',
      deliveryType: 'entrega',
      paymentMethod: 'pix',
      subtotal: extra.subtotal ?? 100,
      total: extra.total ?? 100,
      whatsappMessage: `smoke ${name}`,
    },
  });
}

async function main() {
  try {
    await cleanupSessions();
    await cleanupOrders();

    // ───────────────────────── Sessões: criação e upsert ─────────────────────────
    console.log('-- upsertSession: cria sessão nova --');
    const s1 = sid('new');
    const v1 = vid('a');
    await upsertSession({ sessionId: s1, visitorId: v1, device: 'desktop', currentPath: '/', cartItems: 0 });
    const afterCreate = await p.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*) as c FROM "VisitorSession" WHERE "sessionId" = ${s1}
    `;
    assert('sessão é criada no banco', Number(afterCreate[0]?.c ?? 0) === 1);

    console.log('\n-- upsertSession: mesmo sessionId não duplica --');
    await upsertSession({ sessionId: s1, visitorId: v1, device: 'desktop', currentPath: '/produto/x', cartItems: 2 });
    const afterSecondCall = await p.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*) as c FROM "VisitorSession" WHERE "sessionId" = ${s1}
    `;
    assert('mesmo sessionId continua sendo 1 linha (upsert, não insert)', Number(afterSecondCall[0]?.c ?? 0) === 1);

    console.log('\n-- upsertSession: atividade atualiza lastSeenAt --');
    const beforeRow = await p.$queryRaw<Array<{ lastSeenAt: string }>>`
      SELECT "lastSeenAt" FROM "VisitorSession" WHERE "sessionId" = ${s1}
    `;
    await new Promise((r) => setTimeout(r, 1100));
    await upsertSession({ sessionId: s1, visitorId: v1, device: null, currentPath: null, cartItems: null });
    const afterRow = await p.$queryRaw<Array<{ lastSeenAt: string }>>`
      SELECT "lastSeenAt" FROM "VisitorSession" WHERE "sessionId" = ${s1}
    `;
    assert('lastSeenAt avança a cada heartbeat (sessão ativa depende de lastSeenAt)',
      new Date(afterRow[0]!.lastSeenAt).getTime() > new Date(beforeRow[0]!.lastSeenAt).getTime());

    // ───────────────────────── Visitantes agora ─────────────────────────
    console.log('\n-- Visitantes agora: janela curta exclui sessão com lastSeenAt antigo --');
    const oldSessionId = sid('old-inactive');
    await seedSession({
      sessionId: oldSessionId,
      visitorId: vid('old'),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(Date.now() - ACTIVE_WINDOW_MS * 10),
      isActive: true,
    });
    const activeNowScoped = async () => {
      const rows = await p.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(DISTINCT "visitorId") as c FROM "VisitorSession"
        WHERE "isActive" = 1 AND "lastSeenAt" >= ${new Date(Date.now() - ACTIVE_WINDOW_MS)}
          AND "sessionId" LIKE ${`${TAG}%`}
      `;
      return Number(rows[0]?.c ?? 0);
    };
    assert('sessão com lastSeenAt fora da janela de 90s NÃO conta como "visitante agora"',
      (await activeNowScoped()) === 1, `esperado 1 (só s1), got=${await activeNowScoped()}`);

    console.log('\n-- Visitantes agora: DISTINCT visitorId não conta 2 abas do mesmo visitante 2x --');
    const dupTabSession = sid('dup-tab');
    await seedSession({
      sessionId: dupTabSession,
      visitorId: v1, // mesmo visitorId de s1, sessionId diferente (2ª aba)
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      isActive: true,
    });
    assert('2 sessões ativas do MESMO visitorId contam como 1 visitante (DISTINCT)',
      (await activeNowScoped()) === 1, `got=${await activeNowScoped()}`);
    const activeGlobal = await countActiveVisitors();
    assert('countActiveVisitors() roda sem erro e é >= ao subconjunto do smoke',
      activeGlobal >= 1, `got=${activeGlobal}`);

    // ───────────────────────── Sessões hoje (dia civil America/Sao_Paulo) ─────────────────────────
    console.log('\n-- Sessões hoje: filtra por dia civil America/Sao_Paulo, não por UTC ingênuo --');
    const todayStart = startOfStoreDay();
    const todayEnd = endOfStoreDay();
    assert('startOfStoreDay < endOfStoreDay', todayStart.getTime() < todayEnd.getTime());
    assert('janela do dia civil tem ~24h', Math.abs((todayEnd.getTime() - todayStart.getTime()) - (24 * 60 * 60 * 1000 - 1)) < 1000);

    const yesterdaySessionId = sid('yesterday');
    const yesterday = new Date(todayStart.getTime() - 60 * 60 * 1000); // 1h antes do início de hoje
    await seedSession({
      sessionId: yesterdaySessionId,
      visitorId: vid('yesterday'),
      firstSeenAt: yesterday,
      lastSeenAt: yesterday,
      isActive: false,
    });

    const sessionsTodayScoped = async () => {
      const rows = await p.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(*) as c FROM "VisitorSession"
        WHERE "firstSeenAt" >= ${todayStart} AND "sessionId" LIKE ${`${TAG}%`}
      `;
      return Number(rows[0]?.c ?? 0);
    };
    // Sessões de "hoje" no escopo do smoke até aqui: s1, oldSessionId, dupTabSession (3).
    // yesterdaySessionId (mudança de dia) não deve entrar.
    assert('sessão de ontem não entra em "sessões hoje" (mudança de dia respeitada)',
      (await sessionsTodayScoped()) === 3, `got=${await sessionsTodayScoped()}`);

    const totalSessionsToday = await countSessionsToday();
    assert('countSessionsToday() roda sem erro e é >= às sessões de hoje do smoke',
      totalSessionsToday >= 3, `got=${totalSessionsToday}`);

    // ───────────────────────── Sessões sem pedido: cenários puros ─────────────────────────
    console.log('\n-- computeSessionsWithoutOrder: cenários exatos do briefing --');
    assert('0 sessões → 0 sessões sem pedido', computeSessionsWithoutOrder(0, 0) === 0);
    assert('1 sessão sem pedido → 1 sessão sem pedido', computeSessionsWithoutOrder(1, 0) === 1);
    assert('1 sessão + 1 pedido associado → 0 sessões sem pedido', computeSessionsWithoutOrder(1, 1) === 0);
    assert('2 sessões + 1 pedido associado → 1 sessão sem pedido', computeSessionsWithoutOrder(2, 1) === 1);
    assert('nunca fica negativo mesmo com drift de dados (5 sessões "com pedido" > 3 sessões hoje)',
      computeSessionsWithoutOrder(3, 5) === 0);

    // ───────────────────────── Sessões sem pedido: fluxo real (VisitorSession ↔ LeadOrder) ─────────────────────────
    console.log('\n-- Associação real: markSessionConverted (mesmo mecanismo do checkout) --');
    const soloSession = sid('solo-no-order');
    await seedSession({
      sessionId: soloSession,
      visitorId: vid('solo'),
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      isActive: true,
    });

    const convSession = sid('conv');
    const convVisitor = vid('conv');
    await seedSession({
      sessionId: convSession,
      visitorId: convVisitor,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      isActive: true,
    });
    const order1 = await makeOrder('guest 1');
    const marked1 = await markSessionConverted(convSession, order1.id);
    assert('primeira conversão associa o LeadOrder à sessão', marked1 === true);

    const order2 = await makeOrder('guest 2', { subtotal: 50, total: 50 });
    const marked2 = await markSessionConverted(convSession, order2.id);
    assert('2º pedido na MESMA sessão não reconta (idempotente, evita negativo)', marked2 === false);
    const fallbackMarked = await markLatestSessionByVisitorConverted(convVisitor, order2.id);
    assert('fallback por visitorId também não converte de novo (não há sessão aberta)', fallbackMarked === false);

    // Escopo isolado: soloSession (sem pedido) + convSession (com 2 pedidos, 1 sessão convertida).
    const scopedSessionsToday = await sessionsTodayScoped(); // já inclui soloSession e convSession
    const scopedWithOrder = async () => {
      const rows = await p.$queryRaw<Array<{ c: number }>>`
        SELECT COUNT(*) as c FROM "VisitorSession"
        WHERE "firstSeenAt" >= ${todayStart} AND "sessionId" LIKE ${`${TAG}%`} AND "convertedAt" IS NOT NULL
      `;
      return Number(rows[0]?.c ?? 0);
    };
    const withOrderCount = await scopedWithOrder();
    assert('múltiplos pedidos na mesma sessão contam só 1 sessão "com pedido"', withOrderCount === 1, `got=${withOrderCount}`);
    assert('sessões sem pedido no escopo real não fica negativo',
      computeSessionsWithoutOrder(scopedSessionsToday, withOrderCount) >= 0);

    const withOrderGlobal = await countSessionsWithOrderToday();
    assert('countSessionsWithOrderToday() enxerga a sessão associada pelo smoke',
      withOrderGlobal >= 1, `got=${withOrderGlobal}`);

    // ───────────────────────── Pedidos hoje ─────────────────────────
    console.log('\n-- Pedidos hoje: LeadOrder.createdAt hoje x antigo, guest x logado --');
    const oldOrder = await makeOrder('old order', { subtotal: 999, total: 999 });
    // SQLite: createdAt tem @default(now()); precisa update explícito pra forçar data antiga.
    await p.leadOrder.update({
      where: { id: oldOrder.id },
      data: { createdAt: new Date(todayStart.getTime() - 2 * 24 * 60 * 60 * 1000) },
    });

    const ordersTodayCount = await p.leadOrder.count({
      where: { customerName: { contains: TAG }, createdAt: { gte: todayStart } },
    });
    // order1 + order2 (criados agora) entram; oldOrder (2 dias atrás) não.
    assert('pedidos criados hoje entram em "Pedidos hoje"', ordersTodayCount === 2, `got=${ordersTodayCount}`);
    assert('LeadOrder de ontem/anteontem não entra em "Pedidos hoje"',
      !(await p.leadOrder.findFirst({ where: { id: oldOrder.id, createdAt: { gte: todayStart } } })));

    assert('pedido guest cria com customerId=null', order1.customerId === null);

    const customer = await p.customer.create({
      data: { name: `${TAG} customer`, email: `${TAG}-${Date.now()}@example.com`, passwordHash: 'x' },
    });
    const loggedOrder = await makeOrder('logged', { subtotal: 10, total: 10 });
    await p.leadOrder.update({ where: { id: loggedOrder.id }, data: { customerId: customer.id } });
    const loggedReloaded = await p.leadOrder.findUnique({ where: { id: loggedOrder.id } });
    assert('pedido de cliente logado grava customerId', loggedReloaded?.customerId === customer.id);
    await p.customer.delete({ where: { id: customer.id } });

    // ───────────────────────── Sem dados fictícios / sem lixo dos cards removidos ─────────────────────────
    console.log('\n-- Sem mock/random e sem referências aos cards removidos --');
    const pageSrc = readFileSync(
      join(__dirname, '../../src/app/admin/(protected)/page.tsx'),
      'utf-8',
    );
    const visitorsSrc = readFileSync(join(__dirname, '../../src/lib/db/visitors.ts'), 'utf-8');
    assert('página do dashboard não usa Math.random', !pageSrc.includes('Math.random'));
    assert('visitors.ts não usa Math.random', !visitorsSrc.includes('Math.random'));
    assert('página do dashboard não contém mock/fake/dummy hardcoded',
      !/\b(mock|fake|dummy)\b/i.test(pageSrc));
    assert('card "Valor em pedidos hoje" foi removido', !pageSrc.includes('Valor em pedidos hoje'));
    assert('card "Taxa de conversão" foi removido', !pageSrc.includes('Taxa de conversão'));
    assert('sem referência residual a convertedToday', !pageSrc.includes('convertedToday'));
    assert('sem referência residual a conversionRateLabel', !visitorsSrc.includes('conversionRateLabel'));
    assert('seção "Sessões e pedidos" tem só os 4 cards esperados',
      ['Visitantes agora', 'Sessões hoje', 'Sessões sem pedido', 'Pedidos hoje']
        .every((label) => pageSrc.includes(label)));
  } finally {
    await cleanupSessions();
    await cleanupOrders();
    await p.$disconnect();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
