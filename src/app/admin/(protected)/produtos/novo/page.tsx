import { getAllCategories } from '@/lib/db/categories';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; saved?: string; as?: string }>;
}) {
  const { categoryId, saved, as } = await searchParams;
  const categories = await getAllCategories();

  // Não bloqueamos mais quando não há categorias — rascunho aceita categoryId
  // vazio. Se o admin publicar sem categoria a Zod (superRefine) barra e o
  // form mostra "Para publicar, escolha uma coleção".

  const preselectCategory =
    categoryId && categories.some((c) => c.id === categoryId) ? categoryId : '';

  const savedAs =
    as === 'draft' || as === 'active' || as === 'inactive' ? as : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Novo produto</h1>
        <p className="text-sm text-ink-500">
          Salve como rascunho a qualquer momento — a validação completa só é
          aplicada ao publicar.
        </p>
      </div>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={preselectCategory ? { categoryId: preselectCategory } : undefined}
        saved={saved === '1'}
        savedAs={savedAs}
      />
    </div>
  );
}
