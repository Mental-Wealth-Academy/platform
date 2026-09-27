import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';
import {
  isStorageConfigured,
  uploadBucket,
  uploadPublicObject,
} from '@/lib/supabase-storage';
import { uploadImageBuffer } from '@/lib/ipfs-upload';

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
    max: 20,
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

  const hasStorage =
    isStorageConfigured() ||
    (process.env.NODE_ENV !== 'test' && Boolean(process.env.PINATA_JWT));
  if (!hasStorage) {
    return NextResponse.json(
      { error: 'File uploads are temporarily unavailable.' },
      { status: 503 }
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

  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const filename = `${uuidv4()}.${ext}`;

  // 1. Try Supabase Storage if configured
  if (isStorageConfigured()) {
    try {
      const { url } = await uploadPublicObject({
        bucket: uploadBucket(),
        data: arrayBuf,
        contentType: file.type,
        ext,
      });
      return NextResponse.json({
        url,
        name: path.basename(file.name || filename),
        mime: file.type,
        size: file.size,
      });
    } catch (err) {
      console.warn('[Upload] Supabase storage upload failed, attempting fallback:', err);
    }
  }

  // 2. Try Pinata IPFS if configured
  if (process.env.PINATA_JWT) {
    try {
      const ipfsUri = await uploadImageBuffer(buffer, filename);
      const hash = ipfsUri.replace('ipfs://', '');
      const url = `https://gateway.pinata.cloud/ipfs/${hash}`;
      return NextResponse.json({
        url,
        name: path.basename(file.name || filename),
        mime: file.type,
        size: file.size,
      });
    } catch (err) {
      console.warn('[Upload] Pinata IPFS upload failed, attempting local fallback:', err);
    }
  }

  // 3. Fallback: Save to local filesystem (public/uploads/avatars)
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);
    const url = `/uploads/avatars/${filename}`;

    return NextResponse.json({
      url,
      name: path.basename(file.name || filename),
      mime: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('[Upload] All storage options failed:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 502 });
  }
}
