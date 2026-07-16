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

const VIDEO_MIME = new Set(['video/mp4', 'video/webm']);
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Upload direto do browser para o Cloudinary usando assinatura gerada pelo
 * backend. Usado só para vídeo — bypassa `/api/admin/upload` e evita
 * `req.formData()` do Next estourar em proxies (Nginx, reverse-proxy do
 * EasyPanel, gateways serverless) com arquivos multipart grandes.
 *
 * Fluxo:
 *   1. valida MIME e tamanho no client (economiza round-trip)
 *   2. pede assinatura a POST /api/admin/upload/signature (auth admin)
 *   3. POST direto para https://api.cloudinary.com/v1_1/{cloud}/video/upload
 *      com FormData(file, api_key, timestamp, signature, folder)
 *   4. devolve secure_url
 *
 * O `api_secret` NUNCA sai do server. `signature` é SHA1 assinada com o secret.
 */
const uploadVideoDirect = async (file: File): Promise<string> => {
  if (!VIDEO_MIME.has(file.type)) {
    throw new Error('Formato inválido. Envie MP4 ou WebM.');
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error('Vídeo acima de 20 MB.');
  }

  // 1) assinatura
  const sigRes = await fetch('/api/admin/upload/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'video' }),
  });
  const sig = await sigRes.json().catch(() => ({}));
  if (!sigRes.ok) {
    throw new Error(sig.error || 'Falha ao gerar assinatura de upload.');
  }

  // 2) upload direto
  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sig.apiKey);
  fd.append('timestamp', String(sig.timestamp));
  fd.append('signature', sig.signature);
  fd.append('folder', sig.folder);

  const upRes = await fetch(endpoint, { method: 'POST', body: fd });
  const upData = await upRes.json().catch(() => ({}));
  if (!upRes.ok) {
    // Cloudinary devolve { error: { message } } — extraímos e mostramos.
    const cloudMsg = upData?.error?.message || upRes.statusText;
    throw new Error(`Cloudinary recusou o upload: ${cloudMsg}`);
  }
  if (!upData.secure_url) {
    throw new Error('Cloudinary não retornou URL do vídeo.');
  }
  return upData.secure_url as string;
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
      if (isVideo) {
        // Vídeo NÃO passa pelo Next — sobe direto ao Cloudinary via
        // assinatura assinada. Resolve `req.formData()` falhando em
        // multipart >10MB atrás de proxies em produção.
        const url = await uploadVideoDirect(file);
        onChange(url);
        return;
      }

      // Imagem continua pela rota do Next — funcionamento estável e
      // permite normalização/validação server-side.
      // NÃO definir Content-Type manualmente: o browser gera o boundary
      // de multipart. Setar `multipart/form-data` sem boundary quebra o parser.
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload?kind=image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            'Não foi possível enviar a imagem. Verifique o formato (PNG, JPG, WEBP, AVIF) e tamanho até 6 MB.',
        );
      }
      onChange(data.url);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : isVideo
            ? 'Não foi possível enviar o vídeo. Tente um MP4/WebM menor ou verifique a conexão.'
            : 'Erro no upload da imagem.';
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
