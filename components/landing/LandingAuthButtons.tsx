'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { useSound } from '@/hooks/useSound';
import styles from './LandingHeader.module.css';

function LandingAuthButtonsInner() {
  const router = useRouter();
  const { login, authenticated } = usePrivy();
  const { play } = useSound();
  const loginTriggered = useRef(false);

  useEffect(() => {
    if (!authenticated || !loginTriggered.current) {
      return;
    }

    loginTriggered.current = false;
    router.push('/home');
  }, [authenticated, router]);

  const handleLogin = () => {
    loginTriggered.current = true;
    login();
  };

  const handleJoinNow = () => {
    login();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleLogin}
        onMouseEnter={() => play('hover')}
        className={styles.loginButton}
      >
        <span className={styles.slideWrap}>
          <span className={styles.slideText}>Login</span>
          <span className={`${styles.slideText} ${styles.slideClone}`}>Login</span>
        </span>
      </button>
      <button
        type="button"
        onClick={handleJoinNow}
        onMouseEnter={() => play('hover')}
        className={styles.joinButton}
      >
        <span className={styles.slideWrap}>
          <span className={styles.slideText}>Join Now</span>
          <span className={`${styles.slideText} ${styles.slideClone}`}>Join Now</span>
        </span>
      </button>
    </>
  );
}

export function LandingAuthButtons() {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'light',
          accentColor: '#5168FF',
        },
        loginMethods: ['wallet', 'email', 'farcaster'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <LandingAuthButtonsInner />
    </PrivyProvider>
  );
}
