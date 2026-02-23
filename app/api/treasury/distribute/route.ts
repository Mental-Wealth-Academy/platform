import { NextResponse } from 'next/server';
import { getAppleHolders } from '@/lib/apple-holders';
import { azuraWallet } from '@/lib/azura-wallet';
import { getClobBalance } from '@/lib/polymarket-clob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/treasury/distribute
 * Admin-only endpoint to distribute trading profits to APPLE holders.
 * 80% of epoch profits → USDC to holders on Base, 20% retained.
 */
export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the body with epoch P&L data
    const body = await request.json();
    const epochPnL = parseFloat(body.epochPnL);

    if (isNaN(epochPnL) || epochPnL <= 0) {
      return NextResponse.json({
        success: false,
        message: 'No profit to distribute (epochPnL must be positive)',
        epochPnL: epochPnL || 0,
      });
    }

    // 80% goes to holders, 20% retained
    const distributableAmount = epochPnL * 0.80;
    const retained = epochPnL * 0.20;

    // Get holder snapshot
    const snapshot = await getAppleHolders();

    if (snapshot.totalHolders === 0) {
      return NextResponse.json({
        success: false,
        message: 'No eligible APPLE holders found',
      });
    }

    // Calculate per-holder amounts (USDC has 6 decimals)
    const USDC_DECIMALS = 6;
    const recipients = snapshot.holders
      .map(h => ({
        address: h.address,
        amount: BigInt(Math.floor(distributableAmount * h.share * 10 ** USDC_DECIMALS)).toString(),
      }))
      .filter(r => BigInt(r.amount) > 0n);

    // Execute batch distribution
    const { txHashes, failed } = await azuraWallet.distributeUSDC(recipients);

    return NextResponse.json({
      success: true,
      epochPnL,
      distributed: distributableAmount,
      retained,
      totalHolders: snapshot.totalHolders,
      recipientsProcessed: recipients.length,
      txHashes,
      failed,
      blockNumber: snapshot.blockNumber,
    });
  } catch (err) {
    console.error('POST /api/treasury/distribute error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Distribution failed' },
      { status: 500 },
    );
  }
}
