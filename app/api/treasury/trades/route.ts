import { NextResponse } from 'next/server';
import { fetchPolymarketTrades } from '@/lib/market-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const trades = await fetchPolymarketTrades();
    return NextResponse.json(trades);
  } catch (err) {
    console.error('GET /api/treasury/trades error:', err);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 502 });
  }
}
