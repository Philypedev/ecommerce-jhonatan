/**
 * Smoke suite: regra estrita da vitrine + páginas públicas.
 *
 * Segue o script de teste do briefing:
 *   Produto ACTIVE em Drones, featured=false:
 *     - NÃO aparece na home
 *     - aparece em /categoria/drones
 *     - aparece na busca
 *   featured=true:
 *     - aparece na home
 *     - continua na categoria/busca
 *   status=DRAFT:
 *     - some da home
 *     - some da categoria
 *     - some da busca
 *     - PDP direta não abre
 */
import { PrismaClient } from '@prisma/client';
import {
  getFeaturedProducts,
  getProductBySlug,
  listCategoryProducts,
  searchProducts,
} from '../../src/lib/db/products';
import {
  getFooterCategories,
  getMenuCategories,
} from '../../src/lib/db/categories';
import sitemap from '../../src/app/sitemap';

const p = new PrismaClient();
const SLUG = '__smoke-strict-drone';
const CAT_SLUG = '__smoke-strict-drones';

async function cleanup() {
  await p.product.deleteMany({ where: { slug: { startsWith: '__smoke-strict-' } } });
  await p.category.deleteMany({ where: { slug: { startsWith: '__smoke-strict-' } } });
}

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✅ ${name}`); }
  else { fail++; console.log(`❌ ${name}${detail ? `\n   → ${detail}` : ''}`); }
}

async function main() {
  const originalSettings = await p.storeSettings.findUnique({
    where: { id: 'singleton' },
    select: { featuredCategoryId: true },
  });

  try {
    await cleanup();

    // Sem restrição de coleção (featuredCategoryId=null) — smoke roda contra
    // a regra global "featured=true" mesmo se ambiente tiver coleção real.
    await p.storeSettings.update({
      where: { id: 'singleton' },
      data: { featuredCategoryId: null },
    });

    const cat = await p.category.create({
      data: {
        name: 'Smoke Drones',
        slug: CAT_SLUG,
        description: '',
        icon: 'tag',
        status: 'ACTIVE',
        position: 999,
      },
    });
    // showInMenu / showInFooter vieram via db push sem generate; setamos via SQL.
    await p.$executeRaw`
      UPDATE "Category"
      SET "showInMenu" = 1, "showInFooter" = 1, "showOnHome" = 1
      WHERE "id" = ${cat.id}
    `;

    await p.product.create({
      data: {
        name: 'Drone Smoke Neo 2',
        slug: SLUG,
        sku: 'SMK-STRICT-1',
        price: 3990,
        installments: 1,
        brand: 'DJI',
        stock: 5,
        status: 'ACTIVE',
        featured: false,
        categoryId: cat.id,
      },
    });

    // ── FASE 1: ACTIVE + featured=false ──
    console.log('\n── Fase 1: ACTIVE + featured=false ──');
    let home = await getFeaturedProducts(null, 50);
    assert('Home: NÃO aparece produto sem featured',
      !home.some((x) => x.slug === SLUG),
      `retornados smoke: ${home.filter((x) => x.slug.startsWith('__smoke-strict-')).map((x) => x.slug).join(', ')}`);

    let catList = await listCategoryProducts(CAT_SLUG, { pageSize: 50 });
    assert('Categoria: APARECE produto ACTIVE mesmo sem featured',
      catList.items.some((x) => x.slug === SLUG));

    let searchDrone = await searchProducts('drone');
    assert('Busca: APARECE em "drone"',
      searchDrone.some((x) => x.slug === SLUG));

    let searchDji = await searchProducts('dji');
    assert('Busca: APARECE em "dji"',
      searchDji.some((x) => x.slug === SLUG));

    let menu = await getMenuCategories();
    assert('Menu: coleção com ACTIVE aparece',
      menu.some((c) => c.slug === CAT_SLUG));

    let footer = await getFooterCategories();
    assert('Footer: coleção com ACTIVE aparece',
      footer.some((c) => c.slug === CAT_SLUG));

    let sitemapEntries = await sitemap();
    assert('Sitemap: inclui URL da categoria',
      sitemapEntries.some((e) => e.url.endsWith(`/categoria/${CAT_SLUG}`)));
    assert('Sitemap: inclui URL do produto ACTIVE',
      sitemapEntries.some((e) => e.url.endsWith(`/produto/${SLUG}`)));

    let pdp = await getProductBySlug(SLUG);
    assert('PDP: ACTIVE abre',
      pdp?.slug === SLUG);

    // ── FASE 2: marcar featured=true ──
    console.log('\n── Fase 2: featured=true ──');
    await p.product.update({ where: { slug: SLUG }, data: { featured: true } });

    home = await getFeaturedProducts(null, 50);
    assert('Home: APARECE agora que featured=true',
      home.some((x) => x.slug === SLUG));

    catList = await listCategoryProducts(CAT_SLUG, { pageSize: 50 });
    assert('Categoria: continua aparecendo',
      catList.items.some((x) => x.slug === SLUG));

    searchDrone = await searchProducts('drone');
    assert('Busca: continua em "drone"',
      searchDrone.some((x) => x.slug === SLUG));

    // ── FASE 3: mudar para DRAFT ──
    console.log('\n── Fase 3: status=DRAFT ──');
    await p.product.update({ where: { slug: SLUG }, data: { status: 'DRAFT' } });

    home = await getFeaturedProducts(null, 50);
    assert('Home: SOME quando DRAFT',
      !home.some((x) => x.slug === SLUG));

    catList = await listCategoryProducts(CAT_SLUG, { pageSize: 50 });
    assert('Categoria: SOME quando DRAFT',
      !catList.items.some((x) => x.slug === SLUG));

    searchDrone = await searchProducts('drone');
    assert('Busca: SOME quando DRAFT',
      !searchDrone.some((x) => x.slug === SLUG));

    pdp = await getProductBySlug(SLUG);
    assert('PDP: DRAFT NÃO abre publicamente',
      pdp === null);

    menu = await getMenuCategories();
    assert('Menu: coleção sem ACTIVE some',
      !menu.some((c) => c.slug === CAT_SLUG));

    footer = await getFooterCategories();
    assert('Footer: coleção sem ACTIVE some',
      !footer.some((c) => c.slug === CAT_SLUG));

    sitemapEntries = await sitemap();
    assert('Sitemap: NÃO inclui produto DRAFT',
      !sitemapEntries.some((e) => e.url.endsWith(`/produto/${SLUG}`)));

    // ── FASE 4: sanidade — INACTIVE também nunca aparece ──
    console.log('\n── Fase 4: INACTIVE ──');
    await p.product.update({ where: { slug: SLUG }, data: { status: 'INACTIVE', featured: true } });

    home = await getFeaturedProducts(null, 50);
    assert('Home: INACTIVE nunca aparece nem com featured=true',
      !home.some((x) => x.slug === SLUG));

    pdp = await getProductBySlug(SLUG);
    assert('PDP: INACTIVE nunca abre',
      pdp === null);

  } finally {
    await cleanup();
    await p.storeSettings.update({
      where: { id: 'singleton' },
      data: { featuredCategoryId: originalSettings?.featuredCategoryId ?? null },
    });
    await p.$disconnect();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await cleanup();
  await p.$disconnect();
  process.exit(1);
});
