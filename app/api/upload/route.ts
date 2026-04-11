import { NextResponse } from 'next/server';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const MAX_EXTRACTED_TEXT_LENGTH = 12000;

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
    case 'application/pdf':
      return 'pdf';
    default:
      return null;
  }
}

async function extractPdfText(bytes: Uint8Array): Promise<string | null> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      isEvalSupported: false,
      useSystemFonts: false,
    });
    const pdf = await loadingTask.promise;

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        pages.push(pageText);
      }

      if (pages.join('\n').length >= MAX_EXTRACTED_TEXT_LENGTH) {
        break;
      }
    }

    const text = pages.join('\n').slice(0, MAX_EXTRACTED_TEXT_LENGTH).trim();
    return text || null;
  } catch (error) {
    console.error('PDF text extraction failed:', error);
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

  // Validate file size (max 10MB)
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB` },
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

  const extractedText = file.type === 'application/pdf'
    ? await extractPdfText(new Uint8Array(bytes))
    : null;

  return NextResponse.json({
    url: `/uploads/${filename}`,
    name: path.basename(file.name || `upload.${ext}`),
    mime: file.type,
    size: file.size,
    extractedText,
  });
}
