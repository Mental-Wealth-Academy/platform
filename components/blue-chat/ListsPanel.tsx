'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import CtaButton from '@/components/shared/CtaButton';
import styles from './ListsPanel.module.css';

export const LIST_KEYS = ['todo', 'watch', 'later'] as const;
export type ListKey = (typeof LIST_KEYS)[number];

interface ListItem {
  id: string;
  listKey: ListKey;
  content: string;
  done: boolean;
  createdAt: string;
}

type Lists = Record<ListKey, ListItem[]>;

const EMPTY_LISTS: Lists = { todo: [], watch: [], later: [] };

const LIST_META: Record<ListKey, { title: string; kanji: string; placeholder: string }> = {
  todo: {
    title: 'To-do list',
    kanji: '行動',
    placeholder: 'Something you owe someone',
  },
  watch: {
    title: 'Watch list',
    kanji: '注視',
    placeholder: 'Something you are waiting on',
  },
  later: {
    title: 'Later list',
    kanji: '後日',
    placeholder: 'Something for someday',
  },
};

interface ListsPanelProps {
  authHeaders: () => Promise<HeadersInit>;
  isAuthenticated: boolean;
  onSound?: (name: 'click' | 'hover') => void;
  showHeader?: boolean;
}

const ListsPanel: React.FC<ListsPanelProps> = ({ authHeaders, isAuthenticated, onSound, showHeader = true }) => {
  const { login } = usePrivy();
  const [lists, setLists] = useState<Lists>(EMPTY_LISTS);
  const [drafts, setDrafts] = useState<Record<ListKey, string>>({ todo: '', watch: '', later: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingList, setSavingList] = useState<ListKey | null>(null);

  const loadLists = useCallback(async () => {
    if (!isAuthenticated) {
      setLists(EMPTY_LISTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/blue-lists', { headers: await authHeaders() });
      if (!res.ok) throw new Error('load failed');
      const data = await res.json();
      setLists({ ...EMPTY_LISTS, ...data.lists });
      setError(null);
    } catch {
      setError('Could not load your lists. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, isAuthenticated]);

  useEffect(() => { loadLists(); }, [loadLists]);

  const addItem = async (listKey: ListKey) => {
    const content = drafts[listKey].trim();
    if (!content || savingList) return;

    onSound?.('click');
    setSavingList(listKey);
    setError(null);

    try {
      const res = await fetch('/api/blue-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ listKey, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'save failed');

      setLists((prev) => ({ ...prev, [listKey]: [...prev[listKey], data.item] }));
      setDrafts((prev) => ({ ...prev, [listKey]: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that. Try again.');
    } finally {
      setSavingList(null);
    }
  };

  const toggleItem = async (item: ListItem) => {
    onSound?.('click');
    const next = !item.done;

    // Optimistic: the checkbox should not wait on the network.
    setLists((prev) => ({
      ...prev,
      [item.listKey]: prev[item.listKey].map((i) => (i.id === item.id ? { ...i, done: next } : i)),
    }));

    try {
      const res = await fetch('/api/blue-lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ id: item.id, done: next }),
      });
      if (!res.ok) throw new Error('patch failed');
    } catch {
      setLists((prev) => ({
        ...prev,
        [item.listKey]: prev[item.listKey].map((i) => (i.id === item.id ? { ...i, done: item.done } : i)),
      }));
      setError('That change did not save. Try again.');
    }
  };

  const removeItem = async (item: ListItem) => {
    onSound?.('click');
    const snapshot = lists[item.listKey];

    setLists((prev) => ({
      ...prev,
      [item.listKey]: prev[item.listKey].filter((i) => i.id !== item.id),
    }));

    try {
      const res = await fetch(`/api/blue-lists?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error('delete failed');
    } catch {
      setLists((prev) => ({ ...prev, [item.listKey]: snapshot }));
      setError('Could not delete that. Try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.gateWrapper}>
        <div className={styles.gateCard}>
          <div className={styles.gateAvatarWrap}>
            <Image
              src="/exxie.png"
              alt="Daemon"
              width={96}
              height={112}
              className={styles.gateAvatar}
              priority
            />
          </div>
          <h2 className={styles.gateTitle}>Three lists, one place</h2>
          <p className={styles.gateBody}>
            Sign in and Blue keeps your to-do, watch, and later lists between visits.
          </p>
          <CtaButton
            variant="primary"
            size="md"
            onClick={() => {
              onSound?.('click');
              login();
            }}
            className={styles.gateCta}
          >
            Sign in to start
          </CtaButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* Cards Grid */}
      <div className={styles.columns}>
        {LIST_KEYS.map((listKey) => {
          const meta = LIST_META[listKey];
          const items = lists[listKey] || [];

          return (
            <section key={listKey} className={styles.card} aria-label={meta.title}>
              <div className={styles.cardHeader}>
                <span className={styles.cardKanji} lang="ja">{meta.kanji}</span>
                <h2 className={styles.cardTitle}>{meta.title}</h2>
              </div>

              <div className={styles.cardBody}>
                <form
                  className={styles.addRow}
                  onSubmit={(e) => { e.preventDefault(); addItem(listKey); }}
                >
                  <input
                    className={styles.addInput}
                    value={drafts[listKey]}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [listKey]: e.target.value }))}
                    placeholder={meta.placeholder}
                    maxLength={500}
                    aria-label={`Add to ${meta.title}`}
                  />
                  <button
                    className={styles.addButton}
                    type="submit"
                    disabled={!drafts[listKey].trim() || savingList === listKey}
                    onMouseEnter={() => onSound?.('hover')}
                    aria-label={`Save to ${meta.title}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </form>

                <ul className={styles.items}>
                  {loading && <li className={styles.placeholder}>Loading…</li>}
                  {!loading && items.length === 0 && (
                    <li className={styles.placeholder} aria-hidden="true">
                      No items yet
                    </li>
                  )}
                  {!loading && items.map((item) => (
                    <li key={item.id} className={`${styles.item} ${item.done ? styles.itemDone : ''}`}>
                      <button
                        className={`${styles.check} ${item.done ? styles.checkDone : ''}`}
                        onClick={() => toggleItem(item)}
                        type="button"
                        role="checkbox"
                        aria-checked={item.done}
                        aria-label={item.done ? `Mark "${item.content}" as not done` : `Mark "${item.content}" as done`}
                      >
                        {item.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <span className={styles.itemText}>{item.content}</span>
                      <button
                        className={styles.remove}
                        onClick={() => removeItem(item)}
                        type="button"
                        aria-label={`Delete "${item.content}"`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ListsPanel;
