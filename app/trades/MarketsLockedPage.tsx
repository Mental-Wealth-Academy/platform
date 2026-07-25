'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
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
          <span className={styles.lockedEyebrow}>VIP Access</span>
          <h1 id="markets-locked-title" className={styles.lockedTitle}>
            Trades is reserved for VIP members.
          </h1>
          <p className={styles.lockedCopy}>
            The live trading desk, Blue trading chat, execution history, and treasury routing
            unlock when your signed-in wallet holds the VIP Membership Card.
          </p>
          <div className={styles.lockedActions}>
            <button
              type="button"
              className={styles.lockedPrimaryButton}
              onClick={handlePrimaryAction}
              disabled={!ready}
            >
              {!ready ? 'Checking...' : authenticated ? 'Get VIP access' : 'Sign in'}
            </button>
            <button
              type="button"
              className={styles.lockedSecondaryButton}
              onClick={() => router.refresh()}
            >
              Check access
            </button>
          </div>
        </section>
      </div>
      <ProMembershipModal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} />
    </main>
  );
}
