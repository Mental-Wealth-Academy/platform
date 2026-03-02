import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureWealthProgressSchema } from '@/lib/ensureWealthProgressSchema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/wealth-progress/all
 * Returns seal status for all 14 weeks in one call (used by home page)
 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  await ensureWealthProgressSchema();

  const rows = await sqlQuery<Array<{
    week_number: number;
    is_sealed: boolean;
    seal_tx_hash: string | null;
    updated_at: string;
  }>>(
    `SELECT week_number, is_sealed, seal_tx_hash, updated_at
     FROM wealth_progress
     WHERE user_id = :userId
     ORDER BY week_number ASC`,
    { userId: user.id }
  );

  // Build a map for all 14 weeks (0-13)
  const weeks: Array<{
    weekNumber: number;
    isSealed: boolean;
    sealTxHash: string | null;
  }> = [];

  const rowMap = new Map(rows.map(r => [r.week_number, r]));

  for (let i = 0; i < 14; i++) {
    const row = rowMap.get(i);
    weeks.push({
      weekNumber: i,
      isSealed: row?.is_sealed ?? false,
      sealTxHash: row?.seal_tx_hash ?? null,
    });
  }

  const sealedCount = weeks.filter(w => w.isSealed).length;

  return NextResponse.json({
    weeks,
    sealedCount,
    totalWeeks: 14,
    pathwayCompleted: sealedCount === 14,
  });
}
