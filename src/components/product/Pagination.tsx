import Link from 'next/link';

type Props = {
  basePath: string;
  query: Record<string, string | undefined>;
  page: number;
  totalPages: number;
};

const buildHref = (
  basePath: string,
  query: Record<string, string | undefined>,
  page: number,
): string => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v && k !== 'page') params.set(k, v);
  });
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};

export const Pagination = ({ basePath, query, page, totalPages }: Props) => {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? buildHref(basePath, query, page - 1) : null;
  const next = page < totalPages ? buildHref(basePath, query, page + 1) : null;

  // Janela compacta de páginas em volta da atual
  const windowSize = 2;
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - windowSize && i <= page + windowSize)
    ) {
      pages.push(i);
    }
  }

  return (
    <nav
      aria-label="Paginação"
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5 text-sm"
    >
      {prev ? (
        <Link
          href={prev}
          className="rounded-md border border-ink-300 bg-white px-3 py-2 font-semibold text-ink-900 hover:bg-ink-100"
        >
          ← Anterior
        </Link>
      ) : (
        <span className="rounded-md border border-ink-100 px-3 py-2 font-semibold text-ink-300">
          ← Anterior
        </span>
      )}

      <ul className="flex flex-wrap items-center gap-1.5">
        {pages.map((p, idx) => {
          const prevP = pages[idx - 1];
          const showEllipsis = prevP && p - prevP > 1;
          return (
            <li key={p} className="flex items-center gap-1.5">
              {showEllipsis && <span className="px-1 text-ink-500">…</span>}
              {p === page ? (
                <span
                  aria-current="page"
                  className="grid h-9 min-w-9 place-items-center rounded-md bg-brand-900 px-2 font-bold text-white"
                >
                  {p}
                </span>
              ) : (
                <Link
                  href={buildHref(basePath, query, p)}
                  className="grid h-9 min-w-9 place-items-center rounded-md border border-ink-300 bg-white px-2 font-semibold text-ink-900 hover:bg-ink-100"
                >
                  {p}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {next ? (
        <Link
          href={next}
          className="rounded-md border border-ink-300 bg-white px-3 py-2 font-semibold text-ink-900 hover:bg-ink-100"
        >
          Próxima →
        </Link>
      ) : (
        <span className="rounded-md border border-ink-100 px-3 py-2 font-semibold text-ink-300">
          Próxima →
        </span>
      )}
    </nav>
  );
};
