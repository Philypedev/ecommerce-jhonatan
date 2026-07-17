/**
 * Smoke: cálculo puro de lucro/margem + persistência de costPrice no banco.
 * Cobre os cenários exatos do briefing:
 *   preço 2490 / custo 2000 → lucro R$ 490,00 · margem 19,68%
 *   preço 100  / custo 120  → lucro -R$ 20,00 · margem -20% · danger
 *   preço 100  / custo 100  → lucro R$ 0,00   · margem 0% · low
 *   preço 100  / custo null → sem cálculo (status none)
 * E confirma round-trip do costPrice no Product.
 */
import { PrismaClient } from '@prisma/client';
import { computeMargin } from '../../src/utils/margin';

const p = new PrismaClient();

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`OK  ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ''}`); }
}

// Comparação com tolerância pra floats.
const near = (a: number, b: number, tol = 0.005): boolean => Math.abs(a - b) < tol;

async function main() {
  console.log('-- Util computeMargin --');
  {
    const m = computeMargin(2490, 2000);
    assert('2490/2000 → lucro 490', m.profit != null && near(m.profit, 490));
    assert('2490/2000 → margem 19,68%',
      m.marginPct != null && near(m.marginPct, 19.68, 0.01),
      `got=${m.marginPct}`);
    assert('2490/2000 → status ok', m.status === 'ok');
  }
  {
    const m = computeMargin(100, 120);
    assert('100/120 → lucro -20', m.profit != null && near(m.profit, -20));
    assert('100/120 → margem -20', m.marginPct != null && near(m.marginPct, -20));
    assert('100/120 → status danger', m.status === 'danger');
  }
  {
    const m = computeMargin(100, 100);
    assert('100/100 → lucro 0', m.profit === 0);
    assert('100/100 → margem 0', m.marginPct === 0);
    // margem 0% cai em low (< LOW_MARGIN_THRESHOLD_PCT)
    assert('100/100 → status low', m.status === 'low');
  }
  {
    const m = computeMargin(100, null);
    assert('sem custo → profit null', m.profit === null);
    assert('sem custo → marginPct null', m.marginPct === null);
    assert('sem custo → status none', m.status === 'none');
  }
  {
    const m = computeMargin(0, 50);
    assert('preço zero → status none', m.status === 'none');
  }
  {
    const m = computeMargin(200, 150);
    assert('200/150 → status ok (25%)',
      m.status === 'ok' && near(m.marginPct ?? 0, 25));
  }

  // Round-trip no banco.
  console.log('\n-- Persistência do costPrice --');
  const SLUG = '__margin-smoke-product';
  await p.product.deleteMany({ where: { slug: SLUG } });

  const created = await p.product.create({
    data: {
      name: 'Margin Smoke',
      slug: SLUG,
      sku: 'MARGIN-SMK-1',
      price: 2490,
      costPrice: 2000,
      installments: 1,
      brand: 'X',
      stock: 1,
      status: 'DRAFT',
      featured: false,
    },
  });

  const read = await p.product.findUnique({ where: { id: created.id } });
  assert('costPrice persiste', read?.costPrice === 2000);

  await p.product.update({
    where: { id: created.id },
    data: { costPrice: null },
  });
  const readNull = await p.product.findUnique({ where: { id: created.id } });
  assert('costPrice pode ser null', readNull?.costPrice === null);

  await p.product.deleteMany({ where: { slug: SLUG } });
  await p.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await p.product.deleteMany({ where: { slug: { startsWith: '__margin-smoke-' } } });
  await p.$disconnect();
  process.exit(1);
});
