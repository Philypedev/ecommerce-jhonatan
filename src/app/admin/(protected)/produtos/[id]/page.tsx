import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/db/products';
import { getAllCategories } from '@/lib/db/categories';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

const parsePackageContent = (raw: string): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return raw.split('\n').filter(Boolean);
  }
};

const parseOptionsMap = (raw: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(raw || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
  } catch {
    /* silent */
  }
  return {};
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getAllCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">{product.name}</h1>
        <p className="text-sm text-ink-500">Editando produto · SKU {product.sku}</p>
      </div>
      <ProductForm
        productId={product.id}
        saved={saved === '1'}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          fullDescription: product.fullDescription,
          price: product.price,
          oldPrice: product.oldPrice ?? null,
          installments: product.installments,
          sku: product.sku,
          brand: product.brand,
          stock: product.stock,
          status: product.status as 'ACTIVE' | 'DRAFT' | 'INACTIVE',
          featured: product.featured,
          badge: product.badge ?? '',
          categoryId: product.categoryId,
          warranty: product.warranty,
          packageContent: parsePackageContent(product.packageContent),
          benefits: product.benefits.map((b) => b.text),
          specifications: product.specifications.map((s) => ({ name: s.name, value: s.value })),
          faq: product.faq.map((f) => ({ question: f.question, answer: f.answer })),
          images: product.images.map((i) => ({ url: i.url, alt: i.alt })),
          metaTitle: product.metaTitle ?? '',
          metaDescription: product.metaDescription ?? '',
          variantOptions: product.variantOptions.map((o) => ({
            name: o.name,
            values: o.values.map((v) => ({
              value: v.value,
              imageUrl: (v as { imageUrl?: string | null }).imageUrl ?? null,
            })),
          })),
          variants: product.variants.map((v) => ({
            sku: v.sku,
            title: v.title,
            price: v.price,
            oldPrice: v.oldPrice ?? null,
            stock: v.stock,
            active: v.active,
            imageUrl: v.imageUrl ?? null,
            barcode: v.barcode ?? null,
            optionsMap: parseOptionsMap(v.optionsJson),
          })),
        }}
      />
    </div>
  );
}
