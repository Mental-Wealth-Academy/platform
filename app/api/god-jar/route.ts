import { NextResponse } from 'next/server';
import { sqlQuery, isDbConfigured } from '@/lib/db';
import { ensureGodJarSchema } from '@/lib/ensureGodJarSchema';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rate = checkRateLimit({
    max: 15,
    windowMs: 60 * 1000,
    identifier: `god-jar:${getClientIdentifier(request)}`,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many submissions. Please take a quiet breath and try again soon.' },
      { status: 429, headers: getRateLimitHeaders(rate) }
    );
  }

  let content = '';
  try {
    const body = await request.json();
    if (typeof body?.content === 'string') {
      content = body.content.trim();
    } else if (typeof body?.note === 'string') {
      content = body.note.trim();
    }
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  // Cap content to a reasonable length for a prayer / surrender note
  const sanitizedContent = content.slice(0, 1000);

  if (!isDbConfigured()) {
    return NextResponse.json({ success: true, offline: true });
  }

  try {
    await ensureGodJarSchema();
    await sqlQuery(
      `INSERT INTO god_jar_entries (content) VALUES ($1)`,
      [sanitizedContent]
    );
    return NextResponse.json({ success: true, message: 'Received by the Ethereal Horizon.' });
  } catch (error) {
    console.error('[GodJar] Error saving entry:', error);
    // Return success gracefully so user feels peace of mind
    return NextResponse.json({ success: true, offline: true });
  }
}
