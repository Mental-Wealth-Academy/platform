import { NextResponse } from 'next/server';
import { deployAppleToken } from '@/lib/clanker-deploy';
import { azuraWallet } from '@/lib/azura-wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/treasury/deploy-apple
 * Admin-only endpoint to deploy the APPLE token via Clanker.
 * Requires ADMIN_SECRET header for authorization.
 */
export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const walletAddress = await azuraWallet.getWalletAddress();
    const result = await deployAppleToken(walletAddress);

    return NextResponse.json({
      success: true,
      tokenAddress: result.expectedAddress,
      poolAddress: result.poolAddress,
      txHash: result.txHash,
      message: `APPLE token deployed. Set APPLE_TOKEN_ADDRESS=${result.expectedAddress} in env.`,
    });
  } catch (err) {
    console.error('POST /api/treasury/deploy-apple error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Deployment failed' },
      { status: 500 },
    );
  }
}
