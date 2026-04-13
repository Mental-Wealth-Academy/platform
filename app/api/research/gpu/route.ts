import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { createResearchDeployment, GPU_TIERS, type GpuTier } from '@/lib/nosana';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_TIERS = new Set<string>(['focus', 'deep', 'elite']);

async function ensureGpuJobsTable() {
  await sqlQuery(`
    CREATE TABLE IF NOT EXISTS nosana_research_jobs (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      tier VARCHAR(20) NOT NULL DEFAULT 'deep',
      topic TEXT NOT NULL DEFAULT '',
      status VARCHAR(50) NOT NULL DEFAULT 'provisioning',
      endpoint TEXT NULL,
      result TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP NULL
    )
  `);
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!process.env.NOSANA_API_KEY) {
    return NextResponse.json({ error: 'GPU research not available' }, { status: 503 });
  }

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const tier = (body.tier || 'deep') as GpuTier;
  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  const shardCost = GPU_TIERS[tier].shardCost;

  // Atomically deduct shards — fails if balance is insufficient
  const updated = await sqlQuery<Array<{ shard_count: number }>>(
    `UPDATE users SET shard_count = shard_count - :cost
     WHERE id = :id AND shard_count >= :cost
     RETURNING shard_count`,
    { id: user.id, cost: shardCost }
  );

  if (!updated.length) {
    return NextResponse.json({ error: 'insufficient_shards', cost: shardCost }, { status: 402 });
  }

  let deploymentId: string;
  try {
    await ensureGpuJobsTable();
    deploymentId = await createResearchDeployment(user.id, tier);
    await sqlQuery(
      `INSERT INTO nosana_research_jobs (id, user_id, tier, status)
       VALUES (:id, :userId, :tier, 'provisioning')`,
      { id: deploymentId, userId: user.id, tier }
    );
  } catch (err) {
    // Refund shards if Nosana provisioning fails
    await sqlQuery(
      'UPDATE users SET shard_count = shard_count + :cost WHERE id = :id',
      { id: user.id, cost: shardCost }
    );
    const msg = err instanceof Error ? err.message : 'GPU provisioning failed';
    console.error('Nosana deploy error:', msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({
    jobId: deploymentId,
    status: 'provisioning',
    tier,
    shardsDeducted: shardCost,
    shardsRemaining: updated[0].shard_count,
  });
}
