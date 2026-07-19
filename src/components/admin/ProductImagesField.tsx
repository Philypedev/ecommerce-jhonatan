'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  adjustedTargetAfterMove,
  moveTo,
  promoteToCover,
} from '@/utils/reorderImages';

export type ProductImageEntry = { url: string; alt: string };

type Props = {
  images: ProductImageEntry[];
  onChange: (images: ProductImageEntry[]) => void;
  hint?: string;
};

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/avif';

/**
 * Campo de mídia estilo Shopify:
 *  - Estado vazio: dropzone grande convidando arrastar/clicar.
 *  - Com imagens: grid onde a PRIMEIRA imagem (capa) ocupa 2×2 e as demais
 *    1×1; o último slot é sempre o botão "+" para adicionar mais.
 *  - Reordenação via drag-and-drop HTML5 nativo (sem lib). Posição 0 =
 *    capa; para trocar a capa o admin arrasta outra imagem para a
 *    primeira posição.
 *  - Ações por tile: no hover, botão "Definir como capa" (só nos que
 *    não são a capa) + botão remover (X). Fallback mobile: os mesmos
 *    botões ficam sempre visíveis em telas de toque via CSS media
 *    query — o hover no desktop só ESCONDE quando o cursor sai.
 *  - Alt-text editável abaixo do grid, para não poluir cada card.
 *
 * Upload usa o mesmo endpoint `/api/admin/upload` de antes, então o
 * comportamento de Cloudinary/limite/preview segue intacto.
 */
export const ProductImagesField = ({ images, onChange, hint }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [tileDragIdx, setTileDragIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

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

  const openPicker = () => inputRef.current?.click();

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
    setSelectedIdx((prev) => (prev === idx ? null : prev));
  };

  const setAsCover = (idx: number) => {
    onChange(promoteToCover(images, idx));
    setSelectedIdx(0);
  };

  const updateAlt = (idx: number, alt: string) => {
    const next = images.slice();
    next[idx] = { ...next[idx], alt };
    onChange(next);
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    onChange(moveTo(images, from, to));
    setSelectedIdx(adjustedTargetAfterMove(from, to, images.length));
  };

  // ─── Estado vazio: dropzone grande ───
  if (images.length === 0) {
    return (
      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setFileDragOver(true);
          }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setFileDragOver(false);
            if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
          }}
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPicker();
            }
          }}
          aria-label="Arraste arquivos aqui ou clique para selecionar imagens"
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
            fileDragOver
              ? 'border-brand-700 bg-brand-50/70'
              : 'border-ink-300 bg-ink-100/40 hover:border-brand-500 hover:bg-brand-50/40'
          }`}
        >
          <PlusIconLarge dragOver={fileDragOver} />
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {uploading
                ? 'Enviando...'
                : fileDragOver
                  ? 'Solte para enviar'
                  : 'Adicionar imagens do produto'}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-500">
              PNG, JPG, WEBP ou AVIF · até 6 MB por arquivo
            </p>
          </div>
          <input
            ref={inputRef}
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
          <p className="mt-2 text-[11px] text-ink-500">
            <span className="font-semibold">Tamanho ideal:</span> {hint}
          </p>
        )}

        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  // ─── Estado com imagens: grid Shopify ───
  const selected = selectedIdx != null ? images[selectedIdx] : null;

  return (
    <div>
      <ul
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        aria-label="Mídia do produto — a primeira imagem é a capa"
      >
        {images.map((img, i) => {
          const isCover = i === 0;
          const isTileDragging = tileDragIdx === i;
          const isDropTarget = dropTargetIdx === i && tileDragIdx != null && tileDragIdx !== i;
          return (
            <li
              key={`${img.url}-${i}`}
              draggable
              onDragStart={(e) => {
                setTileDragIdx(i);
                // Precisa de algum dado no dataTransfer pro Firefox aceitar o drag.
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(e) => {
                if (tileDragIdx == null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDropTargetIdx(i);
              }}
              onDragLeave={() => {
                setDropTargetIdx((prev) => (prev === i ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (tileDragIdx == null) return;
                reorder(tileDragIdx, i);
                setTileDragIdx(null);
                setDropTargetIdx(null);
              }}
              onDragEnd={() => {
                setTileDragIdx(null);
                setDropTargetIdx(null);
              }}
              onClick={() => setSelectedIdx(i)}
              className={`group relative cursor-move overflow-hidden rounded-xl border bg-white transition-shadow focus-within:ring-2 focus-within:ring-brand-500 ${
                isCover ? 'md:col-span-2 md:row-span-2' : ''
              } ${isCover ? 'aspect-square md:aspect-auto' : 'aspect-square'} ${
                isTileDragging ? 'opacity-40' : ''
              } ${
                isDropTarget
                  ? 'border-brand-500 ring-2 ring-brand-500/40'
                  : selectedIdx === i
                    ? 'border-brand-300'
                    : 'border-ink-100 hover:border-ink-300'
              }`}
              aria-label={`Imagem ${i + 1}${isCover ? ' (capa)' : ''}`}
            >
              <Image
                src={img.url}
                alt={img.alt || `Imagem ${i + 1}`}
                fill
                sizes={isCover ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'}
                className="object-cover"
                draggable={false}
              />

              {isCover && (
                <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-ink-900/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Capa
                </span>
              )}

              {/* Ações — visíveis sempre em toque, opacidade suave no desktop
                  para não poluir. Colocamos no canto oposto ao badge da capa. */}
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                {!isCover && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAsCover(i);
                    }}
                    aria-label="Definir como capa"
                    title="Definir como capa"
                    className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink-900 shadow-sm hover:bg-white"
                  >
                    <StarIcon />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(i);
                  }}
                  aria-label="Remover imagem"
                  title="Remover"
                  className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-rose-600 shadow-sm hover:bg-white"
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          );
        })}

        {/* Card "+" — sempre por último. Aceita clique e drop de arquivos.
            Não é draggable e nunca vira alvo de reorder. */}
        <li
          onDragOver={(e) => {
            // Se for drop de ARQUIVO externo, aceita — se for reorder de tile,
            // ignora (tile nunca deve ir para depois do "+", ele fica após o
            // último item automaticamente ao arrastar pra um tile válido).
            if (tileDragIdx != null) return;
            e.preventDefault();
            setFileDragOver(true);
          }}
          onDragLeave={() => setFileDragOver(false)}
          onDrop={(e) => {
            if (tileDragIdx != null) return;
            e.preventDefault();
            setFileDragOver(false);
            if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
          }}
          className={`relative aspect-square ${images.length === 1 ? 'md:col-span-2 md:row-span-2' : ''}`}
        >
          <button
            type="button"
            onClick={openPicker}
            aria-label="Adicionar imagens"
            className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-colors ${
              fileDragOver
                ? 'border-brand-700 bg-brand-50/70'
                : 'border-ink-200 bg-ink-100/30 text-ink-500 hover:border-brand-500 hover:bg-brand-50/40 hover:text-brand-700'
            }`}
          >
            <PlusIconSmall />
            <span className="text-[11px] font-semibold">
              {uploading ? 'Enviando...' : 'Adicionar'}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </li>
      </ul>

      {hint && (
        <p className="mt-3 text-[11px] text-ink-500">
          <span className="font-semibold">Tamanho ideal:</span> {hint} · Arraste as imagens para reordenar. A primeira é a capa.
        </p>
      )}

      {/* Alt text — edição só do tile selecionado, para não poluir o grid.
          Se ninguém foi clicado ainda, permite editar o alt da capa. */}
      {images.length > 0 && (
        <div className="mt-3 rounded-lg border border-ink-100 bg-white px-3 py-2">
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-ink-600">
            Texto alternativo{' '}
            <span className="font-normal text-ink-500">
              (imagem {selectedIdx != null ? selectedIdx + 1 : 1}
              {(selectedIdx ?? 0) === 0 ? ' · capa' : ''})
            </span>
            <input
              type="text"
              value={(selected ?? images[0]).alt}
              onChange={(e) => updateAlt(selectedIdx ?? 0, e.target.value)}
              placeholder="Descreva a imagem para acessibilidade e SEO"
              className="field-input h-8 text-xs"
            />
          </label>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
};

// ─────────────────────── Ícones inline (evita import extra) ───────────────────────

const PlusIconLarge = ({ dragOver }: { dragOver: boolean }) => (
  <span
    aria-hidden
    className={`grid h-11 w-11 place-items-center rounded-full transition-colors ${
      dragOver ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 shadow-sm'
    }`}
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  </span>
);

const PlusIconSmall = () => (
  <svg
    aria-hidden
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const StarIcon = () => (
  <svg
    aria-hidden
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    aria-hidden
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);
