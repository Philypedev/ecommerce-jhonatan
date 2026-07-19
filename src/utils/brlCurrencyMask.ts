/**
 * Máscara de moeda brasileira para inputs do admin (preço/preço antigo/custo).
 *
 * Comportamento pedido pelo briefing:
 *   - digitar 0     → 0,00
 *   - digitar 10    → 10,00
 *   - digitar 1000  → 1.000,00
 *   - digitar 2490  → 2.490,00
 *   - digitar 100034 → 100.034,00
 *   - digitar 333,50 → 333,50
 *   - digitar 00333 → 333,00
 *
 * NÃO é máscara de "centavos automáticos" (onde 1000 viraria 10,00) — só
 * há centavos quando o usuário digita a vírgula.
 *
 * Estratégia:
 *   - `formatBRLCurrencyInput` roda em cada keystroke: formata milhar e
 *     preserva a vírgula/dígitos decimais como o usuário está digitando
 *     (ex.: "2490," aparece como "2.490,"; "2490,9" como "2.490,9").
 *   - `formatBRLCurrencyBlur` roda no blur: garante 2 casas decimais
 *     (ex.: "2.490" vira "2.490,00", "333,5" vira "333,50").
 *   - `parseBRLCurrencyToNumber` converte a string exibida (com pontos de
 *     milhar e vírgula decimal) para Number — é o que vai pro banco.
 *
 * Todas devolvem `{ display, value }` para o ProductForm poder atualizar
 * o input controlado e o `data.price` no mesmo callback.
 */

export type CurrencyMaskResult = { display: string; value: number };

const stripLeadingZeros = (digits: string): string =>
  digits.replace(/^0+(?=\d)/, '');

const insertThousands = (digits: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Formatação em tempo real (onChange). Mantém a vírgula/decimais em progresso
 * — não força ",00" enquanto digita, pra não brigar com o cursor.
 *
 * ⚠ Regra crítica: PONTO é sempre separador visual de milhar. Nunca é decimal.
 * Isso é o que garante que digitar "0" no final de "1.000" (input do browser
 * chega como "1.0000") vire "10.000" e não "1,00". Só a vírgula sinaliza que
 * o que vem depois é a parte decimal.
 */
export const formatBRLCurrencyInput = (raw: string): CurrencyMaskResult => {
  if (raw == null || raw === '') return { display: '', value: 0 };

  // Primeiro passo: strip TODOS os pontos (milhar). Depois removemos qualquer
  // caractere que não seja dígito ou vírgula.
  const s = String(raw).replace(/\./g, '').replace(/[^0-9,]/g, '');

  // Só a primeira vírgula conta como decimal; ignora vírgulas extras.
  const firstComma = s.indexOf(',');
  if (firstComma !== -1) {
    const normalized =
      s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '');
    const [intRaw, decRaw = ''] = normalized.split(',');
    const decDigits = decRaw.slice(0, 2);
    const intDigits = stripLeadingZeros(intRaw);
    const intDisplayable = intDigits === '' ? '0' : intDigits;
    const intFormatted = insertThousands(intDisplayable);
    const display = `${intFormatted},${decDigits}`;
    const value = Number(`${intDisplayable}.${decDigits || '0'}`);
    return { display, value: Number.isFinite(value) ? value : 0 };
  }

  // Sem vírgula: parte inteira apenas, com milhar.
  const intDigits = stripLeadingZeros(s);
  if (intDigits === '') return { display: '', value: 0 };
  const display = insertThousands(intDigits);
  const value = Number(intDigits);
  return { display, value: Number.isFinite(value) ? value : 0 };
};

/**
 * Formatação no blur (fecha o número em 2 casas decimais).
 * "2.490" → "2.490,00"; "333,5" → "333,50"; "" continua vazio (permite
 * limpar o campo em vez de forçar "0,00").
 */
export const formatBRLCurrencyBlur = (raw: string): CurrencyMaskResult => {
  const live = formatBRLCurrencyInput(raw);
  if (live.display === '' && live.value === 0) return { display: '', value: 0 };
  const display = live.value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return { display, value: live.value };
};

/**
 * Converte string com máscara BRL ("1.234,56") em Number (1234.56).
 * Aceita entrada crua também (ex.: número puro, ponto como decimal).
 */
export const parseBRLCurrencyToNumber = (raw: string): number => {
  if (raw == null || raw === '') return 0;
  const s = String(raw)
    .replace(/[^0-9,.]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Formata um Number para a máscara BRL usada na inicialização do input
 * quando o form abre em modo de edição (ex.: `2490` → "2.490,00"). Vazio
 * quando o valor é null/undefined/0-sem-preço.
 */
export const numberToBRLCurrencyDisplay = (n: number | null | undefined): string => {
  if (n == null) return '';
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
