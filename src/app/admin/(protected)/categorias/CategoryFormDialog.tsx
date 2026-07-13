'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createCategoryAction, updateCategoryAction } from '@/app/actions/categories';
import { slugify } from '@/lib/slug';
import type { CategoryInput } from '@/lib/validation/schemas';
import { ImageUploader } from '@/components/admin/ImageUploader';

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
  imageUrl: string | null;
  imageMobileUrl: string | null;
  status: string;
  position: number;
  highlight: boolean;
  showInMenu: boolean;
  showOnHome: boolean;
  showInFooter: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
};

type Props =
  | { mode: 'new'; category?: undefined; productCount?: undefined }
  | { mode: 'edit'; category: CategoryRecord; productCount: number };

const iconOptions = [
  'luggage',
  'backpack',
  'organizer',
  'accessories',
  'electronics',
  'plug',
  'tag',
];

const SwitchRow = ({
  label,
  helper,
  checked,
  onChange,
}: {
  label: string;
  helper: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-ink-100 bg-white p-3 transition-colors hover:border-ink-300">
    <span>
      <span className="block text-sm font-semibold text-ink-900">{label}</span>
      <span className="block text-xs text-ink-500">{helper}</span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 accent-brand-900"
    />
  </label>
);

export const CategoryFormDialog = (props: Props) => {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initial: CategoryInput =
    props.mode === 'edit'
      ? {
          name: props.category.name,
          slug: props.category.slug,
          description: props.category.description,
          longDescription: props.category.longDescription,
          icon: props.category.icon,
          imageUrl: props.category.imageUrl,
          imageMobileUrl: props.category.imageMobileUrl,
          status: props.category.status as 'ACTIVE' | 'INACTIVE',
          position: props.category.position,
          highlight: props.category.highlight,
          showInMenu: props.category.showInMenu,
          showOnHome: props.category.showOnHome,
          showInFooter: props.category.showInFooter,
          metaTitle: props.category.metaTitle ?? '',
          metaDescription: props.category.metaDescription ?? '',
        }
      : {
          name: '',
          slug: '',
          description: '',
          longDescription: '',
          icon: 'tag',
          imageUrl: null,
          imageMobileUrl: null,
          status: 'ACTIVE',
          position: 0,
          highlight: false,
          showInMenu: true,
          showOnHome: true,
          showInFooter: true,
          metaTitle: '',
          metaDescription: '',
        };

  const [data, setData] = useState<CategoryInput>(initial);
  const [slugTouched, setSlugTouched] = useState(props.mode === 'edit');

  const set = <K extends keyof CategoryInput>(k: K, v: CategoryInput[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        if (props.mode === 'edit') await updateCategoryAction(props.category.id, data);
        else await createCategoryAction(data);
        setOpen(false);
      } catch (e) {
        if (e instanceof Error && !e.message.startsWith('NEXT_REDIRECT')) {
          setError(e.message);
        } else {
          setOpen(false);
        }
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={props.mode === 'new' ? 'btn-primary' : 'font-semibold text-brand-700 hover:underline'}
      >
        {props.mode === 'new' ? '+ Nova coleção' : 'Editar'}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal
        >
          <div
            className="w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            style={{ maxHeight: '92vh' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">
                {props.mode === 'new' ? 'Nova coleção' : 'Editar coleção'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-500 hover:text-ink-900"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="mt-4 space-y-6">
              {/* ----- Identidade ----- */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Identidade</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Nome *</label>
                    <input
                      required
                      value={data.name}
                      onChange={(e) => {
                        set('name', e.target.value);
                        if (!slugTouched) set('slug', slugify(e.target.value));
                      }}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Handle / Slug</label>
                    <input
                      value={data.slug}
                      onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                      className="field-input font-mono text-xs"
                    />
                    <p className="mt-1 text-xs text-ink-500">URL pública: <code>/categoria/{data.slug || 'handle'}</code></p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">Descrição curta</label>
                    <textarea
                      rows={2}
                      value={data.description}
                      onChange={(e) => set('description', e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="field-label">Descrição completa (opcional)</label>
                    <textarea
                      rows={4}
                      value={data.longDescription}
                      onChange={(e) => set('longDescription', e.target.value)}
                      placeholder="Texto que aparece abaixo do banner na página pública."
                      className="field-input"
                    />
                  </div>
                </div>
              </section>

              {/* ----- Imagens ----- */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Imagens da coleção</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <ImageUploader
                    value={data.imageUrl ?? null}
                    onChange={(url) => set('imageUrl', url)}
                    label="Banner desktop"
                    height={160}
                    hint="1920 × 840 px (16:7) — JPG ou WEBP até 6 MB."
                  />
                  <ImageUploader
                    value={data.imageMobileUrl ?? null}
                    onChange={(url) => set('imageMobileUrl', url)}
                    label="Banner mobile (opcional)"
                    height={160}
                    hint="800 × 1000 px (4:5 portrait) — JPG ou WEBP."
                  />
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  Se não definir mobile, usamos a imagem desktop nos dois.
                </p>
              </section>

              {/* ----- Visibilidade ----- */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Onde exibir</h3>
                {/* Toggle "Home (destaques)" foi removido — a home não mostra
                    mais grade de categorias. `showOnHome` continua no schema
                    para compatibilidade com dados antigos, mas não influencia
                    a página pública. */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <SwitchRow
                    label="Menu principal"
                    helper="Aparece na navegação do header."
                    checked={data.showInMenu}
                    onChange={(v) => set('showInMenu', v)}
                  />
                  <SwitchRow
                    label="Rodapé"
                    helper="Aparece na lista de categorias do footer."
                    checked={data.showInFooter}
                    onChange={(v) => set('showInFooter', v)}
                  />
                </div>
              </section>

              {/* ----- Configurações ----- */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">Configurações</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="field-label">Ícone</label>
                    <select
                      value={data.icon}
                      onChange={(e) => set('icon', e.target.value)}
                      className="field-input"
                    >
                      {iconOptions.map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Posição</label>
                    <input
                      type="number"
                      value={data.position}
                      onChange={(e) => set('position', Number(e.target.value))}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Status</label>
                    <select
                      value={data.status}
                      onChange={(e) => set('status', e.target.value as 'ACTIVE' | 'INACTIVE')}
                      className="field-input"
                    >
                      <option value="ACTIVE">Ativa</option>
                      <option value="INACTIVE">Inativa</option>
                    </select>
                  </div>
                </div>

                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={data.highlight}
                    onChange={(e) => set('highlight', e.target.checked)}
                  />
                  Destacar essa coleção (aparece primeiro nas listagens)
                </label>
              </section>

              {/* ----- Produtos vinculados ----- */}
              {props.mode === 'edit' && (
                <section className="rounded-xl border border-ink-100 bg-ink-100/30 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                    Produtos desta coleção
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-700">
                      <span className="font-extrabold text-ink-900">{props.productCount}</span>{' '}
                      {props.productCount === 1 ? 'produto vinculado' : 'produtos vinculados'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/produtos?categoryId=${props.category.id}`}
                        className="btn-outline text-xs"
                      >
                        Ver produtos
                      </Link>
                      <Link
                        href={`/admin/produtos/novo?categoryId=${props.category.id}`}
                        className="btn-primary text-xs"
                      >
                        + Novo produto nesta coleção
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {/* ----- SEO ----- */}
              <details className="rounded-md border border-ink-100 p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-ink-900">SEO</summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="field-label">Meta Title</label>
                    <input
                      value={data.metaTitle ?? ''}
                      onChange={(e) => set('metaTitle', e.target.value)}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Meta Description</label>
                    <textarea
                      rows={2}
                      value={data.metaDescription ?? ''}
                      onChange={(e) => set('metaDescription', e.target.value)}
                      className="field-input"
                    />
                  </div>
                </div>
              </details>

              <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className="btn-outline">
                  Cancelar
                </button>
                <button type="submit" disabled={pending} className="btn-primary">
                  {pending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
