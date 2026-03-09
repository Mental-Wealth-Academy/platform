import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/voting/proposal/review-sweep
 *
 * Safety net: finds proposals stuck in 'pending_review' for more than 2 minutes
 * and re-triggers the review for each one. Called by Vercel cron or manually.
 */
export async function POST(request: Request) {
  // Accept either x-internal-secret (internal calls) or Authorization: Bearer (Vercel cron)
  const internalSecret = request.headers.get('x-internal-secret');
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isInternalAuth = internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isInternalAuth && !isCronAuth) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  try {
    const stuckProposals = await sqlQuery<Array<{ id: string; title: string; created_at: string }>>(
      `SELECT id, title, created_at FROM proposals
       WHERE status = 'pending_review'
       AND created_at < NOW() - INTERVAL '2 minutes'
       ORDER BY created_at ASC
       LIMIT 10`,
      {}
    );

    if (stuckProposals.length === 0) {
      return NextResponse.json({ ok: true, swept: 0 });
    }

    const baseUrl = request.url.split('/api')[0];
    const results: Array<{ id: string; title: string; success: boolean }> = [];

    for (const proposal of stuckProposals) {
      try {
        const res = await fetch(`${baseUrl}/api/voting/proposal/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({ proposalId: proposal.id }),
        });
        results.push({ id: proposal.id, title: proposal.title, success: res.ok });
        if (!res.ok) {
          console.error(`Sweep: review failed for ${proposal.id} (${res.status})`);
        }
      } catch (error) {
        console.error(`Sweep: review error for ${proposal.id}:`, error);
        results.push({ id: proposal.id, title: proposal.title, success: false });
      }
    }

    console.log(`Review sweep complete: ${results.filter(r => r.success).length}/${results.length} succeeded`);
    return NextResponse.json({ ok: true, swept: results.length, results });
  } catch (error) {
    console.error('Review sweep error:', error);
    return NextResponse.json({ error: 'Sweep failed.' }, { status: 500 });
  }
}
