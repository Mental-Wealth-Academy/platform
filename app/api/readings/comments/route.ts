import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureReadingCommentsTable() {
  // Fix type mismatch: users.id is CHAR(36), not UUID
  // Drop and recreate if the old UUID-typed columns exist
  const cols = await sqlQuery<Array<{ data_type: string }>>(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'reading_comments' AND column_name = 'user_id'
  `);
  if (cols.length > 0 && cols[0].data_type === 'uuid') {
    await sqlQuery(`DROP TABLE IF EXISTS reading_comment_likes`);
    await sqlQuery(`DROP TABLE IF EXISTS reading_comments`);
  }

  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS reading_comments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      reading_slug TEXT NOT NULL,
      user_id CHAR(36) NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await sqlQuery(`
    CREATE INDEX IF NOT EXISTS idx_reading_comments_slug ON reading_comments(reading_slug, created_at DESC)
  `);
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS reading_comment_likes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      comment_id UUID NOT NULL REFERENCES reading_comments(id) ON DELETE CASCADE,
      user_id CHAR(36) NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(comment_id, user_id)
    )
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

  const user = await getCurrentUserFromRequestCookie();

  const comments = await sqlQuery<Array<{
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    like_count: string;
    liked_by_me: boolean;
  }>>(
    `SELECT rc.id, rc.body, rc.created_at, rc.user_id, u.username, u.avatar_url,
       COALESCE((SELECT COUNT(*) FROM reading_comment_likes WHERE comment_id = rc.id), 0) AS like_count,
       ${user ? `EXISTS(SELECT 1 FROM reading_comment_likes WHERE comment_id = rc.id AND user_id = :currentUserId)` : 'false'} AS liked_by_me
     FROM reading_comments rc
     JOIN users u ON rc.user_id = u.id
     WHERE rc.reading_slug = :slug
     ORDER BY rc.created_at DESC
     LIMIT 50`,
    { slug, ...(user ? { currentUserId: user.id } : {}) }
  );

  return NextResponse.json({
    comments: comments.map(c => ({
      ...c,
      like_count: parseInt(c.like_count as string) || 0,
      is_own: user ? c.user_id === user.id : false,
    })),
  });
}

export async function POST(request: NextRequest) {
  const rlResult = checkRateLimit({
    max: 10,
    windowMs: 60 * 1000,
    identifier: `reading-comments:${getClientIdentifier(request)}`,
  });
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rlResult) }
    );
  }

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

  if (comment.trim().length > 100) {
    return NextResponse.json({ error: 'Comment too long (max 100 chars)' }, { status: 400 });
  }

  const rows = await sqlQuery<Array<{ id: string; created_at: string }>>(
    `INSERT INTO reading_comments (reading_slug, user_id, body) VALUES (:slug, :userId, :body) RETURNING id, created_at`,
    { slug, userId: user.id, body: comment.trim() }
  );

  return NextResponse.json({
    ok: true,
    comment: {
      id: rows[0].id,
      body: comment.trim(),
      created_at: rows[0].created_at,
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatarUrl,
      like_count: 0,
      liked_by_me: false,
      is_own: true,
    },
  });
}

export async function DELETE(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  await ensureReadingCommentsTable();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { commentId } = await request.json();
  if (!commentId) {
    return NextResponse.json({ error: 'Missing commentId' }, { status: 400 });
  }

  const deleted = await sqlQuery<Array<{ id: string }>>(
    `DELETE FROM reading_comments WHERE id = :commentId AND user_id = :userId RETURNING id`,
    { commentId, userId: user.id }
  );

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Comment not found or not yours' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  await ensureReadingCommentsTable();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { commentId, action } = await request.json();
  if (!commentId || !action) {
    return NextResponse.json({ error: 'Missing commentId or action' }, { status: 400 });
  }

  if (action === 'like') {
    try {
      await sqlQuery(
        `INSERT INTO reading_comment_likes (comment_id, user_id) VALUES (:commentId, :userId) ON CONFLICT DO NOTHING`,
        { commentId, userId: user.id }
      );
    } catch {
      // ignore duplicates
    }
    return NextResponse.json({ ok: true, liked: true });
  }

  if (action === 'unlike') {
    await sqlQuery(
      `DELETE FROM reading_comment_likes WHERE comment_id = :commentId AND user_id = :userId`,
      { commentId, userId: user.id }
    );
    return NextResponse.json({ ok: true, liked: false });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
