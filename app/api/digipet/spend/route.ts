import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  if (!reason || typeof reason !== 'string') {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  try {
    const rows = await sqlQuery<Array<{ shard_count: number }>>(
      `UPDATE users SET shard_count = shard_count - :amount
       WHERE id = :id AND shard_count >= :amount
       RETURNING shard_count`,
      { id: user.id, amount }
    );

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Not enough shards' }, { status: 402 });
    }

    return NextResponse.json({ ok: true, newBalance: rows[0].shard_count });
  } catch (err) {
    console.error('Error spending shards:', err);
    return NextResponse.json({ error: 'Failed to spend shards' }, { status: 500 });
  }
}
