import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Maximum shards that can be earned in a single API call (anti-cheat) */
const MAX_REWARD_PER_CALL = 100;

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = body?.amount;
  const reason = body?.reason;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  if (amount > MAX_REWARD_PER_CALL) {
    return NextResponse.json({ error: `Reward capped at ${MAX_REWARD_PER_CALL} shards per call` }, { status: 400 });
  }

  if (!reason || typeof reason !== 'string') {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  try {
    const rows = await sqlQuery<Array<{ shard_count: number }>>(
      `UPDATE users SET shard_count = shard_count + :amount
       WHERE id = :id
       RETURNING shard_count`,
      { id: user.id, amount }
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, newBalance: rows[0].shard_count });
  } catch (err) {
    console.error('Error rewarding shards:', err);
    return NextResponse.json({ error: 'Failed to reward shards' }, { status: 500 });
  }
}
