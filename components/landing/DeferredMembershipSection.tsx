'use client';

import dynamic from 'next/dynamic';

const LandingMembershipSection = dynamic(
  () => import('./LandingMembershipSection').then((mod) => mod.LandingMembershipSection),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: '100vh' }} aria-hidden />,
  },
);

/**
 * The membership section carries the whole Privy/wagmi provider stack, because
 * its checkout button reads usePrivy at render. Importing it straight into the
 * page put that stack in the route's initial chunk, so a visitor paid for the
 * wallet SDK before the page could paint.
 *
 * This section is the page's only content, so it is not gated on scroll the way
 * the landing page's below-the-fold sections are — it mounts as soon as its
 * chunk resolves, and the placeholder holds the height so the swap does not
 * shift layout.
 */
export function DeferredMembershipSection() {
  return <LandingMembershipSection />;
}

export default DeferredMembershipSection;
