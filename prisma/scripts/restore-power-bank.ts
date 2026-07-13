/**
 * Restaura APENAS o produto "Power Bank 20.000mAh para Viagem" se ele não
 * existir no banco. Não toca em nenhum outro produto, categoria, setting
 * ou pedido.
 *
 * Uso: `npm run db:restore-power-bank` ou `npx tsx prisma/scripts/restore-power-bank.ts`
 *
 * Idempotente: se o SKU PB-20000-TRAVEL já existe, não faz nada.
 */
try {
  process.loadEnvFile();
} catch {
  /* .env opcional */
}

import { PrismaClient } from '@prisma/client';

const SKU = 'PB-20000-TRAVEL';
const CATEGORY_SLUG = 'eletronicos-viagem';

const PRODUCT = {
  name: 'Power Bank 20.000mAh para Viagem',
  slug: 'power-bank-20000mah-para-viagem',
  shortDescription:
    'Carregamento rápido 22.5W, 3 saídas e capacidade certificada para voos.',
  fullDescription:
    'Para quem não pode ficar sem bateria na estrada. 20.000mAh de capacidade real, 3 saídas simultâneas (USB-C PD + 2 USB-A QC 3.0) e entrada USB-C com PD 18W para recarga rápida do próprio power bank. Capacidade dentro do limite permitido para bagagem de mão em voos comerciais.',
  price: 249.9,
  oldPrice: 329.9,
  installments: 12,
  sku: SKU,
  brand: 'TravelTech',
  stock: 30,
  status: 'ACTIVE',
  featured: true,
  badge: 'promo',
  warranty: '12 meses de garantia.',
  packageContent: ['1x Power Bank 20.000mAh', '1x Cabo USB-C', '1x Bolsa', '1x Manual'],
  benefits: [
    '20.000mAh de capacidade real',
    'Carregamento rápido 22.5W',
    '3 saídas simultâneas',
    'Aprovado para bagagem de mão (até 100Wh)',
    'Display digital com porcentagem',
  ],
  specifications: [
    { name: 'Capacidade', value: '20.000mAh / 74Wh' },
    { name: 'Saídas', value: '1x USB-C PD + 2x USB-A QC 3.0' },
    { name: 'Entrada', value: 'USB-C PD 18W' },
    { name: 'Peso', value: '380g' },
  ],
  faq: [
    {
      question: 'Posso levar no avião?',
      answer:
        'Sim. Com 74Wh, está dentro do limite de 100Wh permitido para bagagem de mão pela maioria das companhias. Não despache na mala — power banks devem ir sempre com você.',
    },
    {
      question: 'Em quanto tempo recarrega meu celular?',
      answer:
        'Smartphones modernos costumam carregar de 0 a 100% em menos de 1h30 usando a saída USB-C PD. Esse modelo carrega um celular até 5 vezes antes de precisar ser recarregado.',
    },
  ],
};

const prisma = new PrismaClient();

async function main() {
  console.log('Restore: checando se o Power Bank existe...');

  const existing = await prisma.product.findUnique({
    where: { sku: SKU },
    select: { id: true, name: true, status: true },
  });

  if (existing) {
    console.log(
      `Restore: produto SKU=${SKU} já existe (id=${existing.id}, status=${existing.status}). Nada a fazer.`,
    );
    return;
  }

  const category = await prisma.category.findUnique({
    where: { slug: CATEGORY_SLUG },
  });
  if (!category) {
    console.error(
      `Restore: ERRO — categoria "${CATEGORY_SLUG}" não encontrada. Crie a coleção antes.`,
    );
    process.exit(1);
  }

  await prisma.product.create({
    data: {
      name: PRODUCT.name,
      slug: PRODUCT.slug,
      shortDescription: PRODUCT.shortDescription,
      fullDescription: PRODUCT.fullDescription,
      price: PRODUCT.price,
      oldPrice: PRODUCT.oldPrice,
      installments: PRODUCT.installments,
      sku: PRODUCT.sku,
      brand: PRODUCT.brand,
      stock: PRODUCT.stock,
      status: PRODUCT.status,
      featured: PRODUCT.featured,
      badge: PRODUCT.badge,
      warranty: PRODUCT.warranty,
      packageContent: JSON.stringify(PRODUCT.packageContent),
      categoryId: category.id,
      images: {
        create: [{ url: '/placeholder.svg', alt: PRODUCT.name, position: 0 }],
      },
      benefits: {
        create: PRODUCT.benefits.map((text, position) => ({ text, position })),
      },
      specifications: {
        create: PRODUCT.specifications.map((s, position) => ({ ...s, position })),
      },
      faq: {
        create: PRODUCT.faq.map((f, position) => ({ ...f, position })),
      },
    },
  });

  console.log(`Restore: produto "${PRODUCT.name}" criado com sucesso na coleção "${category.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
