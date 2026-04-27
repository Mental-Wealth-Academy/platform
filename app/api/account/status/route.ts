import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured, sqlQuery } from '@/lib/db';
import { walletHoldsVipMembershipCard } from '@/lib/soul-key';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/account/status
 * Checks if the current user has a linked blockchain account
 */
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  await ensureForumSchema();

  // Get our internal user record (authenticated via wallet address)
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json(
      { error: 'Not signed in.' }, 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const hasLinkedAccount = !!user.walletAddress;
    const hasVipMembershipCard = hasLinkedAccount
      ? await walletHoldsVipMembershipCard(user.walletAddress)
      : false;

    return NextResponse.json(
      {
        hasLinkedAccount,
        hasVipMembershipCard,
        walletAddress: user.walletAddress || undefined,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Error checking account status:', err);
    return NextResponse.json(
      { error: 'Failed to check account status.' },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
