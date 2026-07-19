/**
 * Funções puras de reordenação usadas pelo grid Shopify-style de imagens
 * do produto (ProductImagesField). Ficam separadas do componente para
 * poderem ser testadas em Node (smoke suite) sem DOM.
 *
 * Regra da posição 0 = capa. Ao arrastar uma imagem para o slot 0 ou
 * clicar em "Definir como capa", ela vira a nova capa e as demais
 * escorregam preservando ordem relativa.
 */

/**
 * Move o item do índice `from` para a posição `to` do ARRAY JÁ COM O ITEM
 * REMOVIDO — semântica "insert-at" clássica (sortable-style). Escolhido
 * para nunca deixar arrastar-para-o-vizinho-imediato virar no-op: com
 * "adjust off-by-one" o admin arrastaria B pra cima de C e nada mudava;
 * aqui B cai depois de C exatamente como o hit-test do grid sugere.
 *
 * Índices fora do range são clampados; `from` inválido devolve cópia crua.
 */
export const moveTo = <T>(list: T[], from: number, to: number): T[] => {
  if (from === to) return list.slice();
  if (from < 0 || from >= list.length) return list.slice();
  const clampedTo = Math.max(0, Math.min(list.length - 1, to));
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(clampedTo, 0, item);
  return next;
};

/**
 * Promove o índice `idx` para a posição 0 (capa). Preserva ordem
 * relativa dos demais.
 */
export const promoteToCover = <T>(list: T[], idx: number): T[] => {
  if (idx <= 0 || idx >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(idx, 1);
  next.unshift(item);
  return next;
};

/** Índice do item após um moveTo — útil pra sincronizar `selectedIdx`. */
export const adjustedTargetAfterMove = (
  from: number,
  to: number,
  length: number,
): number => {
  if (from === to) return from;
  return Math.max(0, Math.min(length - 1, to));
};
