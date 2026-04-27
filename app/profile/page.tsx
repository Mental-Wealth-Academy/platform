'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { usePrivy } from '@privy-io/react-auth';
import { CaretLeft, CaretRight, UserCircle } from '@phosphor-icons/react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import YourAccountsModal from '@/components/nav-buttons/YourAccountsModal';
import { useScrollLock } from '@/hooks/useScrollLock';
import styles from './page.module.css';

interface ProfileUser {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  shardCount: number;
  createdAt?: string;
}

interface MorningPageEntry {
  day: number;
  date: string;
  content?: string;
  submittedAt: number;
}

interface DailyNotesResponse {
  allWeekPages?: Record<string, MorningPageEntry[]>;
}

interface StreakResponse {
  streak?: number;
  completedDays?: boolean[];
}

interface RereadNote {
  date: string;
  content: string;
  day: number;
  weekNumber: number;
}

interface RereadModalState {
  dateKey: string;
  isLoading: boolean;
  error: string | null;
  note: RereadNote | null;
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const FULL_DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const REREAD_SHARD_COST = 50;

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatReadableDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return FULL_DATE_LABEL.format(new Date(year, month - 1, day));
}

export default function ProfilePage() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [streak, setStreak] = useState(0);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [rereadModal, setRereadModal] = useState<RereadModalState | null>(null);

  useScrollLock(Boolean(rereadModal));

  const refreshProfile = useCallback(async () => {
    if (!ready || !authenticated) {
      setUser(null);
      setStreak(0);
      setCompletedDates(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [profileRes, streakRes, notesRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
        fetch('/api/daily-notes/streak', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
        fetch('/api/daily-notes', { credentials: 'include', cache: 'no-store', headers: authHeaders }),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData.user ?? null);
      } else {
        setUser(null);
      }

      if (streakRes.ok) {
        const streakData: StreakResponse = await streakRes.json();
        setStreak(streakData.streak ?? 0);
      } else {
        setStreak(0);
      }

      if (notesRes.ok) {
        const notesData: DailyNotesResponse = await notesRes.json();
        const dates = new Set<string>();
        Object.values(notesData.allWeekPages ?? {}).forEach((entries) => {
          entries.forEach((entry) => {
            if (entry?.date) dates.add(entry.date);
          });
        });
        setCompletedDates(dates);
      } else {
        setCompletedDates(new Set());
      }
    } catch {
      setUser(null);
      setStreak(0);
      setCompletedDates(new Set());
    } finally {
      setIsLoading(false);
    }
  }, [ready, authenticated, getAccessToken]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const handler = () => refreshProfile();
    window.addEventListener('userLoaded', handler);
    window.addEventListener('userLoggedIn', handler);
    window.addEventListener('profileUpdated', handler);
    window.addEventListener('shardsUpdated', handler);
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
      window.removeEventListener('profileUpdated', handler);
      window.removeEventListener('shardsUpdated', handler);
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (!rereadModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !rereadModal.isLoading) {
        setRereadModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rereadModal]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const dateKey = formatDateKey(date);
      return {
        date,
        dateKey,
        inMonth: isSameMonth(date, currentMonth),
        completed: completedDates.has(dateKey),
        today: formatDateKey(date) === formatDateKey(new Date()),
      };
    });
  }, [currentMonth, completedDates]);

  const monthlyCompletedCount = useMemo(
    () => calendarDays.filter((day) => day.inMonth && day.completed).length,
    [calendarDays]
  );

  const monthName = MONTH_LABEL.format(currentMonth);
  const completionMessage =
    streak > 0
      ? 'Write tomorrow to keep streak up.'
      : 'Write today to start your streak.';
  const accountActionLabel = authenticated ? 'Profile' : 'Sign in';
  const selectedDateLabel = rereadModal ? formatReadableDate(rereadModal.dateKey) : '';

  const openRereadModal = useCallback((dateKey: string) => {
    setRereadModal({
      dateKey,
      isLoading: false,
      error: null,
      note: null,
    });
  }, []);

  const unlockReread = useCallback(async () => {
    if (!rereadModal || rereadModal.note) return;

    setRereadModal((prev) => (
      prev
        ? {
            ...prev,
            isLoading: true,
            error: null,
          }
        : prev
    ));

    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/daily-notes/reread', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ date: rereadModal.dateKey }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMessage = data?.error === 'insufficient_shards'
          ? `You need ${REREAD_SHARD_COST} shards to reread this page.`
          : data?.error === 'note_not_found'
            ? 'This morning page is no longer available to reread.'
            : 'The reread could not be opened right now.';

        setRereadModal((prev) => (
          prev
            ? {
                ...prev,
                isLoading: false,
                error: errorMessage,
              }
            : prev
        ));
        return;
      }

      setUser((prev) => (
        prev && typeof data?.shardsRemaining === 'number'
          ? { ...prev, shardCount: data.shardsRemaining }
          : prev
      ));
      window.dispatchEvent(new Event('shardsUpdated'));

      setRereadModal((prev) => (
        prev
          ? {
              ...prev,
              isLoading: false,
              error: null,
              note: data.note ?? null,
            }
          : prev
      ));
    } catch {
      setRereadModal((prev) => (
        prev
          ? {
              ...prev,
              isLoading: false,
              error: 'The reread could not be opened right now.',
            }
          : prev
      ));
    }
  }, [getAccessToken, rereadModal]);

  return (
    <div className={styles.pageLayout}>
      <div className={styles.bgViz}><CyberpunkDataViz /></div>
      <SideNavigation />
      <main className={styles.page}>
        <section className={styles.shell}>
          <section className={styles.streakPanel}>
            <div className={styles.streakCopy}>
              <div className={styles.streakTopRow}>
                <button
                  type="button"
                  className={styles.accountBadge}
                  onClick={() => {
                    if (!authenticated) {
                      login();
                      return;
                    }

                    setIsAccountsModalOpen(true);
                  }}
                  disabled={!ready}
                  aria-label={accountActionLabel}
                >
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.username || 'Profile avatar'}
                      width={40}
                      height={40}
                      className={styles.accountAvatar}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.accountIconWrap} aria-hidden="true">
                      <UserCircle size={22} weight="fill" />
                    </div>
                  )}

                  {isLoading ? (
                    <span className={`${styles.skeletonAccountBadge} ${styles.skeletonBlock}`} />
                  ) : (
                    <span className={styles.accountBadgeLabel}>{accountActionLabel}</span>
                  )}
                  <CaretRight size={14} weight="bold" className={styles.accountBadgeCaret} />
                </button>
              </div>

              <div className={styles.streakValueRow}>
                {isLoading ? (
                  <>
                    <span className={`${styles.skeletonStreakNumber} ${styles.skeletonBlock}`} />
                    <span className={`${styles.skeletonStreakUnit} ${styles.skeletonBlock}`} />
                  </>
                ) : (
                  <>
                    <span className={styles.streakNumber}>{streak}</span>
                    <span className={styles.streakUnit}>day streak</span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.stickerShell} aria-hidden="true">
              <Image
                src="/stickers/streak.svg"
                alt=""
                width={120}
                height={120}
                className={styles.sticker}
                priority
              />
            </div>
          </section>

          <section className={styles.calendarCard}>
            <div className={styles.calendarHeader}>
              <div>
                {isLoading ? (
                  <span className={`${styles.skeletonMonthTitle} ${styles.skeletonBlock}`} />
                ) : (
                  <h2 className={styles.calendarTitle}>{monthName}</h2>
                )}
              </div>
              <div className={styles.calendarNav}>
                <button
                  type="button"
                  className={styles.monthButton}
                  onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <button
                  type="button"
                  className={styles.monthButton}
                  onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  aria-label="Next month"
                >
                  <CaretRight size={18} weight="bold" />
                </button>
              </div>
            </div>

            <div className={styles.calendarMetaRow}>
              {isLoading ? (
                <>
                  <div className={styles.calendarStat}>
                    <span className={`${styles.skeletonStatValue} ${styles.skeletonBlock}`} />
                    <span className={`${styles.skeletonStatLabel} ${styles.skeletonBlock}`} />
                  </div>
                  <div className={styles.calendarStatMuted}>
                    <span className={`${styles.skeletonStatValue} ${styles.skeletonBlock}`} />
                    <span className={`${styles.skeletonStatLabel} ${styles.skeletonBlock}`} />
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.calendarStat}>
                    <span className={styles.calendarStatValue}>{monthlyCompletedCount}</span>
                    <span className={styles.calendarStatLabel}>days practiced</span>
                  </div>
                  <div className={styles.calendarStatMuted}>
                    <span className={styles.calendarStatValue}>{completedDates.size}</span>
                    <span className={styles.calendarStatLabel}>total entries</span>
                  </div>
                </>
              )}
            </div>

            <div className={styles.calendarGrid}>
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className={styles.weekday}>
                  {label}
                </div>
              ))}

              {calendarDays.map((day) => {
                const dayClassName = [
                  styles.dayCell,
                  day.inMonth ? styles.dayInMonth : styles.dayOutsideMonth,
                  day.completed ? styles.dayCompleted : '',
                  day.today ? styles.dayToday : '',
                  day.completed ? styles.dayInteractive : '',
                ].join(' ');

                if (!day.completed) {
                  return (
                    <div key={day.dateKey} className={dayClassName}>
                      <span className={styles.dayNumber}>{day.date.getDate()}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    className={dayClassName}
                    onClick={() => openRereadModal(day.dateKey)}
                    aria-label={`Reread morning page for ${formatReadableDate(day.dateKey)}`}
                    title={`Reread ${formatReadableDate(day.dateKey)} for ${REREAD_SHARD_COST} shards`}
                  >
                    <span className={styles.dayNumber}>{day.date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.legend}>
              <span className={styles.legendSwatch} />
              <span className={styles.legendText}>Morning pages completed</span>
            </div>
            <p className={styles.calendarHint}>Tap a completed day to reread it for 50 shards.</p>
          </section>

          <section className={styles.tipCard}>
            <div className={styles.tipIconWrap} aria-hidden="true">
              <Image src="/uploads/blueagent.png" alt="" width={36} height={36} className={styles.tipIcon} />
            </div>
            {isLoading ? (
              <span className={`${styles.skeletonTipLine} ${styles.skeletonBlock}`} />
            ) : (
              <p className={styles.tipText}>{completionMessage}</p>
            )}
          </section>
        </section>
      </main>

      {isAccountsModalOpen && (
        <YourAccountsModal onClose={() => setIsAccountsModalOpen(false)} />
      )}

      {rereadModal && typeof window !== 'undefined' && createPortal(
        <div
          className={styles.rereadOverlay}
          onClick={() => {
            if (!rereadModal.isLoading) {
              setRereadModal(null);
            }
          }}
        >
          <div
            className={styles.rereadModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reread-note-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.rereadClose}
              onClick={() => setRereadModal(null)}
              aria-label="Close reread note"
              disabled={rereadModal.isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.rereadEyebrow}>Morning Pages Archive</div>
            <h3 id="reread-note-title" className={styles.rereadTitle}>{selectedDateLabel}</h3>

            {rereadModal.note ? (
              <>
                <p className={styles.rereadMeta}>
                  Week {rereadModal.note.weekNumber}, Day {rereadModal.note.day}
                </p>
                <div className={styles.noteFrame}>
                  <p className={styles.noteContent}>{rereadModal.note.content}</p>
                </div>
                <div className={styles.rereadFooter}>
                  <span className={styles.rereadBalance}>
                    {user?.shardCount ?? 0} shards remaining
                  </span>
                  <button
                    type="button"
                    className={styles.rereadDone}
                    onClick={() => setRereadModal(null)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.rereadCopy}>
                  Spend {REREAD_SHARD_COST} shards to reopen this completed morning page. Access lasts for this view only.
                </p>
                <div className={styles.rereadCostRow}>
                  <span className={styles.rereadCostBadge}>
                    <Image src="/icons/ui-shard.svg" alt="" width={16} height={16} />
                    {REREAD_SHARD_COST} shards
                  </span>
                  <span className={styles.rereadBalance}>
                    {user?.shardCount ?? 0} available
                  </span>
                </div>
                {rereadModal.error && (
                  <p className={styles.rereadError} role="alert">{rereadModal.error}</p>
                )}
                <div className={styles.rereadActions}>
                  <button
                    type="button"
                    className={styles.rereadSecondary}
                    onClick={() => setRereadModal(null)}
                    disabled={rereadModal.isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.rereadPrimary}
                    onClick={unlockReread}
                    disabled={rereadModal.isLoading}
                  >
                    {rereadModal.isLoading ? 'Opening...' : 'Spend 50 shards'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
