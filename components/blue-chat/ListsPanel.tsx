'use client';

import React, { useCallback, useEffect, useState } from 'react';
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

const LIST_META: Record<ListKey, { title: string; subtitle: string; blurb: string; placeholder: string }> = {
  todo: {
    title: 'To-do list',
    subtitle: 'What you must do',
    blurb: 'Commitments, obligations, and things that have to get done.',
    placeholder: 'Something you owe someone',
  },
  watch: {
    title: 'Watch list',
    subtitle: "What you're tracking",
    blurb: 'Everything you follow up on, wait to hear back on, or need to remember.',
    placeholder: 'Something you are waiting on',
  },
  later: {
    title: 'Later list',
    subtitle: 'Everything else',
    blurb: 'Anything you might want to do, will do when you have time, or wish you could do.',
    placeholder: 'Something for someday',
  },
};

interface ListsPanelProps {
  authHeaders: () => Promise<HeadersInit>;
  isAuthenticated: boolean;
  onSound?: (name: 'click' | 'hover') => void;
  /* The /list page owns its own hero heading, so it hides this one. */
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
      <div className={styles.panel}>
        <div className={styles.gate}>
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

  return (
    <div className={styles.macWindow}>
      {/* Tab Strip (NSWindowTabGroup) */}
      <div className={styles.tabBar}>
        <div className={styles.tabGroup}>
          <button
            className={`${styles.windowTab} ${activeTab === 'all' ? styles.windowTabActive : ''}`}
            onClick={() => { onSound?.('click'); setActiveTab('all'); }}
            type="button"
          >
            <span>All Lists</span>
          </button>
          {LIST_KEYS.map((key) => (
            <button
              key={key}
              className={`${styles.windowTab} ${activeTab === key ? styles.windowTabActive : ''}`}
              onClick={() => { onSound?.('click'); setActiveTab(key); }}
              type="button"
            >
              <span>{LIST_META[key].title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title Bar & Unified Toolbar (NSWindow.ToolbarStyle.unified) */}
      <div className={styles.titleBar}>
        {/* Traffic Lights */}
        <div className={styles.trafficLights}>
          <span className={`${styles.light} ${styles.lightRed}`} aria-hidden="true" />
          <span className={`${styles.light} ${styles.lightYellow}`} aria-hidden="true" />
          <span className={`${styles.light} ${styles.lightGreen}`} aria-hidden="true" />
        </div>

        {/* Window Title */}
        <div className={styles.windowTitle}>
          <span>Blue&apos;s Ledger</span>
        </div>

        {/* Toolbar Items / Accessories */}
        <div className={styles.toolbarItems}>
          <div className={styles.searchWrapper}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.toolbarSearch}
              aria-label="Filter items"
            />
          </div>
        </div>
      </div>

      {/* Hairline Separator (NSWindow.titlebarSeparatorStyle) */}
      <div className={styles.separator} />

      {/* Content Area */}
      <div className={styles.windowContent}>
        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={`${styles.columns} ${activeTab !== 'all' ? styles.singleColumnView : ''}`}>
          {displayedKeys.map((listKey) => {
            const meta = LIST_META[listKey];
            const rawItems = lists[listKey] || [];
            const items = rawItems.filter((i) =>
              i.content.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <section key={listKey} className={styles.column} aria-label={meta.title}>
                <h3 className={styles.columnTitle}>{meta.title}</h3>
                <p className={styles.columnSubtitle}>{meta.subtitle}</p>
                <p className={styles.columnBlurb}>{meta.blurb}</p>

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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
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
                        className={styles.check}
                        onClick={() => toggleItem(item)}
                        type="button"
                        role="checkbox"
                        aria-checked={item.done}
                        aria-label={item.done ? `Mark "${item.content}" as not done` : `Mark "${item.content}" as done`}
                      >
                        {item.done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
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

      {/* Resize corner visual accessory (NSWindow.StyleMask.resizable) */}
      <div className={styles.resizeCorner} aria-hidden="true">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="8" y1="2" x2="2" y2="8" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8" y1="5" x2="5" y2="8" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export default ListsPanel;
