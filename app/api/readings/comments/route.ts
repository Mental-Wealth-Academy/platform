import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureReadingCommentsTable() {
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS reading_comments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      reading_slug TEXT NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sqlQuery(`
    CREATE INDEX IF NOT EXISTS idx_reading_comments_slug ON reading_comments(reading_slug, created_at DESC)
  `);
}

export async function GET(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ comments: [] });
  }

  await ensureReadingCommentsTable();

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const comments = await sqlQuery<Array<{
    id: string;
    body: string;
    created_at: string;
    username: string | null;
    avatar_url: string | null;
  }>>(
    `SELECT rc.id, rc.body, rc.created_at, u.username, u.avatar_url
     FROM reading_comments rc
     JOIN users u ON rc.user_id = u.id
     WHERE rc.reading_slug = :slug
     ORDER BY rc.created_at DESC
     LIMIT 50`,
    { slug }
  );

  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  await ensureReadingCommentsTable();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, comment } = body;

  if (!slug || typeof comment !== 'string' || !comment.trim()) {
    return NextResponse.json({ error: 'Missing slug or comment' }, { status: 400 });
  }

  if (comment.trim().length > 1000) {
    return NextResponse.json({ error: 'Comment too long (max 1000 chars)' }, { status: 400 });
  }

  await sqlQuery(
    `INSERT INTO reading_comments (reading_slug, user_id, body) VALUES (:slug, :userId, :body)`,
    { slug, userId: user.id, body: comment.trim() }
  );

  return NextResponse.json({ ok: true });
}
