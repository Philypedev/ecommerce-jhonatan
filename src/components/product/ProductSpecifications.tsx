import type { Product } from '@/types';

/**
 * Cards de "Especificações", "Conteúdo da embalagem" e "Garantia".
 * Cada bloco só aparece se houver conteúdo cadastrado — evita cards vazios
 * na PDP de produtos simples.
 *
 * Layout: em desktop, especificações à esquerda (mais alto) e embalagem +
 * garantia empilhadas à direita. Em mobile, tudo empilha na ordem
 * Especificações → Embalagem → Garantia.
 */
export const ProductSpecifications = ({ product }: { product: Product }) => {
  const hasSpecs = product.specifications.length > 0;
  const hasBox = product.boxContents.length > 0;
  const hasWarranty = product.warranty.trim().length > 0;

  if (!hasSpecs && !hasBox && !hasWarranty) return null;

  return (
    <section aria-labelledby="specs-title" className="grid gap-8 md:grid-cols-2">
      {hasSpecs && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
          <h2 id="specs-title" className="text-lg font-bold text-ink-900">
            Especificações técnicas
          </h2>
          <dl className="mt-4 divide-y divide-ink-100">
            {product.specifications.map((s) => (
              <div key={s.label} className="grid grid-cols-2 gap-2 py-2 text-sm">
                <dt className="font-medium text-ink-500">{s.label}</dt>
                <dd className="text-right text-ink-900">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="space-y-6">
        {hasBox && (
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-ink-900">Conteúdo da embalagem</h3>
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              {product.boxContents.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-700" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasWarranty && (
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-lg font-bold text-ink-900">Garantia</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {product.warranty}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
