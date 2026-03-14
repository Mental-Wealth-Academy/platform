import { NextResponse } from 'next/server';
import { isDbConfigured, sqlQuery } from '@/lib/db';

/**
 * POST /api/voting/proposal/cleanup
 *
 * Admin-only: Deletes stale/expired proposals and their reviews.
 * Requires INTERNAL_API_SECRET header.
 */
export async function POST(request: Request) {
  const internalSecret = request.headers.get('x-internal-secret');
  if (!internalSecret || internalSecret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { walletAddress } = body;

    // Find stale proposals for this wallet (or all if no wallet specified)
    const whereClause = walletAddress
      ? `WHERE LOWER(p.wallet_address) = LOWER(:walletAddress) AND p.status IN ('pending_review', 'expired')`
      : `WHERE p.status IN ('pending_review', 'expired') AND p.created_at < NOW() - INTERVAL '24 hours'`;

    const staleProposals = await sqlQuery<Array<{ id: string; title: string; status: string; created_at: string; wallet_address: string }>>(
      `SELECT p.id, p.title, p.status, p.created_at, p.wallet_address
       FROM proposals p
       ${whereClause}
       ORDER BY p.created_at DESC`,
      walletAddress ? { walletAddress } : {}
    );

    if (staleProposals.length === 0) {
      return NextResponse.json({ ok: true, message: 'No stale proposals found.', deleted: 0 });
    }

    const ids = staleProposals.map(p => p.id);

    // Delete reviews first (FK), then proposals
    for (const id of ids) {
      await sqlQuery(`DELETE FROM proposal_reviews WHERE proposal_id = :id`, { id });
      await sqlQuery(`DELETE FROM proposals WHERE id = :id`, { id });
    }

    return NextResponse.json({
      ok: true,
      deleted: ids.length,
      proposals: staleProposals.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.created_at,
        walletAddress: p.wallet_address,
      })),
    });
  } catch (error) {
    console.error('Error cleaning up proposals:', error);
    return NextResponse.json({ error: 'Failed to clean up proposals.' }, { status: 500 });
  }
}
