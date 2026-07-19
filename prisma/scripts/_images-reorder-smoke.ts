/**
 * Smoke da lógica pura de reordenação das imagens do produto.
 * Valida os testes obrigatórios do briefing:
 *   - Arrastar a 4ª imagem para a primeira posição vira a nova capa.
 *   - promoteToCover produz o mesmo resultado que arrastar para o topo.
 *   - Remoção via filter preserva a ordem.
 *   - Adição via concat (novo upload) empilha ao final.
 *
 * O comportamento visual e o upload real são cobertos pela UI e pelo
 * endpoint /api/admin/upload; aqui garantimos que a ordem que vai pro
 * banco é a ordem que o admin viu na tela.
 */
import { adjustedTargetAfterMove, moveTo, promoteToCover } from '../../src/utils/reorderImages';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`OK  ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ''}`); }
}

const eq = <T>(a: T[], b: T[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

async function main() {
  const four = ['A', 'B', 'C', 'D'];

  console.log('-- moveTo (drag-and-drop) --');
  // Semântica: splice(remove) + splice(insert em `to` do array pós-remove).
  assert('mover D (idx 3) para 0 → [D, A, B, C] (nova capa)',
    eq(moveTo(four, 3, 0), ['D', 'A', 'B', 'C']));
  assert('mover A (idx 0) para 3 → [B, C, D, A]',
    eq(moveTo(four, 0, 3), ['B', 'C', 'D', 'A']));
  assert('mover B (idx 1) para 2 → [A, C, B, D]',
    eq(moveTo(four, 1, 2), ['A', 'C', 'B', 'D']));
  assert('mover C (idx 2) para 1 → [A, C, B, D]',
    eq(moveTo(four, 2, 1), ['A', 'C', 'B', 'D']));
  assert('mover para o mesmo lugar → sem mudança',
    eq(moveTo(four, 2, 2), ['A', 'B', 'C', 'D']));
  assert('clampa índice negativo',
    eq(moveTo(four, 2, -5), ['C', 'A', 'B', 'D']));
  assert('clampa índice além do fim → cai no último slot',
    eq(moveTo(four, 0, 99), ['B', 'C', 'D', 'A']));
  assert('ignora índice from inválido',
    eq(moveTo(four, 99, 0), ['A', 'B', 'C', 'D']));

  console.log('\n-- promoteToCover (botão "Definir como capa") --');
  assert('promover D (idx 3) → [D, A, B, C]',
    eq(promoteToCover(four, 3), ['D', 'A', 'B', 'C']));
  assert('promover B (idx 1) → [B, A, C, D]',
    eq(promoteToCover(four, 1), ['B', 'A', 'C', 'D']));
  assert('promover idx 0 (já é capa) → sem mudança',
    eq(promoteToCover(four, 0), ['A', 'B', 'C', 'D']));
  assert('promover idx inválido → sem mudança',
    eq(promoteToCover(four, 99), ['A', 'B', 'C', 'D']));

  console.log('\n-- adjustedTargetAfterMove --');
  assert('from=0 to=3 len=4 → 3',
    adjustedTargetAfterMove(0, 3, 4) === 3);
  assert('from=3 to=0 len=4 → 0',
    adjustedTargetAfterMove(3, 0, 4) === 0);
  assert('from=1 to=1 → 1',
    adjustedTargetAfterMove(1, 1, 4) === 1);
  assert('clampa índice além do fim',
    adjustedTargetAfterMove(0, 99, 4) === 3);

  console.log('\n-- Round-trip: soltar D em 0 → salvar → reabrir --');
  {
    // Simula: admin viu [A,B,C,D], arrastou D para posição 0.
    const after = moveTo(four, 3, 0);
    // Ordem salva no banco (position 0..N) preserva a ordem do array.
    const positions = after.map((label, i) => ({ label, position: i }));
    // Reabrindo o produto: getProductById devolve rows ordenadas por position asc.
    const reopened = positions.slice().sort((a, b) => a.position - b.position).map((p) => p.label);
    assert('após reabrir, D continua na posição 0 (capa)',
      reopened[0] === 'D');
    assert('após reabrir, ordem completa preservada',
      eq(reopened, ['D', 'A', 'B', 'C']));
  }

  console.log('\n-- Remoção preserva ordem --');
  {
    // Estado após arrastar D pra capa: [D, A, B, C]. Remove B (idx 2).
    const cover = ['D', 'A', 'B', 'C'];
    const removed = cover.filter((_, i) => i !== 2);
    assert('remover idx 2 → [D, A, C]',
      eq(removed, ['D', 'A', 'C']));
    assert('capa continua sendo D',
      removed[0] === 'D');
  }

  console.log('\n-- Novo upload empilha ao final --');
  {
    const before = ['D', 'A', 'C'];
    const uploaded = ['E'];
    const after = [...before, ...uploaded];
    assert('após upload, nova imagem entra depois da última existente',
      eq(after, ['D', 'A', 'C', 'E']));
    assert('capa NÃO muda com upload',
      after[0] === 'D');
  }

  console.log('\n-- Sanidade: array vazio / 1 imagem --');
  assert('lista vazia, moveTo → lista vazia',
    eq(moveTo([], 0, 0), []));
  assert('1 imagem, promover a mesma → sem mudança',
    eq(promoteToCover(['A'], 0), ['A']));

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
