import Link from 'next/link';
import { getAllCategories } from '@/lib/db/categories';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string }>;
}) {
  const { categoryId } = await searchParams;
  const categories = await getAllCategories();

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-card">
        <h1 className="text-xl font-bold text-ink-900">Crie uma categoria antes</h1>
        <p className="mt-2 text-sm text-ink-500">Você precisa de pelo menos uma categoria para cadastrar produtos.</p>
        <Link href="/admin/categorias" className="btn-primary mt-5 inline-flex">Ir para categorias</Link>
      </div>
    );
  }

  const preselectCategory =
    categoryId && categories.some((c) => c.id === categoryId) ? categoryId : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Novo produto</h1>
        <p className="text-sm text-ink-500">Preencha as informações e publique no catálogo.</p>
      </div>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={preselectCategory ? { categoryId: preselectCategory } : undefined}
      />
    </div>
  );
}
