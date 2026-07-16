import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadImage, uploadMedia, uploadVideo } from '@/lib/upload';

// Uploads envolvem Buffer + Cloudinary (SDK Node). Runtime tem que ser
// nodejs — edge não funciona.
export const runtime = 'nodejs';

// Vídeos podem chegar a 20 MB. O default de 10s dos route handlers em
// deploys serverless corta uploads pesados no meio, com erro genérico
// no cliente. 60s dá folga confortável.
export const maxDuration = 60;

/**
 * Upload de mídia autenticada. Query params:
 *  - kind=image (padrão / legado) — só aceita imagens
 *  - kind=video                    — só aceita vídeos MP4/WebM
 *  - kind=any                      — imagem OU vídeo, dispatch pelo MIME
 *
 * Contrato: FormData com um campo `file`. O browser define o boundary
 * de multipart automaticamente — NÃO enviar Content-Type manual do lado
 * do cliente (senão o parser rejeita).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Antes: `.catch(() => null)` engolia qualquer erro (timeout, OOM, parse
  // corrompido) e devolvia "FormData inválido" — bug clássico de vídeo
  // >10 MB. Agora capturamos e logamos a causa real no servidor, e no
  // cliente devolvemos mensagem útil sem vazar detalhe técnico.
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    console.error('[api/admin/upload] falha ao ler FormData:', err);
    return NextResponse.json(
      {
        error:
          'Não foi possível ler o arquivo enviado. Verifique se ele está em um dos formatos aceitos e tem até 20 MB para vídeo ou 6 MB para imagem.',
      },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Nenhum arquivo enviado.' },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'image';

  try {
    if (kind === 'video') {
      const r = await uploadVideo(file);
      return NextResponse.json({
        url: r.url,
        kind: 'video',
        mimeType: file.type,
        size: file.size,
      });
    }
    if (kind === 'any') {
      const r = await uploadMedia(file);
      return NextResponse.json({
        url: r.url,
        kind: r.kind,
        mimeType: file.type,
        size: file.size,
      });
    }
    const r = await uploadImage(file);
    return NextResponse.json({
      url: r.url,
      kind: 'image',
      mimeType: file.type,
      size: file.size,
    });
  } catch (e) {
    // As funções de upload lançam com mensagens específicas em português
    // ("Formato inválido. Envie MP4 ou WebM.", "Vídeo muito grande (máx. 20 MB).",
    // ou "Upload local não é suportado em produção..."). Repassamos direto
    // pro cliente — o admin vê a causa real, não um erro genérico.
    console.error('[api/admin/upload] falha no upload:', e);
    const msg = e instanceof Error ? e.message : 'Falha no upload';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
