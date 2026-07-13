import { renderMarkdown } from '@/lib/markdown';

type Props = {
  title: string;
  subtitle?: string;
  content: string;
};

export const InstitutionalPage = ({ title, subtitle, content }: Props) => (
  <>
    <section className="bg-brand-950 text-white">
      <div className="container-x py-10">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-brand-100/85">{subtitle}</p>
        )}
      </div>
    </section>

    <section className="container-x py-12">
      <article className="rounded-2xl bg-white p-8 shadow-card">
        {renderMarkdown(content)}
      </article>
    </section>
  </>
);
