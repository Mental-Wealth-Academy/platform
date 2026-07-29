import { getCurrentUserFromRequestCookie } from '@/lib/auth';
import { walletHasMembershipAccess } from '@/lib/membership-access';
import { isStaffUser } from '@/lib/staff-auth';
import MarketsClient from './MarketsClient';
import MarketsLockedPage from './MarketsLockedPage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function MarketsPage() {
  const user = await getCurrentUserFromRequestCookie();
  const hasVipMembershipCard = user
    ? await walletHasMembershipAccess(user.walletAddress)
    : false;

  // Staff already carry execution authority server-side, so gating the desk itself
  // against them only blocks testing. The allowlist stays the boundary.
  const isStaff = user ? isStaffUser(user) : false;

  if (!hasVipMembershipCard && !isStaff) {
    return <MarketsLockedPage />;
  }

  return <MarketsClient />;
}
