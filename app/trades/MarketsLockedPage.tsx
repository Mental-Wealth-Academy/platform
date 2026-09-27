'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
import CtaButton from '@/components/shared/CtaButton';
import styles from './page.module.css';

const ProMembershipModal = dynamic(() => import('@/components/pro-membership-modal/ProMembershipModal'), { ssr: false });

export default function MarketsLockedPage() {
  const router = useRouter();
  const { authenticated, login, ready } = usePrivy();
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const loginRequestedRef = useRef(false);

  useEffect(() => {
    const refreshAccess = () => router.refresh();

    window.addEventListener('vipMembershipUpdated', refreshAccess);
    window.addEventListener('userLoggedIn', refreshAccess);

    return () => {
      window.removeEventListener('vipMembershipUpdated', refreshAccess);
      window.removeEventListener('userLoggedIn', refreshAccess);
    };
  }, [router]);

  useEffect(() => {
    if (!ready || !authenticated || !loginRequestedRef.current) return;
    loginRequestedRef.current = false;
    router.refresh();
  }, [authenticated, ready, router]);

  const handlePrimaryAction = () => {
    if (!ready) return;
    if (!authenticated) {
      loginRequestedRef.current = true;
      void login();
      return;
    }
    setIsMembershipOpen(true);
  };

  return (
    <main className={styles.main}>
      <div className={styles.lockedPageLayout}>
        <section className={styles.lockedPanel} aria-labelledby="markets-locked-title">
          <div className={styles.lockedAvatarWrap}>
            <Image
              src="/exxie.png"
              alt="Daemon"
              width={120}
              height={140}
              className={styles.lockedAvatar}
              priority
            />
          </div>
          <h1 id="markets-locked-title" className={styles.lockedTitle}>
            Live Trading Desk
          </h1>
          <p className={styles.lockedCopy}>
            Watch Blue execute treasury trades, debate market moves, and log desk history.
          </p>
          <div className={styles.lockedActions}>
            <CtaButton
              variant="primary"
              size="md"
              onClick={handlePrimaryAction}
              disabled={!ready}
              className={styles.lockedPrimaryButton}
            >
              {!ready ? 'Checking...' : authenticated ? 'Get VIP access' : 'Sign in to continue'}
            </CtaButton>
          </div>
        </section>
      </div>
      <ProMembershipModal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} />
    </main>
  );
}
