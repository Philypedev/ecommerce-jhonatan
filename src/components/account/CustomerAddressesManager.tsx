'use client';

import { useState, useTransition } from 'react';
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from '@/app/actions/customer-addresses';
import type { CustomerAddressInput } from '@/lib/validation/schemas';

type AddressRow = {
  id: string;
  label: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
};

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

const emptyForm: Omit<AddressRow, 'id'> = {
  label: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: 'SP',
  isDefault: false,
};

const formatCep = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
};

type Props = {
  initial: AddressRow[];
};

export const CustomerAddressesManager = ({ initial }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [form, setForm] = useState<Omit<AddressRow, 'id'>>(emptyForm);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const startCreate = () => {
    setEditingId(null);
    setError(null);
    setForm({ ...emptyForm, isDefault: initial.length === 0 });
    setShowForm(true);
  };

  const startEdit = (row: AddressRow) => {
    setEditingId(row.id);
    setError(null);
    const { id: _id, ...rest } = row;
    void _id;
    setForm(rest);
    setShowForm(true);
  };

  const cancel = () => {
    setEditingId(null);
    setError(null);
    setForm(emptyForm);
    if (initial.length > 0) setShowForm(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: CustomerAddressInput = {
      label: form.label,
      zipCode: form.zipCode.replace(/\D/g, ''),
      street: form.street,
      number: form.number,
      complement: form.complement,
      district: form.district,
      city: form.city,
      state: form.state as CustomerAddressInput['state'],
      isDefault: form.isDefault,
    };
    start(async () => {
      const res = editingId
        ? await updateAddressAction(editingId, payload)
        : await createAddressAction(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditingId(null);
      setForm(emptyForm);
      setShowForm(false);
    });
  };

  const remove = (id: string) => {
    if (!confirm('Remover este endereço? Essa ação não pode ser desfeita.')) return;
    setError(null);
    start(async () => {
      const res = await deleteAddressAction(id);
      if (!res.ok) setError(res.error);
    });
  };

  const makeDefault = (id: string) => {
    setError(null);
    start(async () => {
      const res = await setDefaultAddressAction(id);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {initial.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
          <p className="text-sm text-ink-700">Você ainda não tem endereços salvos.</p>
          <button
            type="button"
            onClick={startCreate}
            className="btn-primary mt-4 inline-flex"
          >
            Adicionar endereço
          </button>
        </div>
      )}

      {initial.length > 0 && (
        <ul className="space-y-3">
          {initial.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink-900">
                      {a.label || 'Endereço'}
                    </p>
                    {a.isDefault && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Padrão
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-700">
                    {a.street}, {a.number}
                    {a.complement ? ` — ${a.complement}` : ''}
                  </p>
                  <p className="text-xs text-ink-500">
                    {a.district ? `${a.district} · ` : ''}
                    {a.city}/{a.state} · CEP {formatCep(a.zipCode)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {!a.isDefault && (
                    <button
                      type="button"
                      onClick={() => makeDefault(a.id)}
                      disabled={pending}
                      className="rounded-md border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-100"
                    >
                      Tornar padrão
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    disabled={pending}
                    className="rounded-md border border-ink-200 px-2 py-1 text-[11px] font-semibold text-ink-700 hover:bg-ink-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    disabled={pending}
                    className="rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {initial.length > 0 && !showForm && (
        <button
          type="button"
          onClick={startCreate}
          className="btn-outline w-full"
        >
          Adicionar novo endereço
        </button>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
        >
          <h3 className="text-sm font-bold text-ink-900">
            {editingId ? 'Editar endereço' : 'Novo endereço'}
          </h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label">Apelido (opcional)</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => set('label', e.target.value)}
                placeholder='Ex.: "Casa", "Trabalho"'
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">CEP</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatCep(form.zipCode)}
                onChange={(e) => set('zipCode', e.target.value.replace(/\D/g, ''))}
                required
                maxLength={9}
                className="field-input"
                placeholder="00000-000"
              />
            </div>
            <div>
              <label className="field-label">Estado (UF)</label>
              <select
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
                className="field-input"
              >
                {UF_LIST.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="field-label">Rua</label>
              <input
                type="text"
                value={form.street}
                onChange={(e) => set('street', e.target.value)}
                required
                className="field-input"
                placeholder="Nome da rua"
              />
            </div>

            <div>
              <label className="field-label">Número</label>
              <input
                type="text"
                value={form.number}
                onChange={(e) => set('number', e.target.value)}
                required
                className="field-input"
                placeholder="123"
              />
            </div>
            <div>
              <label className="field-label">Complemento (opcional)</label>
              <input
                type="text"
                value={form.complement}
                onChange={(e) => set('complement', e.target.value)}
                className="field-input"
                placeholder="Apto, bloco…"
              />
            </div>

            <div>
              <label className="field-label">Bairro (opcional)</label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                required
                className="field-input"
              />
            </div>

            <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm hover:border-ink-300">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set('isDefault', e.target.checked)}
                className="h-4 w-4"
              />
              <span>Usar como endereço padrão no checkout</span>
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn-primary"
            >
              {pending ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Salvar endereço'}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="btn-outline"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
