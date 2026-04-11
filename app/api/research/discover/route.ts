import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { discoverSources, getPayToAddress } from '@/lib/x402-research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECLAIM_AMOUNT = 1000;

async function ensureResearchReclaimTable() {
  if (!isDbConfigured()) return;

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
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { topic: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== 'string') {
    return NextResponse.json({ error: 'Topic required' }, { status: 400 });
  }

  const sources = await discoverSources(body.topic);
  const payTo = getPayToAddress();

  let reclaimToken: string | null = null;

  if (sources.length === 0 && isDbConfigured()) {
    await ensureResearchReclaimTable();
    reclaimToken = randomUUID();
    await sqlQuery(
      `INSERT INTO research_shard_reclaims (token, user_id, topic, amount, expires_at)
       VALUES (:token, :userId, :topic, :amount, NOW() + INTERVAL '30 minutes')`,
      {
        token: reclaimToken,
        userId: user.id,
        topic: body.topic,
        amount: RECLAIM_AMOUNT,
      }
    );
  }

  return NextResponse.json({ sources, payTo, reclaimToken });
}
