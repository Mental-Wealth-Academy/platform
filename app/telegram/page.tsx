'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/components/button/Button';
import styles from './page.module.css';

type Step = 'linking' | 'verifying' | 'approved' | 'denied' | 'error';

export default function TelegramPage() {
  const { ready, authenticated, login, linkTelegram, user, getAccessToken } = usePrivy();

  const [step, setStep] = useState<Step | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const telegramAccount = useMemo(
    () => user?.linkedAccounts?.find((a: any) => a.type === 'telegram'),
    [user],
  );
  const hasTelegramLinked = !!telegramAccount;
  const telegramUsername = (telegramAccount as any)?.username || null;

  useEffect(() => {
    if (!ready) return;
    if (hasTelegramLinked && step === null) {
      setStep(null);
    }
  }, [ready, hasTelegramLinked, step]);

  const handleLinkTelegram = useCallback(async () => {
    setStep('linking');
    try {
      if (linkTelegram) {
        await linkTelegram();
      }
    } catch (err: any) {
      if (err?.message?.includes('already linked')) {
        setStep(null);
      } else {
        setStep('error');
        setErrorMessage(err?.message || 'Failed to link Telegram');
      }
    }
  }, [linkTelegram]);

  const handleVerify = useCallback(async () => {
    setStep('verifying');
    setErrorMessage(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setStep('error');
        setErrorMessage('Could not get auth token. Try signing in again.');
        return;
      }

      const res = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setStep('error');
        setErrorMessage(data.error || `Server error (${res.status})`);
        return;
      }

      setStep(data.approved ? 'approved' : 'denied');
    } catch (err) {
      setStep('error');
      setErrorMessage(err instanceof Error ? err.message : 'Verification request failed');
    }
  }, [getAccessToken]);

  const handleLogin = useCallback(() => {
    login({ loginMethods: ['telegram'] });
  }, [login]);

  if (!ready) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.spinner} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.icon}>
            {!authenticated && '🔐'}
            {authenticated && !hasTelegramLinked && '🔗'}
            {authenticated && hasTelegramLinked && step === null && '🎓'}
            {step === 'linking' && '🔗'}
            {step === 'verifying' && '⏳'}
            {step === 'approved' && '✅'}
            {step === 'denied' && '🚫'}
            {step === 'error' && '⚠️'}
          </div>

          <h1 className={styles.title}>Telegram Channel Access</h1>
          <p className={styles.subtitle}>
            Verify your Academic Angel NFT to access the private MWA Telegram group.
          </p>

          {!authenticated && (
            <>
              <p className={styles.description}>
                Sign in with Telegram to link your account and verify your NFT.
              </p>
              <Button fullWidth onClick={handleLogin}>
                Sign in with Telegram
              </Button>
            </>
          )}

          {authenticated && !hasTelegramLinked && (
            <>
              <p className={styles.description}>
                Link your Telegram account to your MWA profile. This connects your
                Telegram identity to your wallet so we can verify your NFT.
              </p>
              <Button fullWidth onClick={handleLinkTelegram}>
                Link Telegram Account
              </Button>
            </>
          )}

          {authenticated && hasTelegramLinked && step === null && (
            <>
              <div className={styles.badge}>
                ✅ Telegram linked
                {telegramUsername && <span> — @{telegramUsername}</span>}
              </div>
              <p className={styles.description}>
                Your Telegram account is linked. Click below to check your
                Academic Angel NFT and gain channel access.
              </p>
              <Button fullWidth onClick={handleVerify}>
                Verify Access
              </Button>
            </>
          )}

          {step === 'verifying' && (
            <>
              <div className={styles.spinner} />
              <p className={styles.description}>Checking NFT ownership on-chain...</p>
            </>
          )}

          {step === 'approved' && (
            <>
              <div className={styles.badge} data-variant="success">
                ✅ Access Granted
              </div>
              <p className={styles.description}>
                You&apos;re verified as an Academic Angel holder. Go back to
                Telegram and tap <strong>Join</strong> on the group — the bot will
                let you in automatically.
              </p>
            </>
          )}

          {step === 'denied' && (
            <>
              <div className={styles.badge} data-variant="error">
                ❌ No Academic Angel Found
              </div>
              <p className={styles.description}>
                The wallet linked to your Telegram account doesn&apos;t hold an
                Academic Angel NFT. You need one to access the group.
              </p>
              <Button fullWidth onClick={handleVerify}>
                Try Again
              </Button>
            </>
          )}

          {step === 'error' && (
            <>
              <div className={styles.badge} data-variant="error">
                ⚠️ Error
              </div>
              <p className={styles.description}>
                {errorMessage || 'Something went wrong during verification.'}
              </p>
              <Button fullWidth onClick={handleVerify}>
                Try Again
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
