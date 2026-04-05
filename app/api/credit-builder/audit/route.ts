import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureCreditBuilderSchema } from '@/lib/ensureCreditBuilderSchema';
import { analyzeCreditProfile } from '@/lib/credit-builder-ai';
import type { CreditData } from '@/types/credit-builder';

export async function POST() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureCreditBuilderSchema();

  // Get user's credit profile
  const rows = await sqlQuery<Array<{ id: string; credit_data: CreditData }>>(
    'SELECT id, credit_data FROM credit_profiles WHERE user_id = :userId',
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No credit profile found. Complete the intake step first.' }, { status: 404 });
  }

  const profile = rows[0];
  const creditData = profile.credit_data;

  if (!creditData.scores || creditData.scores.length === 0) {
    return NextResponse.json({ error: 'Credit scores are required for an audit. Please enter at least one score.' }, { status: 400 });
  }

  try {
    const auditResult = await analyzeCreditProfile(creditData);

    // Save audit result and advance step
    await sqlQuery(
      `UPDATE credit_profiles SET audit_result = :auditResult::jsonb, current_step = 'audit' WHERE id = :profileId`,
      { auditResult: JSON.stringify(auditResult), profileId: profile.id }
    );

    return NextResponse.json({ auditResult });
  } catch (err) {
    console.error('[CreditBuilder] Audit failed:', err);
    return NextResponse.json({ error: 'Credit audit failed. Please try again.' }, { status: 500 });
  }
}
