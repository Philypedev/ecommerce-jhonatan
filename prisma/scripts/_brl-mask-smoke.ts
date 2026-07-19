/**
 * Smoke da máscara BRL — cobre exatamente os exemplos do briefing.
 *
 * Terminologia:
 *   live = comportamento onChange (durante digitação, mantém vírgula/decimais
 *          como usuário digitou; sem forçar ",00")
 *   blur = comportamento onBlur (fecha em 2 casas)
 *   parse = converter string BRL para Number (payload do banco)
 */
import {
  formatBRLCurrencyInput,
  formatBRLCurrencyBlur,
  parseBRLCurrencyToNumber,
  numberToBRLCurrencyDisplay,
} from '../../src/utils/brlCurrencyMask';
import { computeMargin } from '../../src/utils/margin';

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`OK  ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ''}`); }
}

const eqBlur = (input: string, wantDisplay: string, wantValue: number) => {
  const r = formatBRLCurrencyBlur(input);
  return r.display === wantDisplay && Math.abs(r.value - wantValue) < 0.001;
};

const eqLive = (input: string, wantDisplay: string, wantValue: number) => {
  const r = formatBRLCurrencyInput(input);
  return r.display === wantDisplay && Math.abs(r.value - wantValue) < 0.001;
};

async function main() {
  console.log('-- Blur: fecha em 2 casas (exemplos do briefing) --');
  assert('0 → 0,00',                eqBlur('0', '0,00', 0));
  assert('1 → 1,00',                eqBlur('1', '1,00', 1));
  assert('10 → 10,00',              eqBlur('10', '10,00', 10));
  assert('100 → 100,00',            eqBlur('100', '100,00', 100));
  assert('1000 → 1.000,00',         eqBlur('1000', '1.000,00', 1000));
  assert('10000 → 10.000,00',       eqBlur('10000', '10.000,00', 10000));
  assert('100000 → 100.000,00',     eqBlur('100000', '100.000,00', 100000));
  assert('1000000 → 1.000.000,00',  eqBlur('1000000', '1.000.000,00', 1000000));
  assert('2490 → 2.490,00',         eqBlur('2490', '2.490,00', 2490));
  assert('3990 → 3.990,00',         eqBlur('3990', '3.990,00', 3990));
  assert('100034 → 100.034,00',     eqBlur('100034', '100.034,00', 100034));
  assert('00333 → 333,00',          eqBlur('00333', '333,00', 333));
  assert('333,50 → 333,50',         eqBlur('333,50', '333,50', 333.5));
  assert('2490,90 → 2.490,90',      eqBlur('2490,90', '2.490,90', 2490.9));
  assert('333,5 → 333,50',          eqBlur('333,5', '333,50', 333.5));
  assert('vazio → vazio',           eqBlur('', '', 0));
  assert('só letra → vazio',        eqBlur('abc', '', 0));
  // Re-entrada: valor já formatado precisa ser idempotente.
  assert('"2.490,90" → "2.490,90"', eqBlur('2.490,90', '2.490,90', 2490.9));
  assert('"10.000,00" → "10.000,00"', eqBlur('10.000,00', '10.000,00', 10000));
  assert('"1.000.000,00" → "1.000.000,00"',
    eqBlur('1.000.000,00', '1.000.000,00', 1000000));

  console.log('\n-- Live: milhar em tempo real (BUG DO 10000 NÃO PODE VOLTAR) --');
  assert('digitando "1" → "1"',           eqLive('1', '1', 1));
  assert('digitando "10" → "10"',         eqLive('10', '10', 10));
  assert('digitando "100" → "100"',       eqLive('100', '100', 100));
  assert('digitando "1000" → "1.000"',    eqLive('1000', '1.000', 1000));
  assert('digitando "10000" → "10.000" (não pode virar "1,00")',
    eqLive('10000', '10.000', 10000));
  assert('digitando "100000" → "100.000"', eqLive('100000', '100.000', 100000));
  assert('digitando "1000000" → "1.000.000"',
    eqLive('1000000', '1.000.000', 1000000));
  assert('digitando "2490" → "2.490"',     eqLive('2490', '2.490', 2490));
  assert('digitando "3990" → "3.990"',     eqLive('3990', '3.990', 3990));
  assert('digitando "100034" → "100.034"', eqLive('100034', '100.034', 100034));
  assert('digitando "00333" → "333"',      eqLive('00333', '333', 333));
  assert('digitando "2490," → "2.490,"',   eqLive('2490,', '2.490,', 2490));
  assert('digitando "2490,9" → "2.490,9"', eqLive('2490,9', '2.490,9', 2490.9));
  assert('digitando "2490,90" → "2.490,90"', eqLive('2490,90', '2.490,90', 2490.9));
  assert('digitando "," antes de int → "0,"', eqLive(',', '0,', 0));
  assert('vazio → vazio',                  eqLive('', '', 0));
  assert('rejeita 3ª casa decimal',        eqLive('333,509', '333,50', 333.5));
  // Ponto SEMPRE é milhar (fix do bug). Simula sequência real do browser:
  // input tinha "1.000" e user digitou "0" → browser passa "1.0000"; live
  // precisa devolver "10.000" e NUNCA "1,00".
  assert('BUG REPRO: "1.0000" (usuário digitou 0 no fim de "1.000") → "10.000"',
    eqLive('1.0000', '10.000', 10000));
  assert('"10.0000" → "100.000"', eqLive('10.0000', '100.000', 100000));
  assert('colar "10.000" → "10.000"', eqLive('10.000', '10.000', 10000));
  assert('colar "10.000,90" → "10.000,90"', eqLive('10.000,90', '10.000,90', 10000.9));
  assert('colar "1.000.000" → "1.000.000"', eqLive('1.000.000', '1.000.000', 1000000));

  console.log('\n-- parseBRLCurrencyToNumber (payload) --');
  assert('"1.000,00" → 1000', parseBRLCurrencyToNumber('1.000,00') === 1000);
  assert('"10.000,00" → 10000', parseBRLCurrencyToNumber('10.000,00') === 10000);
  assert('"100.000,00" → 100000', parseBRLCurrencyToNumber('100.000,00') === 100000);
  assert('"2.490,90" → 2490.9',
    Math.abs(parseBRLCurrencyToNumber('2.490,90') - 2490.9) < 1e-9);
  assert('"333,50" → 333.5',
    Math.abs(parseBRLCurrencyToNumber('333,50') - 333.5) < 1e-9);
  assert('"2.490,00" → 2490', parseBRLCurrencyToNumber('2.490,00') === 2490);
  assert('"100.034,00" → 100034', parseBRLCurrencyToNumber('100.034,00') === 100034);
  assert('"1.000.000,00" → 1000000',
    parseBRLCurrencyToNumber('1.000.000,00') === 1000000);
  assert('"" → 0', parseBRLCurrencyToNumber('') === 0);

  console.log('\n-- numberToBRLCurrencyDisplay (hidratação do form) --');
  assert('2490 → "2.490,00"',    numberToBRLCurrencyDisplay(2490) === '2.490,00');
  assert('10000 → "10.000,00"',  numberToBRLCurrencyDisplay(10000) === '10.000,00');
  assert('333.5 → "333,50"',     numberToBRLCurrencyDisplay(333.5) === '333,50');
  assert('null → ""',            numberToBRLCurrencyDisplay(null) === '');
  assert('undefined → ""',       numberToBRLCurrencyDisplay(undefined) === '');
  assert('0 → "0,00"',           numberToBRLCurrencyDisplay(0) === '0,00');

  console.log('\n-- Margem encadeada com máscara --');
  {
    const price = parseBRLCurrencyToNumber('2.490,00');
    const cost = parseBRLCurrencyToNumber('2.000,00');
    const m = computeMargin(price, cost);
    assert('preço 2.490 · custo 2.000 → lucro 490',
      m.profit != null && Math.abs(m.profit - 490) < 0.001);
    assert('preço 2.490 · custo 2.000 → margem 19,68%',
      m.marginPct != null && Math.abs(m.marginPct - 19.6787) < 0.01,
      `got=${m.marginPct}`);
  }
  {
    // Cenário exato do briefing: 3990 / 2642,57 → lucro 1.347,43 · margem ~33,77%
    const price = parseBRLCurrencyToNumber('3.990,00');
    const cost = parseBRLCurrencyToNumber('2.642,57');
    const m = computeMargin(price, cost);
    assert('preço 3.990 · custo 2.642,57 → lucro 1.347,43',
      m.profit != null && Math.abs(m.profit - 1347.43) < 0.005,
      `got=${m.profit}`);
    assert('preço 3.990 · custo 2.642,57 → margem ~33,77%',
      m.marginPct != null && Math.abs(m.marginPct - 33.7702) < 0.01,
      `got=${m.marginPct}`);
    // Formatação final na UI do resumo
    assert('Lucro formatado → "1.347,43"',
      numberToBRLCurrencyDisplay(m.profit ?? 0) === '1.347,43');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
