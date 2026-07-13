import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  listAdminProducts,
  type AdminProductBoolFilter,
  type AdminProductImageFilter,
  type AdminProductSort,
  type AdminProductStockFilter,
} from '@/lib/db/products';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Máximo grande o suficiente pra qualquer catálogo real do ecommerce, sem
// paginar. Se um dia passar disso, dá pra streamar em chunks — não precisa
// otimizar antes de doer.
const EXPORT_LIMIT = 10_000;

const csvEscape = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const isoLocal = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const asStock = (v: string | null): AdminProductStockFilter =>
  v === 'in-stock' || v === 'out' ? v : 'all';
const asImage = (v: string | null): AdminProductImageFilter =>
  v === 'no-real' ? 'no-real' : 'all';
const asBool = (v: string | null): AdminProductBoolFilter => (v === 'yes' ? 'yes' : 'all');
const asSort = (v: string | null): AdminProductSort => {
  const allowed: AdminProductSort[] = ['recent', 'name-asc', 'price-asc', 'price-desc', 'stock-asc', 'stock-desc'];
  return (allowed as string[]).includes(v ?? '') ? (v as AdminProductSort) : 'recent';
};

/**
 * Exportação CSV dos produtos. Respeita os filtros da URL — mesma semântica
 * de `/admin/produtos`. Endpoint autenticado; requireAdmin redireciona pro
 * login se não houver sessão.
 */
export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const { items } = await listAdminProducts({
    q: sp.get('q') ?? undefined,
    categoryId: sp.get('categoryId') ?? undefined,
    status: sp.get('status') ?? undefined,
    stock: asStock(sp.get('stock')),
    image: asImage(sp.get('image')),
    featured: asBool(sp.get('featured')),
    offer: asBool(sp.get('offer')),
    sort: asSort(sp.get('sort')),
    page: 1,
    pageSize: EXPORT_LIMIT,
  });

  const header = [
    'id',
    'Nome',
    'SKU',
    'Slug',
    'Coleção',
    'Status',
    'Preço',
    'Preço antigo',
    'Estoque',
    'Marca',
    'Destaque',
    'Selo',
    'Criado em',
    'Atualizado em',
  ];

  const rows = items.map((p) => [
    p.id,
    p.name,
    p.sku,
    p.slug,
    p.category?.name ?? '',
    p.status,
    p.price.toFixed(2).replace('.', ','),
    p.oldPrice != null ? p.oldPrice.toFixed(2).replace('.', ',') : '',
    p.stock,
    p.brand,
    p.featured ? 'Sim' : 'Não',
    p.badge ?? '',
    isoLocal(p.createdAt),
    isoLocal(p.updatedAt),
  ]);

  // BOM para o Excel abrir com acentos certos por padrão.
  const csv =
    '﻿' +
    [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n') +
    '\r\n';

  const stamp = new Date();
  const filename = `produtos-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, '0')}${String(stamp.getDate()).padStart(2, '0')}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
