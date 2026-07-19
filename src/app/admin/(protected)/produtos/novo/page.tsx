import { getAllCategories } from '@/lib/db/categories';
import { ProductForm } from '@/components/admin/ProductForm';
import type { ProductInput } from '@/lib/validation/schemas';

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

  // Novo produto começa com status ACTIVE pré-selecionado — a intenção
  // primária é publicar. O botão "Salvar como rascunho" segue disponível
  // e força DRAFT no submit, então quem quer só um rascunho não precisa
  // trocar o radio antes de salvar. Se o admin mudar o radio para
  // "Rascunho" manualmente, a validação relaxa como sempre.
  //
  // Edição existente NÃO é afetada — /admin/produtos/[id] passa o status
  // salvo do banco em `initial.status`, que sobrescreve este default.
  const initial: Partial<ProductInput> = {
    status: 'ACTIVE',
    ...(preselectCategory ? { categoryId: preselectCategory } : {}),
  };

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
        initial={initial}
        saved={saved === '1'}
        savedAs={savedAs}
      />
    </div>
  );
}
