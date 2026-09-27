'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { DotmSquare3 } from '@/components/dot-matrix/DotmSquare3';
import dynamic from 'next/dynamic';
import { useSound } from '@/hooks/useSound';
import Image from 'next/image';
import { setSimulationAccessTokenProvider } from '@/lib/simulation-api';
import CtaButton from '@/components/shared/CtaButton';
import SimulationWorkspace from './SimulationWorkspace';
import styles from './simulation.module.css';

const ProMembershipModal = dynamic(() => import('@/components/pro-membership-modal/ProMembershipModal'), { ssr: false });

/**
 * Access gate for /simulation. Browsing worlds only needs a signed-in
 * account. Building/rebuilding a graph or starting a new world is what
 * costs compute, so those actions are gated behind Pro/VIP membership
 * (GET /api/account/status -> hasVipMembershipCard) inside the workspace
 * itself via the `canEdit` prop, not at the page level.
 */
// Local-dev escape hatch: when Privy can't run locally (its domain allowlist
// blocks localhost), set NEXT_PUBLIC_SIMULATION_DEV_BYPASS=true to skip the gate.
// Hard-guarded to non-production so it can never open the gate in a real build.
const DEV_BYPASS =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_SIMULATION_DEV_BYPASS === 'true';

export default function SimulationGate() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const { play } = useSound();

  // Bootstrap from localStorage so returning VIP users skip the loading flash.
  const [isVip, setIsVip] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const cached = localStorage.getItem('simulation_vip');
      if (cached) {
        const { vip, ts } = JSON.parse(cached);
        if (vip && Date.now() - ts < 120_000) return true;
      }
    } catch { /* ignore */ }
    return false;
  });
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      setSimulationAccessTokenProvider(null);
      setIsVip(false);
      return;
    }
    // All workspace calls pass through the authenticated server-side proxy.
    // Keep token retrieval live so longer simulations survive token refreshes.
    setSimulationAccessTokenProvider(getAccessToken);
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/account/status', {
          credentials: 'include',
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = res.ok ? await res.json().catch(() => null) : null;
        const vip = data?.hasVipMembershipCard === true;
        if (!cancelled) {
          setIsVip(vip);
          if (vip) {
            try { localStorage.setItem('simulation_vip', JSON.stringify({ vip: true, ts: Date.now() })); } catch { /* ignore */ }
          } else {
            try { localStorage.removeItem('simulation_vip'); } catch { /* ignore */ }
          }
        }
      } catch {
        if (!cancelled) setIsVip(false);
      }
    })();
    return () => {
      cancelled = true;
      setSimulationAccessTokenProvider(null);
    };
  }, [ready, authenticated, getAccessToken]);

  // Re-check when membership/login changes elsewhere in the app.
  useEffect(() => {
    const recheck = () => setIsVip(false);
    window.addEventListener('vipMembershipUpdated', recheck);
    return () => window.removeEventListener('vipMembershipUpdated', recheck);
  }, []);

  const requireUpgrade = useCallback(() => {
    play('error');
    setModalOpen(true);
  }, [play]);

  // All hooks above run unconditionally; this early return is safe.
  if (DEV_BYPASS) return <SimulationWorkspace canEdit onRequireUpgrade={requireUpgrade} />;

  if (!ready) {
    return (
      <div className={styles.gateState}>
        <div className={styles.loaderBlock} aria-live="polite">
          <DotmSquare3 speed={0.9} dotSize={5} gap={3} />
          <p className={styles.muted}>Checking access…</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className={styles.lockedCard}>
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
        <h1 className={styles.lockedTitle}>Simulated Pocket Worlds</h1>
        <p className={styles.lockedText}>
          Explore autonomous agent worlds and watch the futures they produce.
        </p>
        <CtaButton
          variant="primary"
          size="md"
          onClick={() => {
            play('click');
            login();
          }}
          onMouseEnter={() => play('hover')}
        >
          Sign in to continue
        </CtaButton>
      </div>
    );
  }

  return (
    <>
      <SimulationWorkspace canEdit={isVip} onRequireUpgrade={requireUpgrade} />
      <ProMembershipModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
