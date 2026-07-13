import { CheckIcon } from '@/components/ui/Icon';

/**
 * Card independente de "Benefícios" — antes vivia dentro do painel de compra
 * e roubava atenção da conversão. Renderiza `null` se o produto não tem
 * benefícios cadastrados (evita card vazio na PDP).
 */
export const ProductBenefits = ({ items }: { items: string[] }) => {
  const clean = items.filter((b) => b.trim().length > 0);
  if (clean.length === 0) return null;

  return (
    <section
      aria-labelledby="benefits-title"
      className="rounded-2xl border border-ink-100 bg-white p-6 shadow-card"
    >
      <h2 id="benefits-title" className="text-lg font-bold text-ink-900">
        Benefícios
      </h2>
      <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {clean.map((b) => (
          <li key={b} className="flex items-start gap-2 text-ink-700">
            <CheckIcon size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};
