'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { InfoIcon } from '@/components/ui/Icon';

export type ProductImageEntry = { url: string; alt: string };

type Props = {
  images: ProductImageEntry[];
  onChange: (images: ProductImageEntry[]) => void;
  hint?: string;
};

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/avif';

export const ProductImagesField = ({ images, onChange, hint }: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    setUploading(true);
    const uploaded: ProductImageEntry[] = [];
    try {
      const list = Array.from(files);
      for (const file of list) {
        if (!file.type.startsWith('image/')) continue;
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Falha no upload');
        uploaded.push({ url: data.url, alt: '' });
      }
      onChange([...images, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = images.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  const updateAlt = (idx: number, alt: string) => {
    const next = images.slice();
    next[idx] = { ...next[idx], alt };
    onChange(next);
  };

  return (
    <div>
      {/* ─── Drop zone ─── */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => ref.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        aria-label="Arraste arquivos aqui ou clique para selecionar imagens"
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-brand-700 bg-brand-50/70'
            : 'border-ink-300 bg-ink-100/40 hover:border-brand-500 hover:bg-brand-50/40'
        }`}
      >
        <span
          aria-hidden
          className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${
            dragOver ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 shadow-sm'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v13" />
            <path d="M6 9l6-6 6 6" />
            <path d="M20 21H4" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {uploading
              ? 'Enviando...'
              : dragOver
                ? 'Solte para enviar'
                : 'Arraste as imagens aqui ou clique para selecionar'}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            PNG, JPG, WEBP ou AVIF · até 6 MB por arquivo
          </p>
        </div>
        <input
          ref={ref}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {hint && (
        <p className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-brand-50/60 px-2 py-1 text-[11px] text-brand-700">
          <InfoIcon size={13} className="mt-[1px] shrink-0 text-brand-700" aria-hidden />
          <span className="leading-snug">
            <span className="font-semibold">Tamanho ideal:</span> {hint}
          </span>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {/* ─── Grid de imagens ─── */}
      {images.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {images.map((img, i) => (
            <li
              key={`${img.url}-${i}`}
              className="flex gap-3 rounded-xl border border-ink-100 bg-white p-3"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                <Image
                  src={img.url}
                  alt={img.alt || 'Imagem'}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-brand-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    Capa
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <input
                  type="text"
                  value={img.alt}
                  onChange={(e) => updateAlt(i, e.target.value)}
                  placeholder="Texto alternativo (alt)"
                  className="field-input h-8 text-xs"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Mover para cima"
                    className="rounded-md border border-ink-300 px-2 py-1 text-xs hover:bg-ink-100 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === images.length - 1}
                    aria-label="Mover para baixo"
                    className="rounded-md border border-ink-300 px-2 py-1 text-xs hover:bg-ink-100 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="ml-auto rounded-md border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
