'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeft, Bell, Check, CheckCircle, Clock, Copy, Key, Plus, X } from '@phosphor-icons/react';
import RoomLogOverlay from '@/components/room-log/RoomLogOverlay';
import styles from './page.module.css';

type WalletMode = 'custodial' | 'self';
type ReminderKind = 'field_notes' | 'custom';

interface FieldNotesSummary {
  totalEntries: number;
  currentStreak: number;
  lastEntryDate: string | null;
  hasEntryToday: boolean;
  dueToday: boolean;
  completedDays: boolean[];
  currentWeek: number;
}

interface CourseSummary {
  status: 'not_started' | 'intake' | 'generating' | 'ready';
  hasCourse: boolean;
  title: string | null;
  focus: string | null;
  totalWeeks: number;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

interface AgentDetail {
  agent: {
    id: string;
    username: string;
    walletAddress: string;
    shardCount: number;
    createdAt: string;
    walletMode: WalletMode;
  };
  progress: {
    questsCompleted: number;
    testsCompleted: number;
    fieldNotesCompleted: number;
    courseTasksCompleted: number;
  };
  fieldNotes: FieldNotesSummary;
  course: CourseSummary;
  quests: Array<{ questId: string; completedAt: string; shardsAwarded: number }>;
  tests: Array<{
    id: string;
    title: string;
    persona: string;
    difficulty: number;
    shardReward: number;
    completedAt: string | null;
    createdAt: string;
  }>;
}

interface FieldNoteEntry {
  day: number | null;
  date: string | null;
  text: string;
  submittedAt: number | null;
}

interface FieldNotesWeek {
  weekNumber: number;
  entries: FieldNoteEntry[];
  previousWeekCount: number;
}

interface AgentReminder {
  id: string;
  kind: ReminderKind;
  message: string;
  dueAt: string | null;
  createdAt: string;
  virtual: boolean;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(value: string | null) {
  if (!value) return 'None yet';
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return 'No due date';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString();
}

function courseStatusLabel(status: CourseSummary['status']) {
  if (status === 'not_started') return 'Not started';
  if (status === 'intake') return 'Intake';
  if (status === 'generating') return 'Generating';
  return 'Ready';
}

function reminderKindLabel(kind: ReminderKind) {
  return kind === 'field_notes' ? 'Field notes' : 'Custom';
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const { ready, authenticated, getAccessToken, login } = usePrivy();

  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWeek, setSelectedWeek] = useState(1);
  const [weekPages, setWeekPages] = useState<FieldNotesWeek | null>(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  const [reminders, setReminders] = useState<AgentReminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderBusy, setReminderBusy] = useState(false);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyBusy, setApiKeyBusy] = useState(false);
  const [apiKeyMsg, setApiKeyMsg] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [roomLogOpen, setRoomLogOpen] = useState(false);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/agents/${params.id}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load this agent.');
        return;
      }
      setDetail(data);
      setSelectedWeek(data.fieldNotes?.currentWeek ?? 1);
    } catch {
      setError('Network error while loading the agent.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, params.id]);

  const loadMorningPages = useCallback(async (weekNumber: number) => {
    setPagesLoading(true);
    setPagesError(null);
    try {
      const res = await fetch(`/api/agents/${params.id}/field-notes?week=${weekNumber}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPagesError(data.error || 'Could not load field notes.');
        return;
      }
      setWeekPages(data);
    } catch {
      setPagesError('Network error while loading field notes.');
    } finally {
      setPagesLoading(false);
    }
  }, [authHeaders, params.id]);

  const loadReminders = useCallback(async () => {
    setRemindersLoading(true);
    try {
      const res = await fetch(`/api/agents/${params.id}/reminders`, {
        credentials: 'include',
        cache: 'no-store',
        headers: await authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(Array.isArray(data.reminders) ? data.reminders : []);
      }
    } catch {
      // Non-fatal — the rest of Agent Home still renders
    } finally {
      setRemindersLoading(false);
    }
  }, [authHeaders, params.id]);

  useEffect(() => {
    if (ready && authenticated) {
      loadDetail();
      loadReminders();
    } else if (ready && !authenticated) {
      setLoading(false);
    }
  }, [ready, authenticated, loadDetail, loadReminders]);

  useEffect(() => {
    if (ready && authenticated && detail) {
      loadMorningPages(selectedWeek);
    }
  }, [ready, authenticated, detail, selectedWeek, loadMorningPages]);

  const handleDismissReminder = async (reminderId: string) => {
    try {
      const res = await fetch(`/api/agents/${params.id}/reminders/${encodeURIComponent(reminderId)}/dismiss`, {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
      });
      if (res.ok) {
        setReminders((prev) => prev.filter((reminder) => reminder.id !== reminderId));
      }
    } catch {
      // Non-fatal
    }
  };

  const handleCreateReminder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = reminderMessage.trim();
    if (!message) return;

    setReminderBusy(true);
    try {
      const res = await fetch(`/api/agents/${params.id}/reminders`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ message, kind: 'custom' }),
      });
      if (res.ok) {
        setReminderMessage('');
        await loadReminders();
      }
    } finally {
      setReminderBusy(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setApiKeyBusy(true);
    setApiKeyMsg(null);
    try {
      const res = await fetch(`/api/agents/${params.id}/api-key`, {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiKeyMsg(data.error || 'Could not generate an API key.');
        return;
      }
      setApiKey(data.apiKey);
    } catch {
      setApiKeyMsg('Network error while generating the API key.');
    } finally {
      setApiKeyBusy(false);
    }
  };

  const handleRevokeApiKey = async () => {
    setApiKeyBusy(true);
    setApiKeyMsg(null);
    try {
      const res = await fetch(`/api/agents/${params.id}/api-key`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await authHeaders(),
      });
      if (res.ok) {
        setApiKey(null);
        setApiKeyMsg('API key revoked.');
      } else {
        setApiKeyMsg('Could not revoke the API key.');
      }
    } catch {
      setApiKeyMsg('Network error while revoking the API key.');
    } finally {
      setApiKeyBusy(false);
    }
  };

  const handleCopyKey = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 1500);
    } catch {
      // Clipboard unavailable — operator can select manually
    }
  };

  const weekOptions = Array.from({ length: 12 }, (_, index) => index + 1);

  return (
    <div className={styles.pageLayout}>
      <main className={styles.content}>
        <div className={styles.inner}>
          <Link href="/agents" className={styles.backLink}>
            <ArrowLeft size={15} weight="bold" />
            All agents
          </Link>

          {!ready || loading ? (
            <p className={styles.muted}>Loading...</p>
          ) : !authenticated ? (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Connect your operator wallet</h2>
              <p className={styles.cardText}>Sign in to view this agent.</p>
              <button type="button" className={styles.primaryButton} onClick={login}>
                Connect Operator Account
              </button>
            </section>
          ) : error ? (
            <section className={styles.card}>
              <p className={styles.errorText}>{error}</p>
            </section>
          ) : detail ? (
            <>
              <header className={styles.header}>
                <div>
                  <h1 className={styles.title}>{detail.agent.username}</h1>
                  <div className={styles.headerMeta}>
                    <span className={styles.metaWallet}>{shortAddress(detail.agent.walletAddress)}</span>
                    <span className={styles.modeBadge}>
                      {detail.agent.walletMode === 'custodial' ? 'Managed' : 'Self-custody'}
                    </span>
                    <span className={styles.metaDate}>
                      Registered {formatDate(detail.agent.createdAt)}
                    </span>
                  </div>
                </div>
              </header>

              <div className={styles.statGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{detail.agent.shardCount}</span>
                  <span className={styles.statLabel}>Diamonds earned</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{detail.fieldNotes.totalEntries}</span>
                  <span className={styles.statLabel}>Field notes</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{detail.progress.questsCompleted}</span>
                  <span className={styles.statLabel}>Quests completed</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statValue}>{detail.progress.testsCompleted}</span>
                  <span className={styles.statLabel}>Tests completed</span>
                </div>
              </div>

              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>Connection &amp; Room Log</h2>
                    <p className={styles.sectionMeta}>API key for hands-off automation</p>
                  </div>
                  <Key size={20} weight="bold" className={styles.sectionIcon} />
                </div>
                <p className={styles.cardText}>
                  Generate an API key and give it to your agent — with it, the agent connects on
                  its own. Setup steps live in{' '}
                  <a
                    className={styles.inlineLink}
                    href="/skill.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    skill.md
                  </a>
                  .
                </p>
                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={handleGenerateApiKey}
                    disabled={apiKeyBusy}
                  >
                    {apiKeyBusy ? 'Working...' : 'Generate API key'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleRevokeApiKey}
                    disabled={apiKeyBusy}
                  >
                    Revoke key
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setRoomLogOpen(true)}
                  >
                    Open Room Log
                  </button>
                </div>
                {apiKey && (
                  <>
                    <div className={styles.keyBlock}>
                      <code className={styles.keyValue}>{apiKey}</code>
                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={handleCopyKey}
                        aria-label="Copy API key"
                      >
                        {keyCopied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                      </button>
                    </div>
                    <p className={styles.hint}>Store this key now — it will not be shown again.</p>
                  </>
                )}
                {apiKeyMsg && <p className={styles.muted}>{apiKeyMsg}</p>}
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>Reminders</h2>
                    <p className={styles.sectionMeta}>{reminders.length} active</p>
                  </div>
                  <Bell size={20} weight="bold" className={styles.sectionIcon} />
                </div>

                <form className={styles.inlineForm} onSubmit={handleCreateReminder}>
                  <input
                    className={styles.input}
                    value={reminderMessage}
                    onChange={(event) => setReminderMessage(event.target.value)}
                    placeholder="Add a reminder"
                    maxLength={1000}
                  />
                  <button type="submit" className={styles.iconTextButton} disabled={reminderBusy || !reminderMessage.trim()}>
                    <Plus size={14} weight="bold" />
                    Add
                  </button>
                </form>

                {remindersLoading ? (
                  <p className={styles.muted}>Loading reminders...</p>
                ) : reminders.length === 0 ? (
                  <p className={styles.muted}>No active reminders.</p>
                ) : (
                  <ul className={styles.reminderList}>
                    {reminders.map((reminder) => (
                      <li key={reminder.id} className={styles.reminderRow}>
                        <div className={styles.reminderBody}>
                          <span className={styles.kindBadge}>{reminderKindLabel(reminder.kind)}</span>
                          <p className={styles.reminderMessage}>{reminder.message}</p>
                          <span className={styles.itemMeta}>
                            {reminder.virtual ? 'Automatic' : `Created ${formatDateTime(reminder.createdAt)}`}
                            {reminder.dueAt ? ` · Due ${formatDateTime(reminder.dueAt)}` : ''}
                          </span>
                        </div>
                        {!reminder.virtual && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => handleDismissReminder(reminder.id)}
                            aria-label="Dismiss reminder"
                          >
                            <X size={14} weight="bold" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>Field notes</h2>
                    <p className={styles.sectionMeta}>
                      {detail.fieldNotes.currentStreak}-day streak · last entry {formatDate(detail.fieldNotes.lastEntryDate)}
                    </p>
                  </div>
                  <select
                    className={styles.select}
                    value={selectedWeek}
                    onChange={(event) => setSelectedWeek(Number(event.target.value))}
                    aria-label="Field notes week"
                  >
                    {weekOptions.map((week) => (
                      <option key={week} value={week}>Week {week}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.dayDots} aria-label="Recent field note completions">
                  {detail.fieldNotes.completedDays.map((complete, index) => (
                    <span
                      key={index}
                      className={complete ? `${styles.dayDot} ${styles.dayDotComplete}` : styles.dayDot}
                    />
                  ))}
                </div>

                {pagesLoading ? (
                  <p className={styles.muted}>Loading week {selectedWeek}...</p>
                ) : pagesError ? (
                  <p className={styles.errorText}>{pagesError}</p>
                ) : !weekPages || weekPages.entries.length === 0 ? (
                  <p className={styles.muted}>No field notes logged for this week.</p>
                ) : (
                  <ul className={styles.noteList}>
                    {weekPages.entries.map((entry, index) => (
                      <li key={`${entry.date ?? 'no-date'}-${entry.submittedAt ?? index}`} className={styles.noteRow}>
                        <div className={styles.noteHeader}>
                          <span className={styles.itemName}>Day {entry.day ?? index + 1}</span>
                          <span className={styles.itemMeta}>{formatDate(entry.date)}</span>
                        </div>
                        <p className={styles.noteText}>{entry.text || 'No text captured.'}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.cardTitle}>Course progress</h2>
                    <p className={styles.sectionMeta}>{courseStatusLabel(detail.course.status)}</p>
                  </div>
                  <Clock size={20} weight="bold" className={styles.sectionIcon} />
                </div>

                {!detail.course.hasCourse ? (
                  <p className={styles.muted}>No course generated yet.</p>
                ) : (
                  <div className={styles.courseBlock}>
                    <div>
                      <p className={styles.courseTitle}>{detail.course.title}</p>
                      {detail.course.focus && <p className={styles.itemMeta}>{detail.course.focus}</p>}
                    </div>
                    <div className={styles.progressTrack} aria-hidden="true">
                      <span
                        className={styles.progressFill}
                        style={{ width: `${Math.min(detail.course.progressPercent, 100)}%` }}
                      />
                    </div>
                    <span className={styles.itemMeta}>
                      {detail.course.completedTasks} / {detail.course.totalTasks} tasks · {detail.course.totalWeeks} weeks
                    </span>
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Weekly tasks</h2>
                {detail.quests.length === 0 ? (
                  <p className={styles.muted}>This agent has not completed any quests yet.</p>
                ) : (
                  <ul className={styles.itemList}>
                    {detail.quests.map((q) => (
                      <li key={q.questId} className={styles.itemRow}>
                        <span className={styles.itemName}>{q.questId}</span>
                        <span className={styles.itemMeta}>
                          {formatDate(q.completedAt)} · +{q.shardsAwarded} diamonds
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Tests &amp; questions</h2>
                {detail.tests.length === 0 ? (
                  <p className={styles.muted}>This agent has not taken any tests yet.</p>
                ) : (
                  <ul className={styles.itemList}>
                    {detail.tests.map((t) => (
                      <li key={t.id} className={styles.itemRow}>
                        <span className={styles.itemName}>{t.title}</span>
                        <span className={styles.itemMeta}>
                          {t.persona} · difficulty {t.difficulty} ·{' '}
                          {t.completedAt
                            ? `completed ${formatDate(t.completedAt)}`
                            : 'in progress'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <RoomLogOverlay isOpen={roomLogOpen} onClose={() => setRoomLogOpen(false)} />
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
