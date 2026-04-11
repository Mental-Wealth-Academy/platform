import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureResearchReclaimTable() {
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS research_shard_reclaims (
      token CHAR(36) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      topic TEXT NOT NULL,
      amount INTEGER NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      claimed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === 'string' ? body.token : '';

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  await ensureResearchReclaimTable();

  const reclaimRows = await sqlQuery<Array<{ amount: number }>>(
    `UPDATE research_shard_reclaims
     SET claimed_at = NOW()
     WHERE token = :token
       AND user_id = :userId
       AND claimed_at IS NULL
       AND expires_at > NOW()
     RETURNING amount`,
    { token, userId: user.id }
  );

  if (reclaimRows.length === 0) {
    return NextResponse.json({ error: 'Reclaim unavailable' }, { status: 410 });
  }

  const userRows = await sqlQuery<Array<{ shard_count: number }>>(
    `UPDATE users
     SET shard_count = COALESCE(shard_count, 0) + :amount
     WHERE id = :userId
     RETURNING shard_count`,
    { userId: user.id, amount: reclaimRows[0].amount }
  );

  return NextResponse.json({
    ok: true,
    shardsRemaining: userRows[0]?.shard_count ?? null,
    reclaimed: reclaimRows[0].amount,
  });
}
