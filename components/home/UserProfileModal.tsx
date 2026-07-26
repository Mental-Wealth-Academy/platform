'use client';

import { useEffect, useState } from 'react';
import styles from './UserProfileModal.module.css';

interface UserProfileModalProps {
  username: string;
  onClose: () => void;
}

interface ProfileData {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  fieldNotes: number;
  questsCompleted: number;
  diamonds: number;
  bitcoin: number;
  usdc: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function UserProfileModal({ username, onClose }: UserProfileModalProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/leaderboard/profile/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled && !res.error) {
          setData(res);
        }
      })
      .catch((e) => console.error('Error fetching profile:', e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="User Profile"
    >
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.modalClose}
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        {loading || !data ? (
          <div className={styles.loading}>Loading profile...</div>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.avatarContainer}>
                {data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.avatar} src={data.avatarUrl} alt="" />
                ) : (
                  <div className={styles.avatar} />
                )}
              </div>
              <div className={styles.username}>{data.username}</div>
            </div>

            <div className={styles.bio}>
              {data.bio || "No bio yet."}
            </div>

            <div className={styles.contentBody}>
              {/* Top stats grid: Field Notes & Quests */}
              <div className={styles.statsGrid}>
                <div className={`${styles.tactileCard} ${styles.topStatCard}`}>
                  <div className={styles.statHeader}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/notebook-writing.svg" alt="" className={styles.statIcon} />
                    <span className={styles.statLabel}>Field Notes</span>
                  </div>
                  <span className={styles.statValue}>{data.fieldNotes.toLocaleString()}</span>
                </div>

                <div className={`${styles.tactileCard} ${styles.topStatCard}`}>
                  <div className={styles.statHeader}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/nav-quests-v3.svg" alt="" className={styles.statIcon} />
                    <span className={styles.statLabel}>Quests</span>
                  </div>
                  <span className={styles.statValue}>{data.questsCompleted.toLocaleString()}</span>
                </div>
              </div>

              {/* Currencies section: Diamonds, Bitcoin */}
              <div className={styles.currenciesSection}>
                <div className={`${styles.tactileCard} ${styles.currencyRow}`}>
                  <div className={styles.currencyLeft}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/ui-diamond.svg" alt="" className={styles.currencyIcon} />
                    <span className={styles.currencyName}>Diamonds</span>
                  </div>
                  <span className={`${styles.currencyValue} ${styles.diamondsValue}`}>
                    {formatTokens(data.diamonds)}
                  </span>
                </div>

                <div className={`${styles.tactileCard} ${styles.currencyRow}`}>
                  <div className={styles.currencyLeft}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/tokens/cbbtc.webp" alt="" className={styles.currencyIcon} />
                    <span className={styles.currencyName}>Bitcoin</span>
                  </div>
                  <span className={`${styles.currencyValue} ${styles.btcValue}`}>
                    {formatTokens(data.bitcoin)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
