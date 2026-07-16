import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// Cloudinary SDK precisa do runtime Node (usa crypto/HMAC).
export const runtime = 'nodejs';

// Signed direct upload: assinamos NO SERVIDOR e devolvemos ao browser um
// payload sem `api_secret`. O browser envia o vídeo direto pra Cloudinary,
// bypassando o Next — resolve `req.formData()` estourando com vídeos
// grandes atrás de proxies (Nginx/EasyPanel) e reverse-proxies serverless.
//
// `api_secret` NUNCA sai do processo Node. Só timestamp + folder + signature.

const DEFAULT_FOLDER = 'traveltech';

type Body = {
  kind?: 'video' | 'image';
  folder?: string;
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Acesso restrito ao admin.' }, { status: 403 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          'Cloudinary não configurado no servidor. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.',
      },
      { status: 500 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // Aceita body vazio — os defaults resolvem
  }

  const kind = body.kind === 'video' ? 'video' : 'image';
  const folder =
    body.folder && /^[a-zA-Z0-9_\-/]+$/.test(body.folder)
      ? body.folder
      : DEFAULT_FOLDER;

  const timestamp = Math.floor(Date.now() / 1000);

  // Assinatura via SDK oficial. api_sign_request ordena params alfabeticamente,
  // concatena "key=value&...", appenda o secret e faz SHA1 — não corremos o
  // risco de errar a ordem manualmente. O secret NUNCA vai pro cliente.
  const { v2 } = await import('cloudinary');
  const signature = v2.utils.api_sign_request({ folder, timestamp }, apiSecret);

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    resourceType: kind,
  });
}
