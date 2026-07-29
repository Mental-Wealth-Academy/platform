import { NextResponse } from 'next/server';
import { ensureForumSchema } from '@/lib/ensureForumSchema';
import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { isDbConfigured } from '@/lib/db';
import { walletHasMembershipAccess } from '@/lib/membership-access';
import { walletHoldsAcademicAngel } from '@/lib/academic-angels';
import { isStaffUser } from '@/lib/staff-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/account/status
 * Checks if the current user has a linked blockchain account
 */
export async function GET(request: Request) {
  const requestedWallet = new URL(request.url).searchParams.get('walletAddress');
  if (requestedWallet && /^0x[a-fA-F0-9]{40}$/.test(requestedWallet)) {
    try {
      const [hasVipMembershipCard, hasAcademicAngel] = await Promise.all([
        walletHasMembershipAccess(requestedWallet),
        walletHoldsAcademicAngel(requestedWallet),
      ]);
      return NextResponse.json(
        {
          hasLinkedAccount: false,
          hasVipMembershipCard,
          hasAcademicAngel,
          walletAddress: requestedWallet,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err: any) {
      console.error('Error checking wallet account status:', err);
      return NextResponse.json(
        { error: 'Failed to check account status.' },
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: 'Database is not configured on the server.' },
      { status: 503 }
    );
  }
  try {
    await ensureForumSchema();
  } catch (error) {
    console.error('[api/account/status] Schema initialization failed:', error);
    return NextResponse.json(
      { error: 'Account status is temporarily unavailable.', code: 'ACCOUNT_STATUS_UNAVAILABLE' },
      { status: 500 }
    );
  }

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
    const checkedWalletAddress = user.walletAddress;
    const hasLinkedAccount = !!user.walletAddress;
    const [hasVipMembershipCard, hasAcademicAngel] = checkedWalletAddress
      ? await Promise.all([
          walletHasMembershipAccess(checkedWalletAddress),
          walletHoldsAcademicAngel(checkedWalletAddress),
        ])
      : [false, false];

    return NextResponse.json(
      {
        hasLinkedAccount,
        hasVipMembershipCard,
        hasAcademicAngel,
        isStaff: isStaffUser(user),
        walletAddress: checkedWalletAddress || undefined,
        linkedWalletAddress: user.walletAddress || undefined,
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
