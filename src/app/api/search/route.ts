import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * Endpoint usado pelo typeahead do header. Retorna até 6 produtos ativos
 * que casem com o termo de busca por nome, SKU, marca, descrição curta ou
 * nome da categoria. Pensado pra ser rápido — só os campos que o dropdown
 * precisa renderizar.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') ?? '';
  const q = raw.trim();
  if (q.length < 2) {
    return NextResponse.json(
      { items: [], total: 0 },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const where = {
    status: 'ACTIVE',
    OR: [
      { name: { contains: q } },
      { sku: { contains: q } },
      { brand: { contains: q } },
      { shortDescription: { contains: q } },
      { category: { name: { contains: q } } },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        sku: true,
        stock: true,
        images: {
          orderBy: { position: 'asc' },
          take: 1,
          select: { url: true, alt: true },
        },
        category: { select: { name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json(
    {
      items: items.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        price: p.price,
        stock: p.stock,
        image: p.images[0]?.url ?? '/placeholder.svg',
        // category pode ser null pra rascunho — busca só retorna ACTIVE
        // (que exige categoria via superRefine), mas guardamos por seguro.
        category: p.category?.name ?? '',
      })),
      total,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
