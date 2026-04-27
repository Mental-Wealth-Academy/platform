import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensurePrayersSchema } from '@/lib/ensurePrayersSchema';
import { decryptForUser } from '@/lib/encrypt';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REREAD_SHARD_COST = 50;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface MorningPageEntry {
  day?: number;
  date?: string;
  content?: string;
  submittedAt?: number;
}

interface RereadNote {
  date: string;
  content: string;
  day: number;
  weekNumber: number;
  submittedAt: number | null;
}

function parseAllWeekPages(userId: string, progressData: any): Record<string, MorningPageEntry[]> {
  if (progressData?.encrypted && progressData?.data) {
    const decrypted = decryptForUser(userId, progressData.data);
    const parsed = JSON.parse(decrypted);
    return parsed.allWeekPages ?? {};
  }

  return progressData?.allWeekPages ?? {};
}

function findNoteByDate(allWeekPages: Record<string, MorningPageEntry[]>, dateKey: string): RereadNote | null {
  for (const [weekKey, entries] of Object.entries(allWeekPages)) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (entry?.date !== dateKey) continue;
      if (typeof entry.content !== 'string' || entry.content.trim().length === 0) continue;

      const weekNumber = Number(weekKey);
      const dayNumber = typeof entry.day === 'number' ? entry.day : 0;

      return {
        date: dateKey,
        content: entry.content,
        day: dayNumber,
        weekNumber: Number.isFinite(weekNumber) ? weekNumber : 0,
        submittedAt: typeof entry.submittedAt === 'number' ? entry.submittedAt : null,
      };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const rl = checkRateLimit({
    max: 20,
    windowMs: 60 * 60 * 1000,
    identifier: `daily-note-reread:${user.id}`,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const dateKey = body.date?.trim();
  if (!dateKey || !DATE_KEY_PATTERN.test(dateKey)) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 });
  }

  await ensurePrayersSchema();

  const rows = await sqlQuery<Array<{ progress_data: any }>>(
    `SELECT progress_data FROM prayers
     WHERE user_id = :userId
     LIMIT 1`,
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'note_not_found' }, { status: 404 });
  }

  let allWeekPages: Record<string, MorningPageEntry[]>;
  try {
    allWeekPages = parseAllWeekPages(user.id, rows[0].progress_data);
  } catch (error) {
    console.error('Failed to decrypt morning pages for reread:', error);
    return NextResponse.json({ error: 'Failed to load note.' }, { status: 500 });
  }

  const note = findNoteByDate(allWeekPages, dateKey);
  if (!note) {
    return NextResponse.json({ error: 'note_not_found' }, { status: 404 });
  }

  const shardRows = await sqlQuery<Array<{ shard_count: number }>>(
    `UPDATE users
     SET shard_count = shard_count - :amount
     WHERE id = :userId AND shard_count >= :amount
     RETURNING shard_count`,
    { userId: user.id, amount: REREAD_SHARD_COST }
  );

  if (shardRows.length === 0) {
    return NextResponse.json(
      { error: 'insufficient_shards', cost: REREAD_SHARD_COST },
      { status: 402 }
    );
  }

  return NextResponse.json({
    ok: true,
    note,
    shardsDeducted: REREAD_SHARD_COST,
    shardsRemaining: shardRows[0].shard_count,
  });
}
