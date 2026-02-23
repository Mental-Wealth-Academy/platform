import { NextResponse } from 'next/server';
import { fetchApplePrice, type AppleTokenStats } from '@/lib/market-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/treasury/apple-stats
 * Returns APPLE token price, holder count, epoch P&L, and next distribution time.
 */
export async function GET() {
  try {
    const price = await fetchApplePrice();

    // These would come from a database in production;
    // for now return what we can compute on-chain + reasonable defaults
    const stats: AppleTokenStats = {
      price,
      holders: 0,
      epochPnL: 0,
      nextDistribution: 'Sunday 00:00 UTC',
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('GET /api/treasury/apple-stats error:', err);
    return NextResponse.json({ error: 'Failed to fetch APPLE stats' }, { status: 502 });
  }
}
