import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureCreditBuilderSchema } from '@/lib/ensureCreditBuilderSchema';
import type { BusinessPhaseId, BusinessPhaseData } from '@/types/credit-builder';

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const rows = await sqlQuery<Array<{
    id: string;
    current_phase: BusinessPhaseId;
    phase_data: BusinessPhaseData;
    created_at: string;
    updated_at: string;
  }>>(
    'SELECT id, current_phase, phase_data, created_at, updated_at FROM credit_business_progress WHERE user_id = :userId',
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ progress: null });
  }

  const row = rows[0];
  return NextResponse.json({
    progress: {
      id: row.id,
      currentPhase: row.current_phase,
      phaseData: row.phase_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const body = await request.json();
  const { phase, phaseData } = body as {
    phase?: BusinessPhaseId;
    phaseData?: BusinessPhaseData;
  };

  const currentPhase = phase || 'foundation';
  const data = phaseData || {};

  const rows = await sqlQuery<Array<{ id: string }>>(
    `INSERT INTO credit_business_progress (id, user_id, current_phase, phase_data)
     VALUES (gen_random_uuid()::text, :userId, :currentPhase, :phaseData::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
       current_phase = :currentPhase,
       phase_data = :phaseData::jsonb
     RETURNING id`,
    { userId: user.id, currentPhase, phaseData: JSON.stringify(data) }
  );

  // Advance credit profile step
  await sqlQuery(
    `UPDATE credit_profiles SET current_step = 'business' WHERE user_id = :userId AND current_step IN ('intake', 'audit', 'disputes', 'tracking')`,
    { userId: user.id }
  );

  return NextResponse.json({ id: rows[0].id, phase: currentPhase });
}
