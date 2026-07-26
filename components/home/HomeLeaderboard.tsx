'use client';

import { useEffect, useState } from 'react';
import { useSound } from '@/hooks/useSound';
import styles from './HomeLeaderboard.module.css';
import UserProfileModal from './UserProfileModal';

interface LeaderboardUser {
  rank: number;
  username: string;
  avatarUrl: string | null;
  shards: number;
}

const MAX_ROWS = 3;

function formatShards(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default function HomeLeaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[] | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const { play } = useSound();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw: LeaderboardUser[] = Array.isArray(data?.users) ? data.users : [];
        const filtered = raw
          .filter((u) => u.username?.toLowerCase() !== 'blue')
          .map((u, i) => ({ ...u, rank: i + 1 }));
        setUsers(filtered);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const rows = (users ?? []).slice(0, MAX_ROWS);

  return (
    <>
      <button
        type="button"
        className={styles.card}
        aria-label="Open leaderboard"
        onMouseEnter={() => play('soft-hover')}
        onClick={() => setOpen(true)}
      >
        <div className={styles.header}>
          <span className={styles.title}>Leaderboard</span>
          <span className={styles.viewAll}>view all</span>
        </div>
        {users === null ? (
          <div className={styles.empty}>loading</div>
        ) : rows.length === 0 ? (
          <div className={styles.empty}>no rankings yet</div>
        ) : (
          <div className={styles.rows}>
            {rows.map((u) => (
              <div 
                key={u.rank} 
                className={styles.row}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUsername(u.username);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className={styles.rank}>{u.rank}</span>
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.avatar} src={u.avatarUrl} alt="" />
                ) : (
                  <span className={styles.avatar} />
                )}
                <span className={styles.name}>{u.username}</span>
                <span className={styles.shards}>{formatShards(u.shards)}</span>
              </div>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div
          className={styles.modalOverlay}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Leaderboard"
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Leaderboard</span>
            </div>
            <div className={styles.modalList}>
              {(users ?? []).map((u) => (
                <div 
                  key={u.rank} 
                  className={styles.modalRow}
                  onClick={() => setSelectedUsername(u.username)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className={styles.modalRank}>{u.rank}</span>
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={styles.modalAvatar} src={u.avatarUrl} alt="" />
                  ) : (
                    <span className={styles.modalAvatar} />
                  )}
                  <span className={styles.modalName}>{u.username}</span>
                  <span className={styles.modalShards}>{u.shards.toLocaleString()}</span>
                </div>
              ))}
              {users && users.length === 0 && (
                <div className={styles.modalEmpty}>no rankings yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedUsername && (
        <UserProfileModal 
          username={selectedUsername} 
          onClose={() => setSelectedUsername(null)} 
        />
      )}
    </>
  );
}
