import { prisma } from '@/lib/prisma';

export type OrderStatus = 'NOVO' | 'EM_ATENDIMENTO' | 'CONFIRMADO' | 'CANCELADO' | 'FECHADO';

export type OrderFilters = {
  status?: string;
  from?: Date;
  to?: Date;
  q?: string;
};

const buildWhere = (filters: OrderFilters, opts: { includeStatus?: boolean } = {}) => {
  const q = filters.q?.trim();
  const dateGte = filters.from;
  const dateLte = filters.to;
  return {
    ...(opts.includeStatus && filters.status ? { status: filters.status } : {}),
    ...(dateGte || dateLte
      ? { createdAt: { ...(dateGte ? { gte: dateGte } : {}), ...(dateLte ? { lte: dateLte } : {}) } }
      : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q } },
            { customerPhone: { contains: q } },
            { id: { startsWith: q } },
          ],
        }
      : {}),
  };
};

export const listLeadOrders = async (filters: OrderFilters = {}) =>
  prisma.leadOrder.findMany({
    where: buildWhere(filters, { includeStatus: true }),
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });

export const getLeadOrder = async (id: string) =>
  prisma.leadOrder.findUnique({ where: { id }, include: { items: true } });

export const countOrdersByStatus = async (status: string) =>
  prisma.leadOrder.count({ where: { status } });

/**
 * Contagem por status respeitando os filtros de busca/data (mas NÃO o filtro
 * de status, para que cada chip mostre "quantos existem naquele status dado o
 * mesmo escopo de busca e período").
 */
export const countOrdersPerStatus = async (
  filters: OrderFilters,
): Promise<Record<string, number>> => {
  const grouped = await prisma.leadOrder.groupBy({
    by: ['status'],
    where: buildWhere(filters, { includeStatus: false }),
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const row of grouped) map[row.status] = row._count._all;
  return map;
};

/**
 * Métricas de topo. `newToday` e `estimatedTodayValue` são sempre "hoje";
 * `filteredEstimatedValue` respeita o período filtrado (ou "hoje" quando não
 * há filtro de data).
 */
export const getOrderStats = async (
  filters: OrderFilters,
): Promise<{
  newToday: number;
  inProgress: number;
  closed: number;
  filteredEstimatedValue: number;
  filteredEstimatedLabel: 'hoje' | 'período';
}> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const hasDateFilter = !!filters.from || !!filters.to;

  const [newToday, inProgress, closed, filteredAgg] = await Promise.all([
    prisma.leadOrder.count({
      where: { status: 'NOVO', createdAt: { gte: startOfDay } },
    }),
    prisma.leadOrder.count({ where: { status: 'EM_ATENDIMENTO' } }),
    prisma.leadOrder.count({ where: { status: 'FECHADO' } }),
    prisma.leadOrder.aggregate({
      _sum: { total: true },
      where: hasDateFilter
        ? buildWhere(filters, { includeStatus: false })
        : { createdAt: { gte: startOfDay } },
    }),
  ]);

  return {
    newToday,
    inProgress,
    closed,
    filteredEstimatedValue: filteredAgg._sum.total ?? 0,
    filteredEstimatedLabel: hasDateFilter ? 'período' : 'hoje',
  };
};
