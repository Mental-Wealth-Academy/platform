import { NextResponse } from 'next/server';
import { fetchPrices } from '@/lib/market-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prices = await fetchPrices();
    return NextResponse.json(prices);
  } catch (err) {
    console.error('GET /api/treasury/prices error:', err);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 502 });
  }
}
