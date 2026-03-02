'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAccount, useDisconnect, useSignMessage, useConnect } from 'wagmi';
import { getWalletAuthHeaders } from '@/lib/wallet-api';
import styles from './CreateAccountButton.module.css';

type MeResponse = { user: { id: string; username: string; avatarUrl: string | null } | null };

async function uploadIfPresent(file: File | null) {
  if (!file) return null;
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || 'Upload failed');
  }
  return (await res.json()) as { url: string; mime: string };
}

const CreateAccountButton: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { connect, connectors } = useConnect();
  const [me, setMe] = useState<MeResponse['user']>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshMe() {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const data = (await res.json()) as MeResponse;
    setMe(data.user);
    if (data.user) setUsername(data.user.username);
  }

  useEffect(() => {
    refreshMe().catch(() => {});
  }, []);

  // Refresh user data when wallet connects
  useEffect(() => {
    if (isConnected) {
      refreshMe().catch(() => {});
    }
  }, [isConnected]);

  const handleConnectWallet = () => {
    const connector = connectors[0];
    if (connector) connect({ connector });
  };

  async function handleSave() {
    if (!isConnected || !address) {
      // Connect wallet
      handleConnectWallet();
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const uploaded = await uploadIfPresent(avatarFile);

      if (!me) {
        // New account creation via wallet
        const res = await fetch('/api/auth/wallet-signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getWalletAuthHeaders(address, signMessageAsync)),
          },
          body: JSON.stringify({
            walletAddress: address,
            username,
            avatarUrl: uploaded?.url ?? null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Signup failed');
      } else {
        // Profile update
        const res = await fetch('/api/me', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...(await getWalletAuthHeaders(address, signMessageAsync)),
          },
          body: JSON.stringify({
            username,
            avatarUrl: uploaded?.url ?? me.avatarUrl,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Update failed');
      }

      await refreshMe();
      setAvatarFile(null);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    // Disconnect wallet
    disconnect();
    // Also clear our session
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setMe(null);
    setUsername('');
    setAvatarFile(null);
    setOpen(false);
  }

  const handleOpen = () => {
    if (!isConnected) {
      // Connect wallet
      handleConnectWallet();
      return;
    }
    setOpen(true);
  }

  async function handleGoogleSignup() {
    setError(null);
    // TODO: Implement Google OAuth flow
    // For now, redirect to Google OAuth endpoint when it's implemented
    try {
      // This will be implemented when Google OAuth backend is ready
      const response = await fetch('/api/auth/google/initiate', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      } else {
        setError('Google sign-up is not yet available. Please connect your wallet to create an account.');
      }
    } catch (e: any) {
      setError('Google sign-up is not yet available. Please connect your wallet to create an account.');
    }
  }

  return (
    <>
      <button
        className={styles.createAccountButton}
        data-intro="create-account"
        onClick={handleOpen}
        type="button"
      >
        <span className={styles.buttonText}>{me ? `Welcome ${me.username}!` : 'Create Account'}</span>
        <div className={styles.logo}>
          {me?.avatarUrl ? (
            <Image src={me.avatarUrl} alt={me.username} width={26} height={26} className={styles.logoImg} />
          ) : (
            <div className={styles.logoFallback} />
          )}
        </div>
      </button>

      {open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{me ? 'Edit profile' : 'Create account'}</div>
              <button className={styles.modalClose} type="button" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <label className={styles.label}>
                Username
                <input
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="letters/numbers/underscore"
                />
              </label>
              <label className={styles.label}>
                Avatar (png/jpg/gif/webp)
                <input
                  className={styles.input}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </label>
              {error && <div className={styles.error}>{error}</div>}
              
              {!me && (
                <div className={styles.googleSignupContainer}>
                  <div className={styles.divider}>
                    <span className={styles.dividerText}>or</span>
                  </div>
                  <button
                    type="button"
                    className={styles.googleButton}
                    onClick={handleGoogleSignup}
                    disabled={saving}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H15.9564C17.4382 14.5227 18.3409 12.5545 18.3409 9.20454H17.64Z" fill="#4285F4"/>
                      <path d="M9 18C11.43 18 13.467 17.1941 14.9564 15.8195L11.0477 13.5613C10.2418 14.1013 9.21091 14.4204 9 14.4204C6.65455 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40681 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65455 3.57955 9 3.57955Z" fill="#EA4335"/>
                    </svg>
                    Sign up with Google
                  </button>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              {me && (
                <button className={styles.secondaryButton} type="button" onClick={handleLogout} disabled={saving}>
                  Log out
                </button>
              )}
              <button className={styles.secondaryButton} type="button" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button className={styles.primaryButton} type="button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateAccountButton;

