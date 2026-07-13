import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Tipos aceitos por família — cada família tem seu limite de tamanho e o
// Cloudinary usa resource_type diferente. Vídeo maior porque é normal ter
// campanhas de 10-15s em MP4.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const IMAGE_MAX_BYTES = 6 * 1024 * 1024;   // 6MB
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;  // 20MB

export type MediaKind = 'image' | 'video';

const hasCloudinary = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

export type UploadResult = { url: string };

const sanitizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);

const localUpload = async (file: File): Promise<UploadResult> => {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const id = crypto.randomBytes(8).toString('hex');
  const base = sanitizeName(file.name.replace(/\.[^.]+$/, '')) || 'file';
  const filename = `${Date.now()}-${id}-${base}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return { url: `/uploads/${filename}` };
};

const cloudinaryUpload = async (file: File, kind: MediaKind): Promise<UploadResult> => {
  const { v2 } = await import('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;
  const res = await v2.uploader.upload(dataUri, {
    folder: 'traveltech',
    resource_type: kind === 'video' ? 'video' : 'image',
  });
  return { url: res.secure_url };
};

const uploadFile = async (file: File, kind: MediaKind): Promise<UploadResult> => {
  if (hasCloudinary()) return cloudinaryUpload(file, kind);

  // Em produção (NODE_ENV=production) recusamos o upload local porque
  // hosts serverless não persistem o filesystem entre invocações e o
  // arquivo seria perdido. Cloudinary é obrigatório em prod.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Upload local não é suportado em produção. Configure as variáveis CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no servidor.',
    );
  }

  return localUpload(file);
};

/** Upload de imagem — assinatura mantida para compatibilidade. */
export const uploadImage = async (file: File): Promise<UploadResult> => {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Envie PNG, JPG, WEBP ou AVIF.');
  }
  if (file.size > IMAGE_MAX_BYTES) {
    throw new Error('Imagem muito grande (máx. 6 MB).');
  }
  return uploadFile(file, 'image');
};

/** Upload de vídeo (MP4 ou WebM, até 20 MB). */
export const uploadVideo = async (file: File): Promise<UploadResult> => {
  if (!VIDEO_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Envie MP4 ou WebM.');
  }
  if (file.size > VIDEO_MAX_BYTES) {
    throw new Error('Vídeo muito grande (máx. 20 MB).');
  }
  return uploadFile(file, 'video');
};

/**
 * Roteia por família com base no MIME real. Útil pro handler que aceita
 * imagem ou vídeo pela mesma rota.
 */
export const uploadMedia = async (file: File): Promise<UploadResult & { kind: MediaKind }> => {
  if (IMAGE_TYPES.includes(file.type)) {
    const r = await uploadImage(file);
    return { ...r, kind: 'image' };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    const r = await uploadVideo(file);
    return { ...r, kind: 'video' };
  }
  throw new Error('Formato inválido. Envie PNG, JPG, WEBP, AVIF, MP4 ou WebM.');
};
