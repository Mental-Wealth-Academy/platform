import { NextRequest, NextResponse } from 'next/server';
import { ART_COLLECTION } from '@/components/genetics/gallery/artCollection';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 18 * 1024 * 1024;

function detectImageContentType(bytes: ArrayBuffer | Uint8Array): string | null {
  const b = new Uint8Array(bytes instanceof ArrayBuffer ? bytes : bytes.buffer, 0, Math.min(bytes.byteLength, 12));
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp';
  return null;
}

export async function GET(request: NextRequest) {
  const rawId = request.nextUrl.searchParams.get('id');
  const index = rawId ? Number.parseInt(rawId, 10) - 1 : -1;
  const artwork = ART_COLLECTION[index];

  if (!artwork || !Number.isInteger(index)) {
    return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
  }

  if (artwork.image.startsWith('/')) {
    return NextResponse.redirect(new URL(artwork.image, request.url));
  }

  try {
    const source = await fetch(artwork.image, {
      headers: { Accept: 'image/*' },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!source.ok) {
      return NextResponse.json({ error: 'Artwork source unavailable' }, { status: 502 });
    }

    const sourceContentType = source.headers.get('content-type') || '';
    const contentLength = Number(source.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Invalid artwork source' }, { status: 502 });
    }

    const bytes = await source.arrayBuffer();
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Artwork source is too large' }, { status: 502 });
    }
    const contentType = sourceContentType.startsWith('image/')
      ? sourceContentType
      : detectImageContentType(bytes);
    if (!contentType) {
      return NextResponse.json({ error: 'Invalid artwork source' }, { status: 502 });
    }

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Artwork source unavailable' }, { status: 502 });
  }
}
