'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { InfoIcon } from '@/components/ui/Icon';

type Kind = 'image' | 'video';

type Props = {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  height?: number;
  /** Recomendação de dimensão/formato. Ex.: "1920 × 840 px (16:7) — JPG ou WEBP" */
  hint?: string;
  /** `image` (padrão) — imagem clássica. `video` — MP4/WebM. */
  kind?: Kind;
};

const ACCEPT: Record<Kind, string> = {
  image: 'image/png,image/jpeg,image/webp,image/avif',
  video: 'video/mp4,video/webm',
};

const HINT_FMT: Record<Kind, string> = {
  image: 'PNG, JPG, WEBP até 6MB',
  video: 'MP4 ou WebM até 20MB',
};

export const ImageUploader = ({
  value,
  onChange,
  label = 'Imagem',
  height = 160,
  hint,
  kind = 'image',
}: Props) => {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVideo = kind === 'video';

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      // NÃO definir Content-Type manualmente — o browser precisa gerar o
      // boundary de multipart automaticamente. Definir `Content-Type:
      // multipart/form-data` sem boundary quebra o parser do lado servidor.
      const fd = new FormData();
      fd.append('file', file);
      const url = `/api/admin/upload?kind=${kind}`;
      const res = await fetch(url, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // A API já devolve mensagens específicas em português. Fallback só
        // pra caso extremo (rede caiu antes do JSON).
        const fallback = isVideo
          ? 'Não foi possível enviar o vídeo. Verifique se está em MP4 ou WebM e tem até 20 MB.'
          : 'Não foi possível enviar a imagem. Verifique o formato (PNG, JPG, WEBP, AVIF) e tamanho até 6 MB.';
        throw new Error(data.error || fallback);
      }
      onChange(data.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro no upload';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="field-label">{label}</p>
      {hint && (
        <p className="mb-2 inline-flex items-start gap-1.5 rounded-md bg-brand-50/60 px-2 py-1 text-[11px] text-brand-700">
          <InfoIcon size={13} className="mt-[1px] shrink-0 text-brand-700" aria-hidden />
          <span className="leading-snug">
            <span className="font-semibold">Tamanho ideal:</span> {hint}
          </span>
        </p>
      )}
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-ink-300 bg-ink-100/40"
        style={{ minHeight: height }}
      >
        {value ? (
          <>
            {isVideo ? (
              // Preview leve — muted, playsInline, sem autoplay para não pesar
              // no admin. controls=false por padrão; usa a barra ao passar mouse.
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={value}
                muted
                playsInline
                preload="metadata"
                controls
                className="max-h-full max-w-full rounded-xl object-contain p-2"
              />
            ) : (
              <Image
                src={value}
                alt={label}
                fill
                sizes="320px"
                className="rounded-xl object-contain p-2"
              />
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 z-10 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-rose-600 shadow"
            >
              Remover
            </button>
          </>
        ) : (
          <div className="text-center text-sm text-ink-500">
            <p>
              {uploading
                ? 'Enviando...'
                : `Clique para enviar ${isVideo ? 'um vídeo' : 'uma imagem'}`}
            </p>
            <p className="text-xs">{HINT_FMT[kind]}</p>
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept={ACCEPT[kind]}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
};
