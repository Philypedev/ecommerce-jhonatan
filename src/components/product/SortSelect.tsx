'use client';

type Option = { value: string; label: string };

type Props = {
  name: string;
  defaultValue: string;
  options: readonly Option[];
  id?: string;
  className?: string;
};

/**
 * Select que submete o form pai automaticamente ao mudar a seleção.
 * Existe como client component porque server components não podem
 * receber event handlers via props (onChange, onClick, etc.).
 */
export const SortSelect = ({ name, defaultValue, options, id, className }: Props) => (
  <select
    id={id}
    name={name}
    defaultValue={defaultValue}
    onChange={(e) => e.currentTarget.form?.submit()}
    className={
      className ??
      'rounded-md border border-ink-300 bg-white px-3 py-2 text-sm font-medium text-ink-900 focus:border-brand-700 focus:outline-none'
    }
  >
    {options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))}
  </select>
);
