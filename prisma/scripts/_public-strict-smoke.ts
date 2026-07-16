/**
 * Smoke suite Shopify-style: home povoada automaticamente por coleções
 * ativas com produto ACTIVE dentro. `featured=true` só prioriza ordem.
 *
 * Cenários do briefing:
 *   A) Coleção ACTIVE + produto ACTIVE featured=false
 *      - APARECE na vitrine geral "Novidades"
 *      - APARECE na seção Shopify-style da coleção na home
 *      - APARECE em /categoria/drones
 *      - APARECE na busca
 *      - APARECE no menu público
 *   B) Mesmo produto com featured=true
 *      - continua tudo, e vem ANTES de um produto não-destacado da
 *        mesma coleção
 *   C) Produto muda para DRAFT
 *      - some da home (vitrine + seção)
 *      - some da categoria
 *      - some da busca
 *      - PDP direta 404
 *   D) Coleção ACTIVE sem produto ACTIVE
 *      - não aparece na home
 *      - não aparece no menu público
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
  getHomeCollections,
  getMenuCategories,
} from '../../src/lib/db/categories';
import sitemap from '../../src/app/sitemap';

const p = new PrismaClient();
const SLUG = '__smoke-strict-drone';
const SECOND_SLUG = '__smoke-strict-drone-2';
const CAT_SLUG = '__smoke-strict-drones';

async function cleanup() {
  await p.product.deleteMany({ where: { slug: { startsWith: '__smoke-strict-' } } });
  await p.category.deleteMany({ where: { slug: { startsWith: '__smoke-strict-' } } });
}

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`OK  ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ''}`); }
}

async function main() {
  const originalSettings = await p.storeSettings.findUnique({
    where: { id: 'singleton' },
    select: { featuredCategoryId: true },
  });

  try {
    await cleanup();

    // Sem restrição de coleção — a vitrine geral puxa de qualquer coleção
    // ativa, que é o comportamento default esperado após publicação.
    await p.storeSettings.update({
      where: { id: 'singleton' },
      data: { featuredCategoryId: null },
    });

    const cat = await p.category.create({
      data: {
        name: 'Smoke Drones',
        slug: CAT_SLUG,
        description: 'coleção de smoke',
        icon: 'tag',
        status: 'ACTIVE',
        position: 999,
      },
    });
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

    // ── Cenário A: ACTIVE + featured=false ──
    console.log('\n-- Cenario A: ACTIVE + featured=false --');
    let home = await getFeaturedProducts(null, 50);
    assert('Home (vitrine geral): APARECE mesmo sem featured',
      home.some((x) => x.slug === SLUG));

    let showcase = await getHomeCollections(50);
    const showcaseCat = showcase.find((c) => c.category.slug === CAT_SLUG);
    assert('Home (showcase): secao da colecao existe',
      Boolean(showcaseCat));
    assert('Home (showcase): produto aparece na secao da colecao',
      Boolean(showcaseCat?.products.some((x) => x.slug === SLUG)));

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
    assert('Menu: colecao com ACTIVE aparece',
      menu.some((c) => c.slug === CAT_SLUG));

    let footer = await getFooterCategories();
    assert('Footer: colecao com ACTIVE aparece',
      footer.some((c) => c.slug === CAT_SLUG));

    let sitemapEntries = await sitemap();
    assert('Sitemap: inclui URL da categoria',
      sitemapEntries.some((e) => e.url.endsWith(`/categoria/${CAT_SLUG}`)));
    assert('Sitemap: inclui URL do produto ACTIVE',
      sitemapEntries.some((e) => e.url.endsWith(`/produto/${SLUG}`)));

    let pdp = await getProductBySlug(SLUG);
    assert('PDP: ACTIVE abre', pdp?.slug === SLUG);

    // ── Cenário B: featured=true prioriza ordem ──
    console.log('\n-- Cenario B: featured=true prioriza ordem --');
    // Cria segundo produto ACTIVE sem featured e MAIS recente para provar
    // que sem featured=true no primeiro, este segundo estaria na frente.
    await p.product.create({
      data: {
        name: 'Drone Smoke Air Lite',
        slug: SECOND_SLUG,
        sku: 'SMK-STRICT-2',
        price: 2990,
        installments: 1,
        brand: 'DJI',
        stock: 3,
        status: 'ACTIVE',
        featured: false,
        categoryId: cat.id,
      },
    });
    // Sanidade — sem featured no primeiro, o segundo (mais recente) fica antes.
    home = await getFeaturedProducts(null, 50);
    const idxA = home.findIndex((x) => x.slug === SLUG);
    const idxB = home.findIndex((x) => x.slug === SECOND_SLUG);
    assert('Home (vitrine): sem featured, mais recente fica antes (sanidade)',
      idxA > idxB && idxB >= 0);

    // Marca featured=true no PRIMEIRO — ele deve pular para frente.
    await p.product.update({ where: { slug: SLUG }, data: { featured: true } });

    home = await getFeaturedProducts(null, 50);
    const idxAfterA = home.findIndex((x) => x.slug === SLUG);
    const idxAfterB = home.findIndex((x) => x.slug === SECOND_SLUG);
    assert('Home (vitrine): featured=true vem ANTES do nao-destacado',
      idxAfterA >= 0 && idxAfterA < idxAfterB,
      `idxA=${idxAfterA} idxB=${idxAfterB}`);

    showcase = await getHomeCollections(50);
    const showcaseCatB = showcase.find((c) => c.category.slug === CAT_SLUG);
    const shIdxA = showcaseCatB?.products.findIndex((x) => x.slug === SLUG) ?? -1;
    const shIdxB = showcaseCatB?.products.findIndex((x) => x.slug === SECOND_SLUG) ?? -1;
    assert('Home (showcase): featured=true vem ANTES na secao da colecao',
      shIdxA >= 0 && shIdxA < shIdxB,
      `shIdxA=${shIdxA} shIdxB=${shIdxB}`);

    catList = await listCategoryProducts(CAT_SLUG, { pageSize: 50 });
    assert('Categoria: continua aparecendo',
      catList.items.some((x) => x.slug === SLUG));

    searchDrone = await searchProducts('drone');
    assert('Busca: continua em "drone"',
      searchDrone.some((x) => x.slug === SLUG));

    // ── Cenário C: DRAFT ──
    console.log('\n-- Cenario C: DRAFT --');
    await p.product.update({ where: { slug: SLUG }, data: { status: 'DRAFT' } });

    home = await getFeaturedProducts(null, 50);
    assert('Home (vitrine): SOME quando DRAFT',
      !home.some((x) => x.slug === SLUG));

    showcase = await getHomeCollections(50);
    const showcaseCatC = showcase.find((c) => c.category.slug === CAT_SLUG);
    assert('Home (showcase): produto DRAFT some da secao',
      !showcaseCatC?.products.some((x) => x.slug === SLUG));

    catList = await listCategoryProducts(CAT_SLUG, { pageSize: 50 });
    assert('Categoria: SOME quando DRAFT',
      !catList.items.some((x) => x.slug === SLUG));

    searchDrone = await searchProducts('drone');
    assert('Busca: SOME quando DRAFT',
      !searchDrone.some((x) => x.slug === SLUG));

    pdp = await getProductBySlug(SLUG);
    assert('PDP: DRAFT NAO abre publicamente', pdp === null);

    sitemapEntries = await sitemap();
    assert('Sitemap: NAO inclui produto DRAFT',
      !sitemapEntries.some((e) => e.url.endsWith(`/produto/${SLUG}`)));

    // ── Cenário D: coleção ACTIVE sem produto ACTIVE ──
    console.log('\n-- Cenario D: colecao sem produto ACTIVE --');
    // Muda o segundo (unico ACTIVE restante) para DRAFT — coleção fica sem
    // nenhum produto ACTIVE dentro.
    await p.product.update({ where: { slug: SECOND_SLUG }, data: { status: 'DRAFT' } });

    showcase = await getHomeCollections(50);
    assert('Home (showcase): colecao sem ACTIVE SOME',
      !showcase.some((c) => c.category.slug === CAT_SLUG));

    menu = await getMenuCategories();
    assert('Menu: colecao sem ACTIVE some',
      !menu.some((c) => c.slug === CAT_SLUG));

    footer = await getFooterCategories();
    assert('Footer: colecao sem ACTIVE some',
      !footer.some((c) => c.slug === CAT_SLUG));

    // ── Sanidade: INACTIVE nunca vaza ──
    console.log('\n-- Sanidade: INACTIVE --');
    await p.product.update({
      where: { slug: SLUG },
      data: { status: 'INACTIVE', featured: true },
    });
    home = await getFeaturedProducts(null, 50);
    assert('Home (vitrine): INACTIVE nunca aparece nem com featured=true',
      !home.some((x) => x.slug === SLUG));
    pdp = await getProductBySlug(SLUG);
    assert('PDP: INACTIVE nunca abre', pdp === null);
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
