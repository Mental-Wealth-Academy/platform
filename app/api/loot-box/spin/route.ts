import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SPIN_COST = 10;

export async function POST(request: Request) {
  const rlResult = checkRateLimit({
    max: 3,
    windowMs: 60 * 1000,
    identifier: `loot-box-spin:${getClientIdentifier(request)}`,
  });
  if (!rlResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rlResult) }
    );
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Atomically deduct shards and return new count — eliminates race condition
    const rows = await sqlQuery<Array<{ shard_count: number }>>(
      `UPDATE users
       SET shard_count = shard_count - :cost
       WHERE id = :id AND shard_count >= :cost
       RETURNING shard_count`,
      { id: user.id, cost: SPIN_COST }
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Not enough shards to spin.' },
        { status: 400 }
      );
    }

    const newShardCount = rows[0].shard_count;

    return NextResponse.json({
      ok: true,
      cost: SPIN_COST,
      newShardCount,
    });
  } catch (err: any) {
    console.error('Error processing loot box spin:', err);
    return NextResponse.json({ error: 'Failed to process spin.' }, { status: 500 });
  }
}
