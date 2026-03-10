import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SPIN_COST = 10;

export async function POST() {
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
    // Check current shard count
    const rows = await sqlQuery<Array<{ shard_count: number }>>(
      `SELECT shard_count FROM users WHERE id = :id LIMIT 1`,
      { id: user.id }
    );

    const currentShards = rows[0]?.shard_count ?? 0;
    if (currentShards < SPIN_COST) {
      return NextResponse.json(
        { error: 'Not enough shards to spin.' },
        { status: 400 }
      );
    }

    // Deduct shards
    await sqlQuery(
      `UPDATE users SET shard_count = shard_count - :cost WHERE id = :id AND shard_count >= :cost`,
      { id: user.id, cost: SPIN_COST }
    );

    // Get updated count
    const updated = await sqlQuery<Array<{ shard_count: number }>>(
      `SELECT shard_count FROM users WHERE id = :id LIMIT 1`,
      { id: user.id }
    );

    const newShardCount = updated[0]?.shard_count ?? 0;

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
