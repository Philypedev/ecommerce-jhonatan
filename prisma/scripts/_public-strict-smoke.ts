/**
 * Smoke suite Shopify-style: home povoada automaticamente por coleções
 * ACTIVE com produto ACTIVE. `showOnHome=true` só prioriza ordem; nunca
 * esconde. `featured=true` só prioriza ordem dentro da seção.
 *
 * Cenários do briefing:
 *   A) Coleção ACTIVE + produto ACTIVE featured=false + showOnHome=false
 *      - APARECE na seção da coleção na home
 *      - APARECE em /categoria/drones
 *      - APARECE em /busca?q=drone
 *      - Menu público exibe a coleção
 *   B) Marca featured=true
 *      - continua aparecendo
 *      - sobe na ordem dentro da seção
 *   C) Produto muda para DRAFT
 *      - some da home (seção da coleção)
 *      - some da categoria
 *      - some da busca
 *      - PDP direta 404
 *      - Sitemap não inclui
 *   D) Coleção ACTIVE sem produto ACTIVE
 *      - não aparece na home
 *      - não aparece no menu público
 *   Prioridade showOnHome:
 *      - coleções com showOnHome=true vêm ANTES no showcase
 */
import { PrismaClient } from '@prisma/client';
import {
  getProductBySlug,
  listCategoryProducts,
  searchProducts,
  type ProductWithRelations,
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
const PRIORITY_CAT_SLUG = '__smoke-strict-priority';
const PRIORITY_PRODUCT_SLUG = '__smoke-strict-priority-prod';

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
  try {
    await cleanup();

    // Coleção Drones ACTIVE, showOnHome=FALSE de propósito — regra
    // Shopify manda aparecer mesmo assim se tiver produto ACTIVE.
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
      SET "showInMenu" = 1, "showInFooter" = 1, "showOnHome" = 0
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

    // ── Cenário A ──
    console.log('\n-- Cenario A: ACTIVE + featured=false + showOnHome=false --');
    let showcase = await getHomeCollections(50);
    const showcaseCat = showcase.find((c) => c.category.slug === CAT_SLUG);
    assert('Home (showcase): secao aparece mesmo com showOnHome=false',
      Boolean(showcaseCat));
    assert('Home (showcase): produto ACTIVE aparece na secao',
      Boolean(showcaseCat?.products.some((x: ProductWithRelations) => x.slug === SLUG)));

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

    // ── Cenário B: featured prioriza ordem ──
    console.log('\n-- Cenario B: featured=true prioriza ordem na secao --');
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

    // Sanidade: sem featured, o mais recente fica antes.
    showcase = await getHomeCollections(50);
    const showcaseCatSanity = showcase.find((c) => c.category.slug === CAT_SLUG);
    const idxA = showcaseCatSanity?.products.findIndex((x: ProductWithRelations) => x.slug === SLUG) ?? -1;
    const idxB = showcaseCatSanity?.products.findIndex((x: ProductWithRelations) => x.slug === SECOND_SLUG) ?? -1;
    assert('Home (showcase): sem featured, mais recente fica antes (sanidade)',
      idxA > idxB && idxB >= 0);

    // Marca featured=true no primeiro — deve subir.
    await p.product.update({ where: { slug: SLUG }, data: { featured: true } });

    showcase = await getHomeCollections(50);
    const showcaseCatB = showcase.find((c) => c.category.slug === CAT_SLUG);
    const shIdxA = showcaseCatB?.products.findIndex((x: ProductWithRelations) => x.slug === SLUG) ?? -1;
    const shIdxB = showcaseCatB?.products.findIndex((x: ProductWithRelations) => x.slug === SECOND_SLUG) ?? -1;
    assert('Home (showcase): featured=true vem ANTES na secao',
      shIdxA >= 0 && shIdxA < shIdxB,
      `shIdxA=${shIdxA} shIdxB=${shIdxB}`);

    catList = await listCategoryProducts(CAT_SLUG, { pageSize: 50 });
    assert('Categoria: continua aparecendo',
      catList.items.some((x) => x.slug === SLUG));
    searchDrone = await searchProducts('drone');
    assert('Busca: continua em "drone"',
      searchDrone.some((x) => x.slug === SLUG));

    // ── showOnHome prioriza ordem entre coleções ──
    console.log('\n-- Prioridade: showOnHome=true prioriza ordem entre colecoes --');
    // Cria outra coleção ACTIVE com showOnHome=TRUE e position=1 (baixo).
    const priorityCat = await p.category.create({
      data: {
        name: 'Smoke Priority',
        slug: PRIORITY_CAT_SLUG,
        description: '',
        icon: 'tag',
        status: 'ACTIVE',
        position: 1,
      },
    });
    await p.$executeRaw`
      UPDATE "Category"
      SET "showInMenu" = 1, "showInFooter" = 1, "showOnHome" = 1
      WHERE "id" = ${priorityCat.id}
    `;
    await p.product.create({
      data: {
        name: 'Produto Priority',
        slug: PRIORITY_PRODUCT_SLUG,
        sku: 'SMK-STRICT-PRIO',
        price: 100,
        installments: 1,
        brand: 'X',
        stock: 1,
        status: 'ACTIVE',
        featured: false,
        categoryId: priorityCat.id,
      },
    });

    showcase = await getHomeCollections(50);
    const posPriority = showcase.findIndex((c) => c.category.slug === PRIORITY_CAT_SLUG);
    const posOther = showcase.findIndex((c) => c.category.slug === CAT_SLUG);
    assert('Home (showcase): showOnHome=true fica ANTES da com showOnHome=false',
      posPriority >= 0 && posOther >= 0 && posPriority < posOther,
      `priority=${posPriority} other=${posOther}`);

    // ── Cenário C: DRAFT ──
    console.log('\n-- Cenario C: produto DRAFT --');
    await p.product.update({ where: { slug: SLUG }, data: { status: 'DRAFT' } });

    showcase = await getHomeCollections(50);
    const showcaseCatC = showcase.find((c) => c.category.slug === CAT_SLUG);
    assert('Home (showcase): produto DRAFT some da secao',
      !showcaseCatC?.products.some((x: ProductWithRelations) => x.slug === SLUG));

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
    // Muda o segundo (único ACTIVE restante na coleção Drones) para DRAFT.
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
    showcase = await getHomeCollections(50);
    assert('Home (showcase): INACTIVE nunca aparece nem com featured=true',
      !showcase.some((c) => c.products.some((x: ProductWithRelations) => x.slug === SLUG)));
    pdp = await getProductBySlug(SLUG);
    assert('PDP: INACTIVE nunca abre', pdp === null);
  } finally {
    await cleanup();
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
