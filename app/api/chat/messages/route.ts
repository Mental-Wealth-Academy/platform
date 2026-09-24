import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureChatSchema } from '@/lib/ensureChatSchema';
import { ensureNotificationsSchema } from '@/lib/ensureNotificationsSchema';
import { getUserLatestSurveyBadge } from '@/lib/survey-badge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 30;

type MessageRow = {
  id: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message: string;
  type: string;
  survey_badge: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  await ensureChatSchema();

  const after = request.nextUrl.searchParams.get('after');
  const before = request.nextUrl.searchParams.get('before');

  if (after) {
    const afterId = Number(after);
    if (!Number.isInteger(afterId)) {
      return NextResponse.json({ error: 'Invalid after param.' }, { status: 400 });
    }
    const rows = await sqlQuery<MessageRow[]>(
      `SELECT id, user_id, username, avatar_url, message, type, survey_badge, created_at
       FROM chat_messages
       WHERE id > :afterId
       ORDER BY id ASC
       LIMIT 30`,
      { afterId }
    );
    return NextResponse.json({ messages: rows }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  if (before) {
    const beforeId = Number(before);
    if (!Number.isInteger(beforeId)) {
      return NextResponse.json({ error: 'Invalid before param.' }, { status: 400 });
    }
    const rows = await sqlQuery<MessageRow[]>(
      `SELECT id, user_id, username, avatar_url, message, type, survey_badge, created_at
       FROM chat_messages
       WHERE id < :beforeId
       ORDER BY id DESC
       LIMIT :limit`,
      { beforeId, limit: PAGE_SIZE }
    );
    return NextResponse.json({ messages: rows.reverse(), hasMore: rows.length >= PAGE_SIZE }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  }

  const rows = await sqlQuery<MessageRow[]>(
    `SELECT id, user_id, username, avatar_url, message, type, survey_badge, created_at
     FROM chat_messages
     ORDER BY id DESC
     LIMIT :limit`,
    { limit: PAGE_SIZE }
  );

  return NextResponse.json({ messages: rows.reverse(), hasMore: rows.length >= PAGE_SIZE }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

async function parseMentions(
  text: string,
  fromUserId: string,
  fromUsername: string,
  messageId: number,
) {
  const mentionPattern = /@(\w+)/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = mentionPattern.exec(text)) !== null) {
    const mentioned = match[1].toLowerCase();
    if (mentioned !== fromUsername.toLowerCase()) {
      matches.add(mentioned);
    }
  }
  if (matches.size === 0) return;

  await ensureNotificationsSchema();

  const mentionedUsers = await sqlQuery<Array<{ id: string; username: string }>>(
    `SELECT id, username FROM users
     WHERE LOWER(username) = ANY(:usernames)`,
    { usernames: Array.from(matches) }
  );

  if (mentionedUsers.length === 0) return;

  const preview = text.length > 100 ? text.slice(0, 97) + '...' : text;

  for (const user of mentionedUsers) {
    await sqlQuery(
      `INSERT INTO chat_notifications (user_id, from_user_id, from_username, message_id, message_preview)
       VALUES (:userId, :fromUserId, :fromUsername, :messageId, :preview)`,
      {
        userId: user.id,
        fromUserId,
        fromUsername,
        messageId,
        preview,
      }
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message || message.length > 500) {
    return NextResponse.json({ error: 'Message must be 1–500 characters.' }, { status: 400 });
  }

  await ensureChatSchema();

  const badge = await getUserLatestSurveyBadge(user.id);
  const badgeJson = badge ? JSON.stringify(badge) : null;

  const result = await sqlQuery<
    Array<{
      id: number;
      user_id: string;
      username: string;
      avatar_url: string | null;
      message: string;
      type: string;
      survey_badge: string | null;
      created_at: string;
    }>
  >(
    `INSERT INTO chat_messages (user_id, username, avatar_url, message, type, survey_badge)
     VALUES (:userId, :username, :avatarUrl, :message, 'user', :badgeJson)
     RETURNING id, user_id, username, avatar_url, message, type, survey_badge, created_at`,
    {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      message,
      badgeJson,
    }
  );

  parseMentions(message, user.id, user.username, result[0].id).catch(() => {});

  return NextResponse.json({ ok: true, message: result[0] });
}
