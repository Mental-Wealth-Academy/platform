import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const amount = body.amount;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const rows = await sqlQuery<Array<{ shard_count: number }>>(
    `UPDATE users SET shard_count = shard_count - :amount
     WHERE id = :id AND shard_count >= :amount
     RETURNING shard_count`,
    { id: user.id, amount }
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Insufficient shards' }, { status: 402 });
  }

  return NextResponse.json({ shardsRemaining: rows[0].shard_count });
}
