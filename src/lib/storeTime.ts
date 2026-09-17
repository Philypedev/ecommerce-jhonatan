/**
 * "Hoje" para as métricas do admin precisa ser o dia civil em
 * America/Sao_Paulo, não o horário local do processo Node (que em produção
 * roda em UTC dentro do container). Um pedido feito às 21h em Brasília cai
 * às 00h UTC do dia seguinte — se comparássemos com `new Date().setHours(0,0,0,0)`
 * no servidor, esse pedido apareceria como "de amanhã".
 *
 * O Brasil não usa mais horário de verão desde 2019, então o offset de
 * America/Sao_Paulo é sempre -03:00 — não precisa de biblioteca de timezone.
 */

const STORE_TIME_ZONE_OFFSET = '-03:00';

const storeDateParts = (reference: Date): { year: string; month: string; day: string } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
};

/** Início (00:00:00) do dia civil de `reference` em America/Sao_Paulo, como instante UTC. */
export const startOfStoreDay = (reference: Date = new Date()): Date => {
  const { year, month, day } = storeDateParts(reference);
  return new Date(`${year}-${month}-${day}T00:00:00.000${STORE_TIME_ZONE_OFFSET}`);
};

/** Fim (23:59:59.999) do dia civil de `reference` em America/Sao_Paulo, como instante UTC. */
export const endOfStoreDay = (reference: Date = new Date()): Date => {
  const { year, month, day } = storeDateParts(reference);
  return new Date(`${year}-${month}-${day}T23:59:59.999${STORE_TIME_ZONE_OFFSET}`);
};
