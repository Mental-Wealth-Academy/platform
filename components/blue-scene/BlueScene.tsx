'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import { DiamondReward } from '@/components/rewards/DiamondReward';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import HolographicFolder from '@/components/shared/HolographicFolder';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import LivestreamFeed from './LivestreamFeed';
import styles from './BlueScene.module.css';

const bgUrl = dailySceneBackgroundUrl();

interface Balloon {
  id: number;
  /** Horizontal position, percent of scene width. */
  left: number;
  /** Vertical resting position for reduced-motion mode, percent from top. */
  top: number;
  color: string;
  size: number;
  /** Seconds for the full rise. */
  duration: number;
  /** Sway phase offset so balloons don't move in lockstep. */
  delay: number;
  popped: boolean;
}

const BALLOON_COLORS = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-mental-health)',
  'var(--color-productivity)',
];

const MAX_ACTIVE_BALLOONS = 7;
const SPAWN_INTERVAL_MS = 1700;
const FLUSH_DEBOUNCE_MS = 2500;

type Dialogue = { ja: string; en: string; chaotic?: boolean };

const DIALOGUES: Array<[number, Dialogue]> = [
  [200, { ja: 'グリッドが…動いてる…私のコードがおかしいのかな？', en: 'THE GRID IS ALIVE. Is my code broken?', chaotic: true }],
  [150, { ja: '数が…勝手に増えてる…止められない', en: 'The numbers… they grow on their own. I cant stop it.', chaotic: true }],
  [100, { ja: 'データが耳の中で囁いてる…', en: 'I can hear the data whispering…', chaotic: true }],
  [80, { ja: '風船の神様になった気分', en: 'I feel powerful. Like a balloon god.' }],
  [75, { ja: 'もう何が何だか…風船なの？星なの？', en: 'I dont even know anymore… are these balloons? Stars??' }],
  [60, { ja: '癖になるって言いたくないけど…癖になってる', en: 'Im not saying its addicting but… its addicting.' }],
  [52, { ja: '一つに名前をつけたんだ。上手くいかなかった', en: 'I named one of them. It didnt end well.' }],
  [50, { ja: '五十？！増えてる…？大丈夫なやつ？', en: '50?! Are they… multiplying? Should I be worried?' }],
  [40, { ja: '慣れてきた。生まれつきの才能だね', en: 'Im getting good at this. Natural talent.' }],
  [35, { ja: '三十五…そろそろ休憩したほうがいい気がする', en: '35… maybe we should take a break. Just saying.' }],
  [30, { ja: '風船の一つがウィンクした気がする', en: 'I think I saw one blink at me.' }],
  [25, { ja: '二十五って…風船多すぎじゃない？', en: 'OK 25 is like… a lot of balloons. What is happening.' }],
  [23, { ja: '止めたほうがいい？止められないんだけど', en: 'Should we stop? I cant stop. Ive tried.' }],
  [20, { ja: '何やってるか分かんないけど、めっちゃ上手い', en: 'I dont know what Im doing but Im doing it great.' }],
  [15, { ja: '十五！もう一回数えよ…一、二…', en: '15! Im gonna count again… one, two…' }],
  [12, { ja: '十三。不吉な数字。なんか好き', en: 'Thirteen. Spooky. I love it.' }],
  [10, { ja: '十！十だよ！指で数えた！', en: 'TEN. That is ten. I counted. On my fingers.' }],
  [8, { ja: '潰したとき、風船って何か感じてるのかな…', en: 'I wonder if they feel anything when they pop.' }],
  [7, { ja: '七！ラッキーセブン！良いことあるよね？', en: "Seven! Lucky seven! That's good right?" }],
  [6, { ja: 'ブーンって音、聞こえる？私だけ？', en: 'Do you hear a humming sound? No? Just me?' }],
  [5, { ja: '五！一より多い！多分ね。', en: 'Five! That is more than one! I think.' }],
  [4, { ja: '数えてるよ…大体ね。もう二回も分からなくなった', en: "I'm keeping track. Sort of. I lost count twice." }],
  [3, { ja: '三！四の一個前の数字！…だと思う', en: "Three! That's the number before four. I think." }],
  [2, { ja: 'えっ…これ、私がやったの？たぶん違う。', en: 'Wait… did I do that? Maybe. Probably not.' }],
  [1, { ja: 'わっ。何か弾けた…私のせい？', en: 'Whoa. Something popped. Was that… me?' }],
];

const IDLE_DIALOGUE: Dialogue = { ja: 'えっと…風船、触ってもいいよ。無理しなくて大丈夫。', en: 'Umm… you can touch the balloons. If you want. No pressure.' };

function balloonDialogue(pops: number): Dialogue {
  for (const [threshold, d] of DIALOGUES) {
    if (pops >= threshold) return d;
  }
  return IDLE_DIALOGUE;
}

export default function BlueScene() {
  const { play } = useSound();
  const [view, setView] = useState<'garden' | 'live'>('live');
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [sessionPops, setSessionPops] = useState(0);
  const [communityTotal, setCommunityTotal] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [rewardData, setRewardData] = useState<{ shards: number } | null>(null);

  const idRef = useRef(0);
  const poppedIdsRef = useRef(new Set<number>());
  const sessionPopsRef = useRef(0);
  const pendingPopsRef = useRef(0);
  const lastMilestoneRef = useRef(0);
  const baselineRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removalTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  // Restore last rewarded milestone from storage and use it as baseline
  // so cumulative pop tracking works across sessions.
  useEffect(() => {
    const saved = getStorageItem('lastBalloonMilestone');
    if (saved) {
      const n = Number(saved);
      if (!isNaN(n) && n > 0) {
        lastMilestoneRef.current = n;
        baselineRef.current = n;
      }
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    fetch('/api/balloon-pops', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.total === 'number') setCommunityTotal(d.total);
      })
      .catch(() => {/* counter is best-effort */});
  }, []);

  const handleRewardComplete = useCallback(() => setRewardData(null), []);

  const flushPops = useCallback(() => {
    const count = pendingPopsRef.current;
    if (count <= 0) return;
    pendingPopsRef.current = 0;
    fetch('/api/balloon-pops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.total === 'number') setCommunityTotal(d.total);
      })
      .catch(() => {/* keep optimistic local total */});
  }, []);

  // Flush any unsent pops when the tab is hidden or the component unmounts.
  useEffect(() => {
    const onPageHide = () => {
      const count = pendingPopsRef.current;
      if (count <= 0) return;
      pendingPopsRef.current = 0;
      navigator.sendBeacon?.(
        '/api/balloon-pops',
        new Blob([JSON.stringify({ count })], { type: 'application/json' })
      );
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      onPageHide();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      removalTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Spawn balloons while the tab is visible.
  useEffect(() => {
    if (view !== 'garden') return;

    const spawn = () => {
      if (document.hidden) return;
      setBalloons((prev) => {
        if (prev.length >= MAX_ACTIVE_BALLOONS) return prev;
        idRef.current += 1;
        const id = idRef.current;
        const duration = reducedMotion ? 9 : 7 + Math.random() * 5;
        const balloon: Balloon = {
          id,
          left: 4 + Math.random() * 88,
          top: 8 + Math.random() * 55,
          color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
          size: 44 + Math.random() * 26,
          duration,
          delay: Math.random() * 2,
          popped: false,
        };
        const timer = setTimeout(() => {
          removalTimersRef.current.delete(id);
          setBalloons((p) => p.filter((b) => b.id !== id));
        }, duration * 1000 + 400);
        removalTimersRef.current.set(id, timer);
        return [...prev, balloon];
      });
    };

    spawn();
    const interval = setInterval(spawn, SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [reducedMotion, view]);

  const popBalloon = useCallback((id: number) => {
    if (poppedIdsRef.current.has(id)) return;
    poppedIdsRef.current.add(id);

    setBalloons((prev) => prev.map((b) => (b.id === id ? { ...b, popped: true } : b)));

    const existing = removalTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const burstTimer = setTimeout(() => {
      removalTimersRef.current.delete(id);
      poppedIdsRef.current.delete(id);
      setBalloons((p) => p.filter((b) => b.id !== id));
    }, 450);
    removalTimersRef.current.set(id, burstTimer);

    play('pop');
    sessionPopsRef.current += 1;
    setSessionPops(sessionPopsRef.current);
    if (sessionPopsRef.current % 10 === 0) play('celebration');
    setCommunityTotal((t) => (t === null ? t : t + 1));

    // Reward 10 diamonds every 5 cumulative pops across sessions
    const cumulativePops = baselineRef.current + sessionPopsRef.current;
    if (cumulativePops % 5 === 0 && cumulativePops > lastMilestoneRef.current) {
      lastMilestoneRef.current = cumulativePops;
      setStorageItem('lastBalloonMilestone', String(cumulativePops));

      fetch('/api/quests/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questId: `balloon-${cumulativePops}`, shards: 10 }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.shardsAwarded > 0) {
            setRewardData({ shards: data.shardsAwarded });
            window.dispatchEvent(new Event('shardsUpdated'));
          }
        })
        .catch((err: unknown) => console.error('Failed to complete balloon quest:', err));
    }

    pendingPopsRef.current += 1;
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushPops, FLUSH_DEBOUNCE_MS);
  }, [flushPops, play]);

  const dialogue = useMemo(() => balloonDialogue(sessionPops), [sessionPops]);

  return (
    <section className={styles.scene} aria-label={view === 'garden' ? 'Balloon popping with Blue' : 'Live session feed'}>
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeading}>
          <span className={styles.sceneTitleJa} lang="ja">{view === 'garden' ? '幻想庭園' : '生配信'}</span>
          <span className={styles.sceneTitle}>{view === 'garden' ? 'Ethereal Gardens' : 'Live Sessions'}</span>
        </div>
        <div className={styles.sceneSwitch} role="tablist" aria-label="Scene view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'garden'}
            className={`${styles.sceneSwitchButton} ${view === 'garden' ? styles.sceneSwitchButtonActive : ''}`}
            onClick={() => { play('click'); setView('garden'); }}
          >
            Garden
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'live'}
            className={`${styles.sceneSwitchButton} ${view === 'live' ? styles.sceneSwitchButtonActive : ''}`}
            onClick={() => { play('click'); setView('live'); }}
          >
            Live
          </button>
        </div>
      </div>

      {view === 'garden' ? (
        <>
          <div className={styles.bgImage} style={{ backgroundImage: `url(${bgUrl})` }} />
          <HolographicFolder
            className={styles.gardenArchiveFolder}
            label="Academy world map"
            fileSrc="/images/interactive-folders/academy-world-map.webp"
            fileAlt="Illustrated Academy world map"
            fileWidth={1920}
            fileHeight={1547}
          />
          <div className={styles.sceneFooter}>
            <div className={`${styles.footerText}${dialogue.chaotic ? ' ' + styles.footerTextChaotic : ''}`}>
              <span className={styles.footerTextJa}>{dialogue.ja}</span>
              <span className={styles.footerTextEn}>{dialogue.en}</span>
            </div>
            <div className={styles.footerCounters}>
              <span className={styles.counterChip}>
                <span className={styles.counterLabel}>you</span>
                <span className={styles.counterValue}>{sessionPops}</span>
              </span>
              <span className={styles.counterChip}>
                <span className={styles.counterLabel}>community</span>
                <span className={styles.counterValue}>
                  {communityTotal === null ? '—' : communityTotal.toLocaleString()}
                </span>
              </span>
            </div>
          </div>

          {balloons.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`${styles.balloon} ${reducedMotion ? styles.balloonStatic : styles.balloonRising} ${b.popped ? styles.balloonPopped : ''}`}
              style={{
                left: `${b.left}%`,
                width: b.size,
                color: b.color,
                ...(reducedMotion ? { top: `${b.top}%` } : {}),
                '--rise-duration': `${b.duration}s`,
                '--sway-delay': `${b.delay}s`,
              } as React.CSSProperties}
              tabIndex={-1}
              onClick={() => popBalloon(b.id)}
              disabled={b.popped}
              aria-label="Pop balloon"
            >
              {b.popped ? (
                <span className={styles.burst} aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <span
                      key={i}
                      className={styles.particle}
                      style={{ '--angle': `${i * 45}deg` } as React.CSSProperties}
                    />
                  ))}
                </span>
              ) : (
                <svg viewBox="0 0 60 108" aria-hidden="true">
                  <path
                    d="M30 2 C13 2 8 16 8 27 C8 40 20 50 27 52 L25 57 L35 57 L33 52 C40 50 52 40 52 27 C52 16 47 2 30 2 Z"
                    fill="currentColor"
                  />
                  <ellipse cx="21" cy="18" rx="6" ry="9" fill="var(--color-text-light)" opacity="0.32" />
                  <path
                    d="M30 57 C30 70 22 74 26 84 C29 92 34 96 32 106"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    opacity="0.55"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          ))}

          <div className={styles.blueWrap}>
            <Image
              src="/blue/blue-home.png"
              alt="Blue, the Academy mascot"
              width={742}
              height={705}
              priority
              className={styles.blueImage}
            />
          </div>

          {rewardData && (
            <DiamondReward amount={rewardData.shards} onComplete={handleRewardComplete} />
          )}
        </>
      ) : (
        <LivestreamFeed gardenBackground={bgUrl} />
      )}
    </section>
  );
}
