'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { CaretLeft, CaretRight, UserCircle } from '@phosphor-icons/react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import CyberpunkDataViz from '@/components/cyberpunk-data-viz/CyberpunkDataViz';
import YourAccountsModal from '@/components/nav-buttons/YourAccountsModal';
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
  submittedAt: number;
}

interface DailyNotesResponse {
  allWeekPages?: Record<string, MorningPageEntry[]>;
}

interface StreakResponse {
  streak?: number;
  completedDays?: boolean[];
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

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

export default function ProfilePage() {
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [streak, setStreak] = useState(0);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

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
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
      window.removeEventListener('profileUpdated', handler);
    };
  }, [refreshProfile]);

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
      ? `Keep your morning-pages streak alive by writing again tomorrow.`
      : 'Write morning pages daily to start building your streak.';
  const accountName =
    user?.username && !user.username.startsWith('user_')
      ? `@${user.username}`
      : authenticated
        ? 'Signed in'
        : 'Sign in';
  const accountHint = authenticated
    ? 'Open your connected accounts and login details.'
    : 'Log in here to access your account details on mobile.';

  return (
    <div className={styles.pageLayout}>
      <div className={styles.bgViz}><CyberpunkDataViz /></div>
      <SideNavigation />
      <main className={styles.page}>
        <section className={styles.shell}>
          <section className={styles.accountPanel}>
            <div className={styles.accountIdentity}>
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.username || 'Profile avatar'}
                  width={56}
                  height={56}
                  className={styles.accountAvatar}
                  unoptimized
                />
              ) : (
                <div className={styles.accountIconWrap} aria-hidden="true">
                  <UserCircle size={34} weight="fill" />
                </div>
              )}

              <div className={styles.accountCopyBlock}>
                {isLoading ? (
                  <>
                    <span className={`${styles.skeletonAccountEyebrow} ${styles.skeletonBlock}`} />
                    <span className={`${styles.skeletonAccountName} ${styles.skeletonBlock}`} />
                    <span className={`${styles.skeletonAccountHint} ${styles.skeletonBlock}`} />
                  </>
                ) : (
                  <>
                    <span className={styles.accountEyebrow}>Account</span>
                    <span className={styles.accountName}>{accountName}</span>
                    <span className={styles.accountHint}>{accountHint}</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              className={styles.accountAction}
              onClick={() => {
                if (!authenticated) {
                  login();
                  return;
                }

                setIsAccountsModalOpen(true);
              }}
              disabled={!ready}
            >
              <span>{authenticated ? 'Account details' : 'Sign In'}</span>
              <CaretRight size={16} weight="bold" />
            </button>
          </section>

          <section className={styles.streakPanel}>
            <div className={styles.streakCopy}>
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

          <section className={styles.tipCard}>
            <div className={styles.tipIconWrap} aria-hidden="true">
              <Image src="/stickers/streak.svg" alt="" width={28} height={28} className={styles.tipIcon} />
            </div>
            {isLoading ? (
              <div className={styles.tipSkeletonStack}>
                <span className={`${styles.skeletonTipLine} ${styles.skeletonBlock}`} />
                <span className={`${styles.skeletonTipLineShort} ${styles.skeletonBlock}`} />
              </div>
            ) : (
              <p className={styles.tipText}>{completionMessage}</p>
            )}
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

              {calendarDays.map((day) => (
                <div
                  key={day.dateKey}
                  className={[
                    styles.dayCell,
                    day.inMonth ? styles.dayInMonth : styles.dayOutsideMonth,
                    day.completed ? styles.dayCompleted : '',
                    day.today ? styles.dayToday : '',
                  ].join(' ')}
                >
                  <span className={styles.dayNumber}>{day.date.getDate()}</span>
                </div>
              ))}
            </div>

            <div className={styles.legend}>
              <span className={styles.legendSwatch} />
              <span className={styles.legendText}>Morning pages completed</span>
            </div>
          </section>
        </section>
      </main>

      {isAccountsModalOpen && (
        <YourAccountsModal onClose={() => setIsAccountsModalOpen(false)} />
      )}
    </div>
  );
}
