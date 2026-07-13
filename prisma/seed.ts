// Carrega .env (Node 20.6+). Necessário porque executamos via `tsx prisma/seed.ts`.
try {
  process.loadEnvFile();
} catch {
  /* .env opcional em ambientes onde a env já está injetada */
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { products as mockProducts, featuredProducts } from '../src/data/products';
import { categories as mockCategories } from '../src/data/categories';
import { siteConfig } from '../src/config/site';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: iniciando...');

  // 1. Admin
  const email = process.env.ADMIN_EMAIL || 'admin@traveltech.com.br';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = process.env.ADMIN_NAME || 'Administrador';

  // Remove admin antigo da marca anterior, caso o seed esteja sendo rodado em
  // banco já populado com o nome antigo.
  await prisma.user.deleteMany({
    where: {
      email: { in: ['admin@novatech.com.br', 'admin@novatechdrones.com.br'] },
      NOT: { email },
    },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: 'ADMIN' },
    create: { email, passwordHash, name, role: 'ADMIN' },
  });
  console.log(`Seed: admin pronto -> ${email}`);

  // 2. StoreSettings (singleton).
  // No update reaplica os campos de identidade e os textos institucionais que
  // mudam quando a marca é repivotada. Cores e logos personalizados pelo admin
  // são preservados.
  const baseSettings = {
    storeName: siteConfig.name,
    shortName: siteConfig.shortName,
    tagline: siteConfig.tagline,
    whatsappNumber: siteConfig.whatsapp,
    whatsappDisplay: siteConfig.whatsappDisplay,
    email: siteConfig.email,
    address: siteConfig.address,
    businessHours: siteConfig.businessHours,
    instagram: siteConfig.socials.instagram,
    facebook: siteConfig.socials.facebook,
    youtube: siteConfig.socials.youtube,
    heroTitle: siteConfig.tagline,
    heroSubtitle:
      'Compra rápida, atendimento humano e envio para todo o Brasil. Fale com a nossa equipe e finalize seu pedido pelo WhatsApp.',
    heroPrimaryButtonText: 'Ver produtos',
    heroSecondaryButtonText: 'Comprar pelo WhatsApp',
    defaultMetaTitle: `${siteConfig.name} — ${siteConfig.tagline}`,
    defaultMetaDescription: siteConfig.description,
    footerText: siteConfig.description,
  };
  await prisma.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {
      storeName: baseSettings.storeName,
      shortName: baseSettings.shortName,
      tagline: baseSettings.tagline,
      email: baseSettings.email,
      address: baseSettings.address,
      instagram: baseSettings.instagram,
      facebook: baseSettings.facebook,
      youtube: baseSettings.youtube,
      heroTitle: baseSettings.heroTitle,
      heroSubtitle: baseSettings.heroSubtitle,
      heroPrimaryButtonText: baseSettings.heroPrimaryButtonText,
      heroSecondaryButtonText: baseSettings.heroSecondaryButtonText,
      defaultMetaTitle: baseSettings.defaultMetaTitle,
      defaultMetaDescription: baseSettings.defaultMetaDescription,
      footerText: baseSettings.footerText,
      // Primary color é re-aplicado em re-seeds para alinhar com o design
      // atual. Os outros tons (secondary/accent/bg/text) preservam customização.
      primaryColor: '#007396',
    },
    create: { id: 'singleton', ...baseSettings },
  });
  console.log('Seed: store settings prontos');

  // 3. Rotating messages — sempre substitui pelo conjunto atual de siteConfig.
  await prisma.rotatingMessage.deleteMany({});
  await prisma.rotatingMessage.createMany({
    data: siteConfig.trustMessages.map((text, i) => ({
      text,
      active: true,
      position: i,
    })),
  });
  console.log(`Seed: ${siteConfig.trustMessages.length} mensagens rotativas`);

  // 4. Reset de catálogo (necessário num pivô de marca).
  //    Produtos primeiro (cascade limpa imagens/specs/faq/benefits).
  //    Categorias depois — fica seguro porque não há mais FK pendurada.
  //    StoreSettings, RotatingMessage e LeadOrder NÃO são tocados.
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  // 5. Categorias
  for (let i = 0; i < mockCategories.length; i++) {
    const c = mockCategories[i];
    await prisma.category.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        highlight: c.highlight ?? false,
        position: i,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`Seed: ${mockCategories.length} categorias`);

  // 6. Produtos
  const featuredIds = new Set(featuredProducts.map((p) => p.id));

  for (const p of mockProducts) {
    const category = await prisma.category.findUnique({ where: { slug: p.categorySlug } });
    if (!category) {
      console.warn(`Seed: categoria não encontrada para ${p.slug} (${p.categorySlug}) — pulando`);
      continue;
    }

    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        shortDescription: p.shortDescription,
        fullDescription: p.description,
        price: p.price,
        oldPrice: p.oldPrice ?? null,
        installments: p.installments,
        sku: p.sku,
        brand: p.brand,
        stock: p.stock,
        status: 'ACTIVE',
        featured: featuredIds.has(p.id),
        badge: p.badge ?? null,
        warranty: p.warranty,
        packageContent: JSON.stringify(p.boxContents),
        categoryId: category.id,
        images: {
          create: p.images.map((img, idx) => ({ url: img.src, alt: img.alt, position: idx })),
        },
        specifications: {
          create: p.specifications.map((s, idx) => ({
            name: s.label,
            value: s.value,
            position: idx,
          })),
        },
        faq: {
          create: p.faq.map((f, idx) => ({
            question: f.question,
            answer: f.answer,
            position: idx,
          })),
        },
        benefits: {
          create: p.benefits.map((b, idx) => ({ text: b, position: idx })),
        },
      },
    });
  }
  console.log(`Seed: ${mockProducts.length} produtos`);

  console.log('Seed: concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
