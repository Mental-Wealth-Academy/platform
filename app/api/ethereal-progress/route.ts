import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery, withTransaction, sqlQueryWithClient } from '@/lib/db';
import { ensureWeeksSchema } from '@/lib/ensureWeeksSchema';
import { getSeasonInfo } from '@/lib/season';

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

  await ensureWeeksSchema();

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
     FROM weeks
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

  await ensureWeeksSchema();

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

  // Enforce universal season timer — can't save/seal future weeks
  const season = getSeasonInfo();
  if (season.seasonActive && weekNumber > season.currentWeek) {
    return NextResponse.json({ error: 'This week hasn\'t started yet.' }, { status: 403 });
  }

  // Check if week is already sealed
  const existing = await sqlQuery<Array<{ is_sealed: boolean }>>(
    `SELECT is_sealed FROM weeks
     WHERE user_id = :userId AND week_number = :weekNumber
     LIMIT 1`,
    { userId: user.id, weekNumber }
  );

  if (existing.length > 0 && existing[0].is_sealed) {
    return NextResponse.json({ error: 'This week is sealed and cannot be modified.' }, { status: 403 });
  }

  // ─── Seal Flow ─────────────────────────────────────────────────────
  if (seal) {
    // Upsert progress, mark sealed, and award shards atomically.
    // Sealing is a normal system action and does not depend on prior weeks
    // or an on-chain attestation.
    const pathwayCompleted = await withTransaction(async (client) => {
      // Upsert progress data
      await sqlQueryWithClient(
        client,
        `INSERT INTO weeks (id, user_id, week_number, progress_data)
         VALUES (gen_random_uuid()::text, :userId, :weekNumber, :progressData::jsonb)
         ON CONFLICT (user_id, week_number)
         DO UPDATE SET progress_data = :progressData::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE weeks.is_sealed = false`,
        { userId: user.id, weekNumber, progressData: JSON.stringify(progressData) }
      );

      // Update DB with seal data
      await sqlQueryWithClient(
        client,
        `UPDATE weeks
         SET is_sealed = true, seal_tx_hash = NULL, seal_content_hash = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = :userId AND week_number = :weekNumber`,
        { userId: user.id, weekNumber }
      );

      // Award 700 shards for sealing a week
      await sqlQueryWithClient(
        client,
        `UPDATE users SET shard_count = COALESCE(shard_count, 0) + 700 WHERE id = :userId`,
        { userId: user.id }
      );

      // Check pathway completion (week 13 = final)
      let completed = false;
      if (weekNumber === 13) {
        const countRows = await sqlQueryWithClient<Array<{ cnt: string }>>(
          client,
          `SELECT COUNT(*) as cnt FROM weeks
           WHERE user_id = :userId AND is_sealed = true`,
          { userId: user.id }
        );
        const totalSealed = parseInt(countRows[0]?.cnt || '0', 10);
        if (totalSealed === 14) {
          completed = true;
        }
      }
      return completed;
    });

    return NextResponse.json({
      ok: true,
      sealed: true,
      weekNumber,
      txHash: null,
      contentHash: null,
      pathwayCompleted,
    });
  }

  // ─── Normal Save Flow ──────────────────────────────────────────────
  await sqlQuery(
    `INSERT INTO weeks (id, user_id, week_number, progress_data)
     VALUES (gen_random_uuid()::text, :userId, :weekNumber, :progressData::jsonb)
     ON CONFLICT (user_id, week_number)
     DO UPDATE SET progress_data = :progressData::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE weeks.is_sealed = false`,
    { userId: user.id, weekNumber, progressData: JSON.stringify(progressData) }
  );

  return NextResponse.json({ ok: true, weekNumber });
}
