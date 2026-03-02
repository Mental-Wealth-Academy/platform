import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureEtherealProgressSchema } from '@/lib/ensureEtherealProgressSchema';
import { sealWeekOnChain, PATHWAY_CONTRACT_ADDRESS } from '@/lib/pathway-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ethereal-progress?week=N
 * Load progress for authenticated user for a specific week
 */
export async function GET(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  await ensureEtherealProgressSchema();

  const { searchParams } = new URL(request.url);
  const weekStr = searchParams.get('week');
  if (weekStr === null) {
    return NextResponse.json({ error: 'Missing week parameter.' }, { status: 400 });
  }

  const week = parseInt(weekStr, 10);
  if (isNaN(week) || week < 0 || week > 13) {
    return NextResponse.json({ error: 'Invalid week number (0-13).' }, { status: 400 });
  }

  const rows = await sqlQuery<Array<{
    id: string;
    progress_data: any;
    is_sealed: boolean;
    seal_tx_hash: string | null;
    seal_content_hash: string | null;
    updated_at: string;
  }>>(
    `SELECT id, progress_data, is_sealed, seal_tx_hash, seal_content_hash, updated_at
     FROM ethereal_progress
     WHERE user_id = :userId AND week_number = :week
     LIMIT 1`,
    { userId: user.id, week }
  );

  if (rows.length === 0) {
    return NextResponse.json({
      weekNumber: week,
      progressData: {},
      isSealed: false,
      sealTxHash: null,
      sealContentHash: null,
    });
  }

  const row = rows[0];
  return NextResponse.json({
    weekNumber: week,
    progressData: row.progress_data,
    isSealed: row.is_sealed,
    sealTxHash: row.seal_tx_hash,
    sealContentHash: row.seal_content_hash,
    updatedAt: row.updated_at,
  });
}

/**
 * POST /api/ethereal-progress
 * Upsert progress or seal a week
 *
 * Body: { weekNumber, progressData, seal?: true }
 */
export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  await ensureEtherealProgressSchema();

  let body: { weekNumber: number; progressData: any; seal?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { weekNumber, progressData, seal } = body;

  if (typeof weekNumber !== 'number' || weekNumber < 0 || weekNumber > 13) {
    return NextResponse.json({ error: 'Invalid week number (0-13).' }, { status: 400 });
  }

  // Check if week is already sealed
  const existing = await sqlQuery<Array<{ is_sealed: boolean }>>(
    `SELECT is_sealed FROM ethereal_progress
     WHERE user_id = :userId AND week_number = :weekNumber
     LIMIT 1`,
    { userId: user.id, weekNumber }
  );

  if (existing.length > 0 && existing[0].is_sealed) {
    return NextResponse.json({ error: 'This week is sealed and cannot be modified.' }, { status: 403 });
  }

  // ─── Seal Flow ─────────────────────────────────────────────────────
  if (seal) {
    // Enforce sequential: all prior weeks must be sealed
    if (weekNumber > 0) {
      const priorUnsealedRows = await sqlQuery<Array<{ cnt: string }>>(
        `SELECT COUNT(*) as cnt FROM ethereal_progress
         WHERE user_id = :userId AND week_number < :weekNumber AND is_sealed = true`,
        { userId: user.id, weekNumber }
      );
      const sealedPriorCount = parseInt(priorUnsealedRows[0]?.cnt || '0', 10);
      if (sealedPriorCount < weekNumber) {
        return NextResponse.json(
          { error: 'All prior weeks must be sealed first.' },
          { status: 400 }
        );
      }
    }

    // Generate SHA-256 content hash server-side
    const contentString = JSON.stringify({ weekNumber, progressData, userId: user.id });
    const contentHash = createHash('sha256').update(contentString).digest('hex');

    // Upsert progress data first
    await sqlQuery(
      `INSERT INTO ethereal_progress (id, user_id, week_number, progress_data)
       VALUES (gen_random_uuid()::text, :userId, :weekNumber, :progressData::jsonb)
       ON CONFLICT (user_id, week_number)
       DO UPDATE SET progress_data = :progressData::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE ethereal_progress.is_sealed = false`,
      { userId: user.id, weekNumber, progressData: JSON.stringify(progressData) }
    );

    // Call contract to seal on-chain (if contract is configured)
    let txHash: string | null = null;
    if (PATHWAY_CONTRACT_ADDRESS && process.env.PATHWAY_OWNER_PRIVATE_KEY) {
      try {
        const result = await sealWeekOnChain(user.walletAddress, weekNumber, contentHash);
        txHash = result.txHash;
      } catch (err: any) {
        console.error('On-chain seal failed:', err);
        return NextResponse.json(
          { error: 'On-chain seal transaction failed. Please try again.' },
          { status: 500 }
        );
      }
    } else {
      // No contract configured — seal in DB only (dev/preview mode)
      txHash = `0x${contentHash.slice(0, 64)}`;
    }

    // Update DB with seal data
    await sqlQuery(
      `UPDATE ethereal_progress
       SET is_sealed = true, seal_tx_hash = :txHash, seal_content_hash = :contentHash, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = :userId AND week_number = :weekNumber`,
      { txHash, contentHash, userId: user.id, weekNumber }
    );

    // Check pathway completion (week 13 = final)
    let pathwayCompleted = false;
    if (weekNumber === 13) {
      const countRows = await sqlQuery<Array<{ cnt: string }>>(
        `SELECT COUNT(*) as cnt FROM ethereal_progress
         WHERE user_id = :userId AND is_sealed = true`,
        { userId: user.id }
      );
      const totalSealed = parseInt(countRows[0]?.cnt || '0', 10);
      if (totalSealed === 14) {
        pathwayCompleted = true;
      }
    }

    return NextResponse.json({
      ok: true,
      sealed: true,
      weekNumber,
      txHash,
      contentHash,
      pathwayCompleted,
    });
  }

  // ─── Normal Save Flow ──────────────────────────────────────────────
  await sqlQuery(
    `INSERT INTO ethereal_progress (id, user_id, week_number, progress_data)
     VALUES (gen_random_uuid()::text, :userId, :weekNumber, :progressData::jsonb)
     ON CONFLICT (user_id, week_number)
     DO UPDATE SET progress_data = :progressData::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE ethereal_progress.is_sealed = false`,
    { userId: user.id, weekNumber, progressData: JSON.stringify(progressData) }
  );

  return NextResponse.json({ ok: true, weekNumber });
}
