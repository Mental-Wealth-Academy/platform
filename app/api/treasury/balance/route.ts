import { NextResponse } from 'next/server';
import { fetchTreasuryBalance } from '@/lib/market-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const balance = await fetchTreasuryBalance();
    return NextResponse.json(balance);
  } catch (err) {
    console.error('GET /api/treasury/balance error:', err);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 502 });
  }
}
