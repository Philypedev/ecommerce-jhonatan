import { HomeIcon } from './HomeIcon';
import type { TrustCard } from '@/lib/homeContent';

export const TrustSection = ({ items }: { items: TrustCard[] }) => {
  if (items.length === 0) return null;
  return (
    <section className="bg-ink-100/60 py-14 md:py-20" aria-labelledby="confianca-title">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Por que comprar com a gente
          </p>
          <h2 id="confianca-title" className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
            Segurança, suporte e procedência em cada pedido
          </h2>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.title} className="rounded-2xl bg-white p-5 shadow-card">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <HomeIcon name={item.icon} size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
