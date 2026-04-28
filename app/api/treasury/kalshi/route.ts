import { NextResponse } from 'next/server';
import { fetchCategorizedMarkets } from '@/lib/market-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const markets = await fetchCategorizedMarkets();
    return NextResponse.json(markets, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
      },
    });
  } catch (err) {
    console.error('GET /api/treasury/kalshi error:', err);
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 502 });
  }
}
