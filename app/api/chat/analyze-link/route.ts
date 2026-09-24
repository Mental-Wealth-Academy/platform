import { NextRequest, NextResponse } from 'next/server';
import { isDbConfigured } from '@/lib/db';
import { processMessageForLinkReview } from '@/lib/blue-link-reviewer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  let body: { message?: string; userId?: string; username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    const result = await processMessageForLinkReview({
      message,
      userId: body.userId,
      username: body.username,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to analyze link.';
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
