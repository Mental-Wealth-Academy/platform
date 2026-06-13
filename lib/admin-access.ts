import { NextResponse } from 'next/server';
import { getCurrentUserFromRequestCookie } from './auth';
import { VIP_MEMBERSHIP_CARD_ADDRESS, walletHoldsVipMembershipCard } from './vip-membership-card';

export async function requireVipAdmin(_request: Request): Promise<NextResponse | null> {
  const user = await getCurrentUserFromRequestCookie();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const hasVipMembershipCard = await walletHoldsVipMembershipCard(user.walletAddress);
  if (!hasVipMembershipCard) {
    return NextResponse.json(
      {
        error: 'VIP membership required',
        contractAddress: VIP_MEMBERSHIP_CARD_ADDRESS,
      },
      { status: 403 },
    );
  }

  return null;
}
