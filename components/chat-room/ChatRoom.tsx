'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { getSupabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSound } from '@/hooks/useSound';
import { normalizeAvatarUrl } from '@/lib/axis-avatar';
import { useDevOnboarding, getDevWallet } from '@/components/useDevMode';
import { X } from '@phosphor-icons/react';
import styles from './ChatRoom.module.css';

export interface SurveyBadge {
  surveyId: string;
  surveyTitle: string;
  result: string;
  badge: string;
  colorVar?: string;
}

interface ChatMessage {
  id: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  message: string;
  type: 'user' | 'system';
  surveyBadge?: SurveyBadge | null;
  createdAt: string;
}

function parseSurveyBadge(raw: unknown): SurveyBadge | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null && 'badge' in raw) {
    return raw as SurveyBadge;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.badge) {
        return parsed as SurveyBadge;
      }
    } catch {
      return {
        surveyId: 'survey',
        surveyTitle: 'Survey',
        result: raw,
        badge: raw,
      };
    }
  }
  return null;
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  const userId = (row.user_id ?? row.userId) as string;
  const storedAvatarUrl = ((row.avatar_url ?? row.avatarUrl) as string | null) ?? null;
  return {
    id: row.id as number,
    userId,
    username: row.username as string,
    avatarUrl: normalizeAvatarUrl(storedAvatarUrl, `${userId}#0`),
    message: row.message as string,
    type: (row.type as 'user' | 'system') ?? 'user',
    surveyBadge: parseSurveyBadge(row.survey_badge ?? row.surveyBadge),
    createdAt: (row.created_at ?? row.createdAt) as string,
  };
}

function avatarColor(name: string): string {
  const colors = ['#5168FF', '#E85D3A', '#62BE8F', '#9B7ED9', '#F5A623'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getOtherThemeIndex(name: string): number {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 6;
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const CHAT_TOKEN_REGEX = /(@\w+|https?:\/\/[^\s<>'"]+)/g;

function formatChatMessage(text: string): React.ReactNode {
  const parts = text.split(CHAT_TOKEN_REGEX);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className={styles.mention}>
          {part}
        </span>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      const isImg = /\.(png|jpe?g|gif|webp)(\?[^\s<>'"]*)?$/i.test(part) ||
        part.includes('/storage/v1/object/public/') ||
        part.includes('pinata.cloud');
      if (isImg) {
        return (
          <span key={i} className={styles.chatImageCard}>
            <a href={part} target="_blank" rel="noopener noreferrer">
              <img src={part} alt="Uploaded attachment" className={styles.chatImage} loading="lazy" />
            </a>
          </span>
        );
      }
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.chatLink}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface ChatRoomProps {
  fullPage?: boolean;
}

export default function ChatRoom({ fullPage = false }: ChatRoomProps) {
  const { login, authenticated, getAccessToken } = usePrivy();
  const devOnboarding = useDevOnboarding();
  const isAuth = Boolean(authenticated || devOnboarding);
  const [authNotice, setAuthNotice] = useState(false);
  const { play } = useSound();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [stagedImage, setStagedImage] = useState<{ url: string; name: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [blueReviewingUrl, setBlueReviewingUrl] = useState<string | null>(null);
  const blueReviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const oldestIdRef = useRef<number | null>(null);
  const newestIdRef = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<RealtimeChannel>();

  useEffect(() => {
    if (!blueReviewingUrl) return;
    if (blueReviewTimerRef.current) clearTimeout(blueReviewTimerRef.current);
    blueReviewTimerRef.current = setTimeout(() => {
      setBlueReviewingUrl(null);
    }, 15000);
    return () => {
      if (blueReviewTimerRef.current) clearTimeout(blueReviewTimerRef.current);
    };
  }, [blueReviewingUrl]);
  // Stick-to-bottom state: pinned means the user is at (or near) the newest
  // message and the list should follow new arrivals. Scrolling up to read
  // history unpins; returning to the bottom re-pins.
  const pinnedRef = useRef(true);
  const didInitialScrollRef = useRef(false);
  const prependRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  // ── Fetch new messages after a given id ──
  const fetchAfter = useCallback(async (afterId: number) => {
    try {
      const res = await fetch(`/api/chat/messages?after=${afterId}`, { cache: 'no-store' });
      if (!res.ok) return 0;
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        const mapped = data.messages.map(mapMessage);
        if (mapped.some((m: ChatMessage) => m.username?.toLowerCase() === 'blue' || m.userId === 'blue-agent')) {
          setBlueReviewingUrl(null);
        }
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const newOnes = mapped.filter((m: ChatMessage) => !existing.has(m.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes];
        });
      }
      return data.messages?.length ?? 0;
    } catch {
      return 0;
    }
  }, []);

  // ── Load older messages (infinite scroll) ──
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !oldestIdRef.current) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/chat/messages?before=${oldestIdRef.current}&limit=30`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        const mapped = data.messages.map(mapMessage);
        const el = listRef.current;
        if (el) {
          prependRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
        }
        setMessages((prev) => [...mapped, ...prev]);
        oldestIdRef.current = mapped[0].id;
        setHasMore(data.hasMore ?? false);
      } else {
        setHasMore(false);
      }
    } catch {
      // best-effort
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder]);

  // ── Initial load ──
  const loadInitial = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        const mapped = data.messages.map(mapMessage);
        setMessages(mapped);
        if (mapped.length > 0) {
          oldestIdRef.current = mapped[0].id;
          newestIdRef.current = mapped[mapped.length - 1].id;
        }
        setHasMore(data.hasMore ?? false);
      }
    } catch {
      // best-effort
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // ── Keep the viewport stable as messages change ──
  // Only ever scrolls the list element itself (scrollIntoView also scrolled
  // ancestor containers, which left the chat resting mid-list on /dao).
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || messages.length === 0) return;

    // Older messages were prepended: keep the user anchored on the message
    // they were reading instead of yanking them anywhere.
    const prepend = prependRef.current;
    if (prepend) {
      prependRef.current = null;
      el.scrollTop = el.scrollHeight - prepend.scrollHeight + prepend.scrollTop;
      return;
    }

    if (pinnedRef.current) {
      el.scrollTop = el.scrollHeight;
      if (!didInitialScrollRef.current) {
        didInitialScrollRef.current = true;
        // Fonts and first paint can land after this effect and leave the
        // first scroll short of the true bottom; settle on the next frame.
        requestAnimationFrame(() => {
          if (pinnedRef.current && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        });
      }
    }
  }, [messages]);

  // ── Track pinned state + infinite scroll for older messages ──
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (el.scrollTop < 60 && hasMore && !loadingOlder && didInitialScrollRef.current) {
      loadOlder();
    }
  }, [hasMore, loadingOlder, loadOlder]);

  // ── IntersectionObserver for sentinel (more robust infinite scroll) ──
  // Gated until the initial bottom-scroll has landed; before that the list
  // sits at the top and the sentinel would trigger a load immediately.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingOlder && didInitialScrollRef.current) {
          loadOlder();
        }
      },
      { root: listRef.current, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingOlder, loadOlder]);

  // ── Supabase Realtime subscription ──
  useEffect(() => {
    loadInitial();

    const supabase = getSupabase();
    if (supabase) {
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            const msg = payload.new as Record<string, unknown>;
            const mapped = mapMessage(msg);
            if (mapped.username?.toLowerCase() === 'blue' || mapped.userId === 'blue-agent') {
              setBlueReviewingUrl(null);
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === mapped.id)) return prev;
              return [...prev, mapped];
            });
          }
        )
        .subscribe();

      subRef.current = channel;

      return () => {
        channel.unsubscribe();
      };
    }

    // Fallback: poll with ?after=
    const interval = setInterval(async () => {
      if (newestIdRef.current != null) {
        await fetchAfter(newestIdRef.current);
      } else {
        await loadInitial();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [loadInitial, fetchAfter]);

  // ── Listen for manual refresh events ──
  useEffect(() => {
    const handler = () => {
      if (newestIdRef.current != null) {
        fetchAfter(newestIdRef.current);
      } else {
        loadInitial();
      }
    };
    window.addEventListener('globalChatUpdate', handler);
    return () => window.removeEventListener('globalChatUpdate', handler);
  }, [fetchAfter, loadInitial]);

  // ── Update newestIdRef when messages grow ──
  useEffect(() => {
    if (messages.length > 0) {
      newestIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  // ── Periodic nigiyaka dummy activity simulation ──
  useEffect(() => {
    const triggerSim = async () => {
      try {
        const res = await fetch('/api/chat/simulate', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.posted && newestIdRef.current != null) {
            void fetchAfter(newestIdRef.current);
          }
        }
      } catch {
        // silent
      }
    };

    // Stagger first heartbeat after 8s, then every ~38s
    const initialTimer = setTimeout(() => void triggerSim(), 8000);
    const interval = setInterval(() => void triggerSim(), 38000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchAfter]);

  // ── Fetch current user for self-message bubble identification ──
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await getAccessToken().catch(() => null);
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/me', {
          cache: 'no-store',
          headers,
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active && data?.user) {
          if (data.user.id) setCurrentUserId(String(data.user.id));
          if (data.user.username) setCurrentUsername(String(data.user.username));
        }
      } catch {
        // best-effort
      }
    })();
    return () => {
      active = false;
    };
  }, [getAccessToken]);

  // ── Fetch unread notification count ──
  const fetchUnread = useCallback(async () => {
    try {
      const token = await getAccessToken().catch(() => null);
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/notifications', {
        cache: 'no-store',
        headers,
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // best-effort
    }
  }, [getAccessToken]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // ── Mark notifications read when focusing input ──
  const markRead = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      const token = await getAccessToken().catch(() => null);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
    } catch {
      // best-effort
    }
  }, [unreadCount, getAccessToken]);

  useEffect(() => {
    if (authenticated) {
      setAuthNotice(false);
    }
  }, [authenticated]);

  const triggerLogin = useCallback(() => {
    setAuthNotice(true);
    if (login) {
      login();
    }
  }, [login]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      if (!isAuth) {
        triggerLogin();
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('File exceeds 10MB limit.');
        return;
      }

      setUploadingImage(true);
      try {
        const token = await getAccessToken().catch(() => null);
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            setStagedImage({ url: data.url, name: file.name });
          }
        }
      } catch {
        // silent
      } finally {
        setUploadingImage(false);
      }
    },
    [isAuth, triggerLogin, getAccessToken],
  );

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    const rawText = input.trim();
    if (!rawText && !stagedImage) return;
    if (sending || uploadingImage) return;

    if (!isAuth) {
      triggerLogin();
      return;
    }

    setSending(true);

    const activeStagedImage = stagedImage;
    const text = activeStagedImage
      ? (rawText ? `${rawText}\n${activeStagedImage.url}` : activeStagedImage.url)
      : rawText;

    const urlMatch = text.match(/https?:\/\/[^\s<>'"]+/i);
    if (activeStagedImage) {
      setBlueReviewingUrl('image upload');
    } else if (urlMatch) {
      try {
        const parsed = new URL(urlMatch[0]);
        setBlueReviewingUrl(parsed.hostname);
      } catch {
        setBlueReviewingUrl('link');
      }
    }

    const token = await getAccessToken().catch(() => null);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (devOnboarding) {
      headers['x-dev-bypass'] = getDevWallet();
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ message: text }),
    });

    if (res.status === 401) {
      setSending(false);
      triggerLogin();
      return;
    }

    if (res.ok) {
      setAuthNotice(false);
      const data = await res.json();
      setInput('');
      setStagedImage(null);
      if (data.message) {
        if (data.message.user_id) setCurrentUserId(String(data.message.user_id));
        if (data.message.username) setCurrentUsername(String(data.message.username));
      }
      // optimistic insert so the message appears instantly
      const optimistic: ChatMessage = {
        id: data.message.id,
        userId: data.message.user_id,
        username: data.message.username,
        avatarUrl: data.message.avatar_url ?? null,
        message: text,
        type: 'user',
        surveyBadge: parseSurveyBadge(data.message.survey_badge),
        createdAt: data.message.created_at,
      };
      // Sending always returns you to the newest messages.
      pinnedRef.current = true;
      setMessages((prev) => {
        if (prev.some((m) => m.id === optimistic.id)) return prev;
        return [...prev, optimistic];
      });

      if (activeStagedImage) {
        fetch('/api/chat/moderate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: activeStagedImage.url,
            caption: rawText,
            userId: data.message.user_id,
            username: data.message.username,
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.ok && res.reviewed) {
              if (newestIdRef.current != null) {
                void fetchAfter(newestIdRef.current);
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('globalChatUpdate'));
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            setBlueReviewingUrl(null);
          });
      } else if (urlMatch) {
        fetch('/api/chat/analyze-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            userId: data.message.user_id,
            username: data.message.username,
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.ok && res.reviewed) {
              if (newestIdRef.current != null) {
                void fetchAfter(newestIdRef.current);
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('globalChatUpdate'));
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            setBlueReviewingUrl(null);
          });
      }
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, stagedImage, sending, uploadingImage, isAuth, triggerLogin, getAccessToken, devOnboarding, fetchAfter]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const emojis = ['🧠', '🌍', '📚', '💎', '⚡️', '🌱', '🏆', '🤝', '🕹️', '🧩', '🔥', '🚀', '💡', '🎮', '🌌', '🔮'];

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    play('click');
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`${styles.chatRoom}${fullPage ? ' ' + styles.chatRoomFullPage : ''}`}>
      <div className={styles.topBanner}>
        <div className={styles.topBannerContent}>
          <span className={styles.topBannerTitle}>Community Chat</span>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </div>
      </div>

      <div className={styles.chatList} ref={listRef} onScroll={handleScroll}>
        <div ref={sentinelRef} className={styles.sentinel} />
        {loadingOlder && <p className={styles.loadingOlder}>Loading older messages...</p>}

        {initialLoading ? (
          <div className={styles.skeletonContainer} aria-busy="true" aria-label="Loading messages">
            {[
              { self: false, metaWidth: 72, bubbleWidth: '60%', height: 36 },
              { self: false, metaWidth: 96, bubbleWidth: '45%', height: 36 },
              { self: true, metaWidth: 64, bubbleWidth: '55%', height: 36 },
              { self: false, metaWidth: 84, bubbleWidth: '75%', height: 52 },
              { self: true, metaWidth: 70, bubbleWidth: '38%', height: 36 },
              { self: false, metaWidth: 90, bubbleWidth: '68%', height: 36 },
            ].map((s, idx) => (
              <div
                key={idx}
                className={`${styles.chatMessage} ${s.self ? styles.chatMessageSelf : ''} ${styles.skeletonMsg}`}
              >
                <div className={`${styles.skeletonAvatar} ${styles.skeletonBlock}`} />
                <div className={styles.msgBody}>
                  <div className={styles.msgMeta}>
                    <div
                      className={`${styles.skeletonMetaBar} ${styles.skeletonBlock}`}
                      style={{ width: s.metaWidth }}
                    />
                  </div>
                  <div
                    className={`${styles.skeletonBubble} ${styles.skeletonBlock}`}
                    style={{ width: s.bubbleWidth, height: s.height }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className={styles.chatEmpty}>No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className={`${styles.chatMessage} ${styles.chatSystem}`}>
                  <p className={styles.systemText}>{msg.message}</p>
                </div>
              );
            }

            const isSelf = Boolean(
              (currentUserId && msg.userId && String(msg.userId) === currentUserId) ||
              (currentUsername && msg.username && msg.username.toLowerCase() === currentUsername.toLowerCase())
            );

            const isBlue =
              (msg.username && msg.username.toLowerCase() === 'blue') ||
              msg.userId === 'blue-agent' ||
              msg.userId === 'blue-system';

            const avatarUrl = isBlue ? '/blue/blue-avatar.png' : msg.avatarUrl;

            const bubbleThemeClass = isSelf
              ? styles.bubbleSelf
              : `${styles.bubbleOther} ${styles[`bubbleTheme${getOtherThemeIndex(msg.username)}` as keyof typeof styles] ?? ''}`;

            return (
              <div
                key={msg.id}
                className={`${styles.chatMessage} ${isSelf ? styles.chatMessageSelf : ''}`}
              >
                <span
                  className={styles.msgAvatar}
                  style={
                    avatarUrl
                      ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover' }
                      : { background: avatarColor(msg.username) }
                  }
                  aria-hidden="true"
                >
                  {!avatarUrl && msg.username.charAt(0).toUpperCase()}
                </span>
                <div className={styles.msgBody}>
                  <div className={styles.msgMeta}>
                    <span className={styles.msgUsername}>{msg.username}</span>
                    {msg.surveyBadge && (
                      <span
                        className={`${styles.surveyBadge} ${styles[`badge_${msg.surveyBadge.surveyId.replace(/-/g, '_')}`] || ''}`}
                        title={`${msg.surveyBadge.surveyTitle}: ${msg.surveyBadge.result}`}
                        aria-label={`Survey result: ${msg.surveyBadge.badge}`}
                      >
                        <span className={styles.surveyBadgeDot} aria-hidden="true" />
                        <span className={styles.surveyBadgeText}>{msg.surveyBadge.badge}</span>
                      </span>
                    )}
                    <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
                  </div>
                  <div className={`${styles.msgBubble} ${bubbleThemeClass}`}>
                    <p className={styles.msgText}>{formatChatMessage(msg.message)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {blueReviewingUrl && (
          <div className={`${styles.chatMessage} ${styles.blueReviewingMessage}`}>
            <span
              className={styles.msgAvatar}
              style={{ backgroundImage: 'url(/blue/blue-avatar.png)', backgroundSize: 'cover' }}
              aria-hidden="true"
            />
            <div className={styles.msgBody}>
              <div className={styles.msgMeta}>
                <span className={styles.msgUsername}>Blue</span>
                <span className={styles.blueTypingTag}>reading link</span>
              </div>
              <div className={`${styles.msgBubble} ${styles.bubbleOther}`}>
                <p className={styles.msgText}>
                  <span className={styles.typingDots}>Reading {blueReviewingUrl}...</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {authNotice && !isAuth && (
        <div className={styles.authNotice} role="alert">
          <span>Sign in to send messages.</span>
          <button
            type="button"
            className={styles.authNoticeBtn}
            onClick={triggerLogin}
          >
            Sign in
          </button>
        </div>
      )}

      {stagedImage && (
        <div className={styles.stagedImageWrap}>
          <img src={stagedImage.url} alt={stagedImage.name} className={styles.stagedThumb} />
          <span className={styles.stagedName}>{stagedImage.name}</span>
          <button
            type="button"
            className={styles.stagedRemove}
            onClick={() => setStagedImage(null)}
            aria-label="Remove image"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      <div className={styles.chatInputWrap}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
          tabIndex={-1}
        />
        <button
          type="button"
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage || sending}
          aria-label="Upload image"
          title="Upload image"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <input
          ref={inputRef}
          className={styles.chatInput}
          type="text"
          placeholder={isAuth ? "Message..." : "Sign in to send messages..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onClick={() => play('input-focus')}
          onKeyDown={handleKeyDown}
          onFocus={markRead}
          maxLength={500}
          disabled={sending || uploadingImage}
        />
        <div className={styles.emojiPickerWrap} ref={emojiPickerRef}>
          <button
            type="button"
            className={styles.emojiButton}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            aria-label="Add emoji"
          >
            🧠
          </button>
          {showEmojiPicker && (
            <div className={styles.emojiGrid}>
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={styles.emojiOption}
                  onClick={() => addEmoji(emoji)}
                  aria-label={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.chatSend}
          onClick={sendMessage}
          disabled={(!input.trim() && !stagedImage) || sending || uploadingImage}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L12 22M12 2L5 9M12 2L19 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export { ChatRoom as GlobalChat };

