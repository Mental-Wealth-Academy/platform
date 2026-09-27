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

const LIST_META: Record<ListKey, { title: string; subtitle: string; blurb: string; placeholder: string; tag: string }> = {
  todo: {
    title: 'To-do list',
    subtitle: 'What you must do',
    blurb: 'Commitments, obligations, and things that have to get done.',
    placeholder: 'Something you owe someone',
    tag: 'Commitment',
  },
  watch: {
    title: 'Watch list',
    subtitle: "What you're tracking",
    blurb: 'Everything you follow up on, wait to hear back on, or need to remember.',
    placeholder: 'Something you are waiting on',
    tag: 'Tracking',
  },
  later: {
    title: 'Later list',
    subtitle: 'Everything else',
    blurb: 'Anything you might want to do, will do when you have time, or wish you could do.',
    placeholder: 'Something for someday',
    tag: 'Someday',
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

  const [activeTab, setActiveTab] = useState<'all' | ListKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const displayedKeys = activeTab === 'all' ? LIST_KEYS : [activeTab];
  const allOpenCount = LIST_KEYS.reduce((sum, k) => sum + (lists[k] || []).filter((i) => !i.done).length, 0);

  return (
    <div className={styles.panel}>
      {showHeader && (
        <div className={styles.headerRow}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>Blue&apos;s Ledger</h1>
            <p className={styles.pageSubtitle}>
              Three focused lists to capture obligations, follow-ups, and someday ideas.
            </p>
          </div>

          <div className={styles.searchWrapper}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={styles.searchIcon}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Filter items"
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className={styles.tabBar}>
        <div className={styles.tabGroup}>
          <button
            className={`${styles.tabButton} ${activeTab === 'all' ? styles.tabButtonActive : ''}`}
            onClick={() => { onSound?.('click'); setActiveTab('all'); }}
            type="button"
          >
            <span>All Lists</span>
            <span className={styles.tabBadge}>{allOpenCount}</span>
          </button>
          {LIST_KEYS.map((key) => {
            const count = (lists[key] || []).filter((i) => !i.done).length;
            return (
              <button
                key={key}
                className={`${styles.tabButton} ${activeTab === key ? styles.tabButtonActive : ''}`}
                onClick={() => { onSound?.('click'); setActiveTab(key); }}
                type="button"
              >
                <span>{LIST_META[key].title}</span>
                <span className={styles.tabBadge}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* Cards Grid */}
      <div className={`${styles.columns} ${activeTab !== 'all' ? styles.singleColumnView : ''}`}>
        {displayedKeys.map((listKey) => {
          const meta = LIST_META[listKey];
          const rawItems = lists[listKey] || [];
          const items = rawItems.filter((i) =>
            i.content.toLowerCase().includes(searchQuery.toLowerCase())
          );
          const openCount = items.filter((i) => !i.done).length;

          return (
            <section key={listKey} className={styles.card} aria-label={meta.title}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderTop}>
                  <span className={styles.categoryBadge} data-list={listKey}>
                    {meta.tag}
                  </span>
                  <span className={styles.itemCountBadge}>
                    {openCount} active
                  </span>
                </div>
                <h2 className={styles.cardTitle}>{meta.title}</h2>
                <p className={styles.cardBlurb}>{meta.blurb}</p>
              </div>

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
                    {searchQuery ? 'No matching items' : 'No items yet'}
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
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default ListsPanel;
