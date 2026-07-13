import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadImage, uploadMedia, uploadVideo } from '@/lib/upload';

export const runtime = 'nodejs';

/**
 * Upload de mídia autenticada. Query params:
 *  - kind=image  → só aceita imagens (comportamento padrão / legado)
 *  - kind=video  → só aceita vídeos
 *  - kind=any    → aceita imagem OU vídeo, dispatch pelo MIME
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 });

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'image';

  try {
    if (kind === 'video') {
      const r = await uploadVideo(file);
      return NextResponse.json({ url: r.url, kind: 'video' });
    }
    if (kind === 'any') {
      const r = await uploadMedia(file);
      return NextResponse.json({ url: r.url, kind: r.kind });
    }
    const r = await uploadImage(file);
    return NextResponse.json({ url: r.url, kind: 'image' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha no upload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
