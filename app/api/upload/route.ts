import { NextResponse } from 'next/server';
import path from 'path';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import {
  isStorageConfigured,
  uploadBucket,
  uploadPublicObject,
} from '@/lib/supabase-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Image uploads only (for example, profile avatars).
const IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

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

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: 'File uploads are temporarily unavailable.' },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
      { status: 413 }
    );
  }

  const ext = IMAGE_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || 'unknown'}. Upload a PNG, JPEG, GIF, or WebP image.` },
      { status: 415 }
    );
  }

  try {
    const data = await file.arrayBuffer();
    const { url } = await uploadPublicObject({
      bucket: uploadBucket(),
      data,
      contentType: file.type,
      ext,
    });

    return NextResponse.json({
      url,
      name: path.basename(file.name || `upload.${ext}`),
      mime: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 502 });
  }
}
