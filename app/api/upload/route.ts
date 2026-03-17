import { NextResponse } from 'next/server';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

function extForMime(mime: string) {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

export async function POST(request: Request) {
  const rlResult = checkRateLimit({
    max: 5,
    windowMs: 60 * 1000,
    identifier: `upload:${getClientIdentifier(request)}`,
  });
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rlResult) }
    );
  }

  // SECURITY: Require authentication
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }

  // Validate file size (max 5MB)
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
      { status: 413 }
    );
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 415 }
    );
  }

  const ext = extForMime(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 415 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Store under /public/uploads so it can be served at /uploads/...
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${uuidv4()}.${ext}`;
  const diskPath = path.join(uploadsDir, filename);

  await writeFile(diskPath, bytes);

  return NextResponse.json({
    url: `/uploads/${filename}`,
    mime: file.type,
    size: file.size,
  });
}
