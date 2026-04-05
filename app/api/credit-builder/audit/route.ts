import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { ensureCreditBuilderSchema } from '@/lib/ensureCreditBuilderSchema';
import { analyzeCreditProfile } from '@/lib/credit-builder-ai';
import { decryptForUser } from '@/lib/encrypt';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import type { CreditData } from '@/types/credit-builder';

const ENCRYPT_DOMAIN = 'credit-builder';

export async function POST() {
  if (!isDbConfigured()) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  const user = await getCurrentUserFromRequestCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: 3 audits per hour (AI-expensive + shard-gated)
  const rl = checkRateLimit({ max: 3, windowMs: 60 * 60 * 1000, identifier: `credit-audit:${user.id}` });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Audit limit reached. Try again later.' }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  await ensureCreditBuilderSchema();

  // Get user's credit profile
  const rows = await sqlQuery<Array<{ id: string; credit_data: string }>>(
    'SELECT id, credit_data::text FROM credit_profiles WHERE user_id = :userId',
    { userId: user.id }
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No credit profile found. Complete the intake step first.' }, { status: 404 });
  }

  const profile = rows[0];

  // Decrypt credit data
  let creditData: CreditData;
  try {
    const raw = typeof profile.credit_data === 'string' && profile.credit_data.includes(':')
      ? decryptForUser(user.id, profile.credit_data, ENCRYPT_DOMAIN)
      : profile.credit_data;
    creditData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    creditData = typeof profile.credit_data === 'string' ? JSON.parse(profile.credit_data) : profile.credit_data;
  }

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
