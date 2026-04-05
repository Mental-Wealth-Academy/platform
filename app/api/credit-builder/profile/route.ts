import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureCreditBuilderSchema } from '@/lib/ensureCreditBuilderSchema';
import type { CreditData, CreditStep } from '@/types/credit-builder';

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const rows = await sqlQuery<Array<{
    id: string;
    current_step: CreditStep;
    credit_data: CreditData;
    audit_result: any;
    created_at: string;
    updated_at: string;
  }>>(
    'SELECT id, current_step, credit_data, audit_result, created_at, updated_at FROM credit_profiles WHERE user_id = :userId',
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ profile: null });
  }

  const row = rows[0];

  // Get dispute counts
  const disputeCounts = await sqlQuery<Array<{ status: string; count: string }>>(
    `SELECT status, COUNT(*) as count FROM credit_disputes WHERE profile_id = :profileId GROUP BY status`,
    { profileId: row.id }
  );

  const disputes = {
    total: 0,
    draft: 0,
    sent: 0,
    pending_response: 0,
    resolved_positive: 0,
    resolved_negative: 0,
    escalated: 0,
  };
  for (const d of disputeCounts) {
    const count = parseInt(d.count, 10);
    disputes[d.status as keyof typeof disputes] = count;
    disputes.total += count;
  }

  return NextResponse.json({
    profile: {
      id: row.id,
      userId: user.id,
      currentStep: row.current_step,
      creditData: row.credit_data,
      auditResult: row.audit_result,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
    disputes,
  });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  const body = await request.json();
  const creditData: CreditData = body.creditData;
  const step: CreditStep = body.step || 'intake';

  if (!creditData) {
    return NextResponse.json({ error: 'creditData is required' }, { status: 400 });
  }

  // Upsert profile
  const rows = await sqlQuery<Array<{ id: string }>>(
    `INSERT INTO credit_profiles (id, user_id, current_step, credit_data)
     VALUES (gen_random_uuid()::text, :userId, :step, :creditData::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
       credit_data = :creditData::jsonb,
       current_step = :step
     RETURNING id`,
    { userId: user.id, step, creditData: JSON.stringify(creditData) }
  );

  return NextResponse.json({ profileId: rows[0].id, step });
}
