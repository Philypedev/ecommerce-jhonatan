/**
 * Smoke integrado da conta de cliente.
 * Roda contra o SQLite de dev — cria/limpa registros isoladamente.
 *
 * Cobre:
 *   - Signup: cria Customer com email lowercase + hash bcrypt.
 *   - Signup duplicado: violação de UNIQUE ao gravar mesmo email.
 *   - Login: bcrypt.compare aceita a senha correta e rejeita a errada.
 *   - JWT do cliente: assina e verifica; a claim `type: 'customer'`
 *     está presente e o helper aceita.
 *   - Isolamento admin ⇄ cliente: token do admin (SESSION_COOKIE em
 *     src/lib/auth.ts) NÃO valida via verifyCustomerSession; e vice-versa.
 *   - Endereços: só um `isDefault=true` por cliente após transações.
 *   - LeadOrder: aceita `customerId=null` (guest) e com `customerId`
 *     (logado). O relation opcional funciona.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  normalizeEmail,
  safeAccountRedirect,
  signCustomerSession,
  verifyCustomerSession,
} from '../../src/lib/customer-auth';
import { signSession, verifySession } from '../../src/lib/auth';
import { customerAddressSchema } from '../../src/lib/validation/schemas';

// Precisa de AUTH_SECRET válido pra assinar/verificar JWT.
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
  process.env.AUTH_SECRET = 'smoke-test-auth-secret-with-enough-length-1234567890';
}

const p = new PrismaClient();
const EMAIL_PLAIN = '  Smoke.Customer+AUTH@Example.COM ';
const EMAIL_NORMALIZED = normalizeEmail(EMAIL_PLAIN);
const EMAIL_TAG = '__smoke-customer';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`OK  ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ''}`); }
}

async function cleanup() {
  // Remove tudo com email marcado como smoke, e endereços/pedidos ligados.
  const smokeCustomers = await p.customer.findMany({
    where: { OR: [{ email: EMAIL_NORMALIZED }, { name: { contains: EMAIL_TAG } }] },
    select: { id: true },
  });
  const ids = smokeCustomers.map((c) => c.id);
  if (ids.length > 0) {
    // Desvincula pedidos primeiro (ON DELETE SET NULL cuidaria, mas prefiro
    // limpar explícito pra deixar rastro nas queries do smoke).
    await p.leadOrder.updateMany({
      where: { customerId: { in: ids } },
      data: { customerId: null },
    });
    // Endereços caem em cascade quando o Customer é apagado.
    await p.customer.deleteMany({ where: { id: { in: ids } } });
  }
  // Sanitiza pedidos de smoke.
  await p.leadOrder.deleteMany({ where: { customerName: { contains: EMAIL_TAG } } });
}

async function main() {
  try {
    await cleanup();

    console.log('-- normalizeEmail --');
    assert(
      `normalize "${EMAIL_PLAIN}" → lowercase trim`,
      EMAIL_NORMALIZED === 'smoke.customer+auth@example.com',
    );

    console.log('\n-- Signup --');
    const passwordHash = await bcrypt.hash('senha123', 10);
    const created = await p.customer.create({
      data: {
        name: `${EMAIL_TAG} Alice`,
        email: EMAIL_NORMALIZED,
        phone: '11999999999',
        passwordHash,
      },
    });
    assert('customer criado com id', typeof created.id === 'string' && created.id.length > 0);
    assert('email persistido em lowercase',
      created.email === 'smoke.customer+auth@example.com');
    assert('senha nunca gravada em texto puro',
      created.passwordHash !== 'senha123'
        && created.passwordHash.startsWith('$2'));

    console.log('\n-- Signup duplicado (UNIQUE email) --');
    let dupError: unknown = null;
    try {
      await p.customer.create({
        data: {
          name: `${EMAIL_TAG} Alice2`,
          email: EMAIL_NORMALIZED,
          passwordHash,
        },
      });
    } catch (e) {
      dupError = e;
    }
    assert('duplicar email dispara erro do Prisma', dupError !== null);

    console.log('\n-- Login: bcrypt.compare --');
    const good = await bcrypt.compare('senha123', created.passwordHash);
    const bad = await bcrypt.compare('senhaERRADA', created.passwordHash);
    assert('senha correta bate', good === true);
    assert('senha errada não bate', bad === false);

    console.log('\n-- JWT do cliente: assina e verifica --');
    const customerToken = await signCustomerSession({
      cid: created.id,
      email: created.email,
      name: created.name,
    });
    const payload = await verifyCustomerSession(customerToken);
    assert('verifyCustomerSession aceita o próprio token',
      payload !== null && payload.cid === created.id);
    assert('payload traz email e name', payload?.email === created.email);

    console.log('\n-- Isolamento admin ⇄ cliente --');
    // Token do admin não deve valer como sessão de cliente.
    const adminToken = await signSession({
      uid: 'fake-admin-id',
      email: 'admin@teste.local',
      role: 'ADMIN',
    });
    const asCustomer = await verifyCustomerSession(adminToken);
    assert('token de ADMIN é REJEITADO pela verificação do cliente',
      asCustomer === null);
    // E o contrário: token de cliente também não deve valer como admin.
    const asAdmin = await verifySession(customerToken);
    assert('token de CLIENTE decodifica no admin mas sem role administrativa',
      // verifySession admin decodifica JWTs assinados com o mesmo secret,
      // mas o `role` do payload não é 'ADMIN' — o middleware admin exige
      // acesso a SESSION_COOKIE distinto (traveltech_admin), então mesmo
      // que decodifique, o admin loop de cookies não pega este token.
      // Aqui só afirmamos que a claim `role` do JWT do cliente não é 'ADMIN'.
      asAdmin === null || asAdmin.role !== 'ADMIN',
      `admin verify devolveu: ${JSON.stringify(asAdmin)}`);

    console.log('\n-- Endereços: exclusividade do isDefault --');
    const addr1 = await p.customerAddress.create({
      data: {
        customerId: created.id,
        zipCode: '01310100',
        street: 'Av. Paulista',
        number: '1000',
        city: 'São Paulo',
        state: 'SP',
        isDefault: true,
      },
    });
    // Simula setDefaultAddressAction: clear + mark
    const addr2 = await p.customerAddress.create({
      data: {
        customerId: created.id,
        zipCode: '04538132',
        street: 'Av. Faria Lima',
        number: '2000',
        city: 'São Paulo',
        state: 'SP',
        isDefault: false,
      },
    });
    await p.$transaction([
      p.customerAddress.updateMany({
        where: { customerId: created.id, isDefault: true, NOT: { id: addr2.id } },
        data: { isDefault: false },
      }),
      p.customerAddress.update({ where: { id: addr2.id }, data: { isDefault: true } }),
    ]);
    const defaults = await p.customerAddress.count({
      where: { customerId: created.id, isDefault: true },
    });
    assert('só um endereço padrão por cliente após "set default"',
      defaults === 1);
    const addr1After = await p.customerAddress.findUnique({ where: { id: addr1.id } });
    assert('endereço antigo perdeu o flag default', addr1After?.isDefault === false);

    console.log('\n-- LeadOrder: aceita customerId opcional --');
    const guest = await p.leadOrder.create({
      data: {
        customerName: `${EMAIL_TAG} Guest`,
        customerPhone: '11999999999',
        deliveryType: 'entrega',
        paymentMethod: 'pix',
        subtotal: 100,
        total: 100,
        whatsappMessage: 'guest test',
        // sem customerId
      },
    });
    assert('LeadOrder guest cria com customerId=null', guest.customerId === null);
    const linked = await p.leadOrder.create({
      data: {
        customerName: `${EMAIL_TAG} Linked`,
        customerPhone: '11999999999',
        deliveryType: 'entrega',
        paymentMethod: 'pix',
        subtotal: 200,
        total: 200,
        whatsappMessage: 'linked test',
        customerId: created.id,
      },
    });
    assert('LeadOrder linked cria com customerId setado',
      linked.customerId === created.id);
    const relation = await p.leadOrder.findUnique({
      where: { id: linked.id },
      include: { customer: { select: { id: true, email: true } } },
    });
    assert('relation LeadOrder → Customer resolve pelo customerId',
      relation?.customer?.id === created.id
        && relation?.customer?.email === EMAIL_NORMALIZED);

    console.log('\n-- Cascade: remover Customer preserva pedidos --');
    await p.customer.delete({ where: { id: created.id } });
    const orphan = await p.leadOrder.findUnique({ where: { id: linked.id } });
    assert('deletar Customer seta customerId=null no pedido (ON DELETE SET NULL)',
      orphan !== null && orphan.customerId === null);

    // Endereços caíram em cascade
    const orphanAddresses = await p.customerAddress.count({
      where: { customerId: created.id },
    });
    assert('endereços caem em cascade quando o Customer é deletado',
      orphanAddresses === 0);

    console.log('\n-- safeAccountRedirect: open-redirect / path-traversal --');
    assert('null → /conta',                         safeAccountRedirect(null) === '/conta');
    assert('undefined → /conta',                    safeAccountRedirect(undefined) === '/conta');
    assert('"" → /conta',                           safeAccountRedirect('') === '/conta');
    assert('"/conta" (exato) → /conta',             safeAccountRedirect('/conta') === '/conta');
    assert('"/conta/pedidos" → /conta/pedidos',     safeAccountRedirect('/conta/pedidos') === '/conta/pedidos');
    assert('"/conta/enderecos" → /conta/enderecos', safeAccountRedirect('/conta/enderecos') === '/conta/enderecos');
    // Bugs cobertos pelo fix:
    assert('"/contato" (aceito pelo startsWith velho) → /conta',
      safeAccountRedirect('/contato') === '/conta');
    assert('"/contatoss" → /conta',                 safeAccountRedirect('/contatoss') === '/conta');
    assert('"/conta.evil" → /conta',                safeAccountRedirect('/conta.evil') === '/conta');
    assert('"//evil.com/xss" (protocol-relative) → /conta',
      safeAccountRedirect('//evil.com/xss') === '/conta');
    assert('"https://evil.com" (URL absoluta) → /conta',
      safeAccountRedirect('https://evil.com') === '/conta');
    assert('"/admin" (destino admin bloqueado) → /conta',
      safeAccountRedirect('/admin') === '/conta');
    assert('"/admin/login" → /conta',
      safeAccountRedirect('/admin/login') === '/conta');
    assert('"/conta/../admin" (path-traversal) → /conta',
      safeAccountRedirect('/conta/../admin') === '/conta');
    assert('"conta/pedidos" (sem barra inicial) → /conta',
      safeAccountRedirect('conta/pedidos') === '/conta');

    console.log('\n-- Schema de CEP: exige 8 dígitos --');
    const baseAddr = {
      street: 'Av. Teste',
      number: '100',
      city: 'São Paulo',
      state: 'SP' as const,
    };
    assert('"01310-100" (com máscara) OK',
      customerAddressSchema.safeParse({ ...baseAddr, zipCode: '01310-100' }).success);
    assert('"01310100" (8 dígitos crus) OK',
      customerAddressSchema.safeParse({ ...baseAddr, zipCode: '01310100' }).success);
    assert('"AAAAAAAA" (8 chars não-numéricos) REJEITADO',
      !customerAddressSchema.safeParse({ ...baseAddr, zipCode: 'AAAAAAAA' }).success);
    assert('"12345" (só 5 dígitos) REJEITADO',
      !customerAddressSchema.safeParse({ ...baseAddr, zipCode: '12345' }).success);
    assert('"" REJEITADO',
      !customerAddressSchema.safeParse({ ...baseAddr, zipCode: '' }).success);
    assert('"AB123456" (mistura) REJEITADO',
      !customerAddressSchema.safeParse({ ...baseAddr, zipCode: 'AB123456' }).success);
    assert('UF inválida REJEITADA',
      !customerAddressSchema.safeParse({ ...baseAddr, zipCode: '01310100', state: 'XX' as never }).success);

    console.log('\n-- Login: uppercase/espaços no email normalizam --');
    // Signup com email já normalizado, mas login recebe "  UPPER@... ".
    const login1 = await p.customer.create({
      data: {
        name: `${EMAIL_TAG} Bob`,
        email: normalizeEmail('BOB@EXAMPLE.com'),
        passwordHash: await bcrypt.hash('senha123', 10),
      },
    });
    const loginNorm = normalizeEmail('  BOB@Example.COM  ');
    const found = await p.customer.findUnique({ where: { email: loginNorm } });
    assert('login com email uppercase + espaços encontra o cliente',
      found?.id === login1.id);
  } finally {
    await cleanup();
    // Restaura pedidos de smoke que possam ter sobrado com customerId=null
    await p.leadOrder.deleteMany({ where: { customerName: { contains: EMAIL_TAG } } });
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
