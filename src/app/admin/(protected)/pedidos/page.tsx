import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { countOrdersPerStatus, getOrderStats, listLeadOrders } from '@/lib/db/orders';
import { formatCurrency } from '@/utils/formatCurrency';

export const dynamic = 'force-dynamic';

// ───────────────────────────── labels/estilos ─────────────────────────────

const statusStyle: Record<string, { badge: string; dot: string; label: string }> = {
  NOVO:            { badge: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',       label: 'Novo' },
  EM_ATENDIMENTO:  { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',      label: 'Em atendimento' },
  CONFIRMADO:      { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500',    label: 'Confirmado' },
  CANCELADO:       { badge: 'bg-rose-100 text-rose-700',       dot: 'bg-rose-500',       label: 'Cancelado' },
  FECHADO:         { badge: 'bg-emerald-800/10 text-emerald-900', dot: 'bg-emerald-800', label: 'Fechado' },
};

const paymentLabels: Record<string, string> = {
  pix: 'PIX',
  'cartao-credito': 'Cartão de Crédito',
  'cartao-debito': 'Cartão de Débito',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
  'a-combinar': 'A combinar',
};

const STATUS_ORDER = ['NOVO', 'EM_ATENDIMENTO', 'CONFIRMADO', 'CANCELADO', 'FECHADO'] as const;

// ───────────────────────────── helpers ─────────────────────────────

const toDate = (v?: string): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : undefined;
};

const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildQuery = (params: Record<string, string | undefined | null>): string => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

const buildCustomerWaLink = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const intl = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${intl}`;
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

// ───────────────────────────── página ─────────────────────────────

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const from = toDate(sp.from);
  let to = toDate(sp.to);
  if (to) {
    to = new Date(to);
    to.setHours(23, 59, 59, 999);
  }

  const filters = { status: sp.status, from, to, q: sp.q };

  const [orders, stats, statusCounts, totalOrdersInDb] = await Promise.all([
    listLeadOrders(filters),
    getOrderStats({ status: sp.status, from, to, q: sp.q }),
    countOrdersPerStatus({ status: sp.status, from, to, q: sp.q }),
    prisma.leadOrder.count(),
  ]);

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const hasAnyOrder = totalOrdersInDb > 0;

  // ───────── períodos rápidos (Hoje / 7 dias / Este mês / Todos) ─────────
  const now = new Date();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const start7d = new Date(now); start7d.setDate(start7d.getDate() - 6); start7d.setHours(0, 0, 0, 0);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayYmd = ymd(now);

  const quickPeriods: { key: string; label: string; from?: string; to?: string }[] = [
    { key: 'hoje', label: 'Hoje', from: todayYmd, to: todayYmd },
    { key: '7d',   label: 'Últimos 7 dias', from: ymd(start7d), to: todayYmd },
    { key: 'mes',  label: 'Este mês', from: ymd(startMonth), to: todayYmd },
    { key: 'todos',label: 'Todos' /* sem from/to */ },
  ];

  const isPeriodActive = (p: typeof quickPeriods[number]) => {
    if (p.key === 'todos') return !sp.from && !sp.to;
    return sp.from === p.from && sp.to === p.to;
  };

  // ───────── URLs base para chips e períodos preservarem outros filtros ─────────
  const preserveBase = { q: sp.q, from: sp.from, to: sp.to };

  return (
    <div className="space-y-6">
      {/* ─── Cabeçalho ─── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 md:text-3xl">Pedidos</h1>
        <p className="mt-1 text-sm text-ink-500">
          Acompanhe os pedidos enviados pelo site e organize o atendimento pelo WhatsApp.
        </p>
      </div>

      {/* ─── Cards de resumo ─── */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Novos hoje" value={stats.newToday} hint="Aguardando primeiro contato" tone={stats.newToday > 0 ? 'warning' : undefined} />
        <StatCard label="Em atendimento" value={stats.inProgress} hint="Você já iniciou a conversa" />
        <StatCard label="Fechados" value={stats.closed} hint="Total histórico" tone={stats.closed > 0 ? 'success' : undefined} />
        <StatCard
          label="Valor estimado"
          value={formatCurrency(stats.filteredEstimatedValue)}
          hint={stats.filteredEstimatedLabel === 'hoje' ? 'Soma dos pedidos de hoje' : 'Soma dos pedidos no período filtrado'}
        />
      </section>

      {/* ─── Períodos rápidos ─── */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Período:</span>
        {quickPeriods.map((p) => {
          const active = isPeriodActive(p);
          const href = `/admin/pedidos${buildQuery({ status: sp.status, q: sp.q, from: p.from, to: p.to })}`;
          return (
            <Link
              key={p.key}
              href={href}
              className={`badge ${active ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
            >
              {p.label}
            </Link>
          );
        })}
      </section>

      {/* ─── Busca + datas ─── */}
      <form
        method="get"
        action="/admin/pedidos"
        className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card"
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="q" className="field-label">Buscar</label>
            <input
              id="q"
              name="q"
              defaultValue={sp.q || ''}
              placeholder="Nome, telefone ou código do pedido"
              className="field-input h-10"
            />
          </div>
          <div>
            <label htmlFor="from" className="field-label">De</label>
            <input id="from" type="date" name="from" defaultValue={sp.from || ''} className="field-input h-10" />
          </div>
          <div>
            <label htmlFor="to" className="field-label">Até</label>
            <input id="to" type="date" name="to" defaultValue={sp.to || ''} className="field-input h-10" />
          </div>
        </div>
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary">Filtrar</button>
          <Link href="/admin/pedidos" className="btn-ghost text-sm">Limpar filtros</Link>
          <p className="ml-auto text-xs text-ink-500">
            Atualize o status conforme o atendimento evoluir pelo WhatsApp.
          </p>
        </div>
      </form>

      {/* ─── Chips de status com contagem ─── */}
      <section className="flex flex-wrap gap-2">
        <Link
          href={`/admin/pedidos${buildQuery(preserveBase)}`}
          className={`badge ${!sp.status ? 'bg-brand-900 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'}`}
        >
          Todos ({totalCount})
        </Link>
        {STATUS_ORDER.map((s) => {
          const style = statusStyle[s];
          const count = statusCounts[s] ?? 0;
          const href = `/admin/pedidos${buildQuery({ ...preserveBase, status: s })}`;
          const active = sp.status === s;
          return (
            <Link
              key={s}
              href={href}
              className={`badge ${active ? 'bg-brand-900 text-white' : style.badge}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {style.label} ({count})
            </Link>
          );
        })}
      </section>

      {/* ─── Empty state ─── */}
      {orders.length === 0 ? (
        hasAnyOrder ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhum pedido encontrado com esses filtros.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Tente limpar os filtros ou alterar o período/status selecionado.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <Link href="/admin/pedidos" className="btn-outline">Limpar filtros</Link>
              <Link href="/admin/pedidos" className="btn-primary">Ver todos os pedidos</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center shadow-card">
            <h2 className="text-base font-bold text-ink-900">Nenhum pedido recebido ainda.</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
              Faça um teste no checkout para validar o fluxo de compra pelo WhatsApp.
            </p>
            <div className="mt-5 inline-flex flex-wrap justify-center gap-2">
              <Link href="/" target="_blank" rel="noreferrer" className="btn-outline">Abrir loja</Link>
              <Link href="/checkout" target="_blank" rel="noreferrer" className="btn-primary">Testar checkout</Link>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Tabela — desktop */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card">
            <table className="min-w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-100/40 text-left text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-4 py-3">Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Itens</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {orders.map((o) => {
                  const st = statusStyle[o.status] ?? { badge: 'bg-ink-100 text-ink-700', dot: 'bg-ink-500', label: o.status };
                  const waLink = buildCustomerWaLink(o.customerPhone);
                  const firstItem = o.items[0];
                  const restCount = o.items.length - 1;
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-bold text-ink-900">#{shortId(o.id)}</p>
                        <p className="mt-0.5 text-[11px] text-ink-500">
                          {new Intl.DateTimeFormat('pt-BR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          }).format(o.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-900">{o.customerName}</p>
                        <p className="text-xs text-ink-500">{o.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        <p className="font-semibold">{o.items.length}</p>
                        {firstItem && (
                          <p className="max-w-[200px] truncate text-xs text-ink-500">
                            {firstItem.productName}{restCount > 0 ? ` +${restCount}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-700">
                        {paymentLabels[o.paymentMethod] ?? o.paymentMethod}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(o.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${st.badge}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/admin/pedidos/${o.id}`}
                            className="rounded-md border border-ink-300 bg-white px-2.5 py-1 text-xs font-semibold text-ink-900 hover:bg-ink-100"
                          >
                            Ver detalhes
                          </Link>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <ul className="grid gap-3 md:hidden">
            {orders.map((o) => {
              const st = statusStyle[o.status] ?? { badge: 'bg-ink-100 text-ink-700', dot: 'bg-ink-500', label: o.status };
              const waLink = buildCustomerWaLink(o.customerPhone);
              const firstItem = o.items[0];
              const restCount = o.items.length - 1;
              return (
                <li key={o.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-ink-900">#{shortId(o.id)}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        {new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        }).format(o.createdAt)}
                      </p>
                    </div>
                    <span className={`badge ${st.badge}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="font-medium text-ink-900">{o.customerName}</p>
                    <p className="text-xs text-ink-500">{o.customerPhone}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <div className="text-xs text-ink-500">
                      <p><span className="font-semibold text-ink-700">{o.items.length}</span> {o.items.length === 1 ? 'item' : 'itens'}</p>
                      {firstItem && (
                        <p className="max-w-[220px] truncate">
                          {firstItem.productName}{restCount > 0 ? ` +${restCount}` : ''}
                        </p>
                      )}
                      <p className="mt-1">{paymentLabels[o.paymentMethod] ?? o.paymentMethod}</p>
                    </div>
                    <p className="text-right text-lg font-extrabold text-ink-900">{formatCurrency(o.total)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="flex-1 rounded-md border border-ink-300 bg-white px-3 py-2 text-center text-xs font-semibold text-ink-900 hover:bg-ink-100"
                    >
                      Ver detalhes
                    </Link>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

// ────────────────────────── componente auxiliar ──────────────────────────

const StatCard = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'warning' | 'success';
}) => (
  <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
      {tone === 'warning' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-amber-500" />}
      {tone === 'success' && <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />}
      {label}
    </p>
    <p className="mt-2 text-3xl font-extrabold text-ink-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
  </div>
);
