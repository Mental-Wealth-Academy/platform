'use client';

import { useEffect, useState } from 'react';
import UserProfileModal from '@/components/home/UserProfileModal';
import styles from './UpcomingEvent.module.css';

interface LeaderboardUser {
  rank: number;
  username: string;
  avatarUrl: string | null;
  shards: number;
}

function formatCredits(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export default function UpcomingEvent() {
  const [users, setUsers] = useState<LeaderboardUser[] | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

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

  const topUsers = (users ?? []).slice(0, 5);

  return (
    <>
      <section className={styles.card} aria-labelledby="leaderboard-title">
        <div className={styles.header}>
          <span className={styles.kanji} lang="ja">成績</span>
          <span id="leaderboard-title" className={styles.headerTitle}>Leaderboard</span>
        </div>
        <div className={styles.body}>
          {users === null ? (
            <div className={styles.loadingState}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.skeletonRow} />
              ))}
            </div>
          ) : topUsers.length === 0 ? (
            <div className={styles.emptyState}>No rankings yet</div>
          ) : (
            <ol className={styles.userList}>
              {topUsers.map((user) => (
                <li
                  key={user.rank}
                  className={styles.userRow}
                  onClick={() => setSelectedUsername(user.username)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className={`${styles.userRank} ${user.rank === 1 ? styles.rankTop : ''}`}>
                    {user.rank}
                  </span>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className={styles.userAvatar} />
                  ) : (
                    <span className={styles.avatarFallback}>
                      {user.username ? user.username.slice(0, 2).toUpperCase() : '??'}
                    </span>
                  )}
                  <span className={styles.userName}>{user.username}</span>
                  <span className={styles.userCredits}>{formatCredits(user.shards)} credits</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {selectedUsername && (
        <UserProfileModal
          username={selectedUsername}
          onClose={() => setSelectedUsername(null)}
        />
      )}
    </>
  );
}
