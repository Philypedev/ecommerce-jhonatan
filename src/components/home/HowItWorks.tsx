import type { HowItWorksStep } from '@/lib/homeContent';

export const HowItWorks = ({ steps }: { steps: HowItWorksStep[] }) => {
  if (steps.length === 0) return null;
  return (
    <section className="container-x py-14 md:py-20" aria-labelledby="como-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">Como funciona</p>
        <h2 id="como-title" className="mt-1 text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">
          Comprar é simples, rápido e seguro
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          Combinamos a praticidade do e-commerce com a confiança de um atendimento humano.
        </p>
      </div>

      <ol className="mt-10 grid gap-4 md:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-900 text-sm font-bold text-white">
              {i + 1}
            </span>
            <h3 className="mt-4 text-sm font-bold text-ink-900">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};
