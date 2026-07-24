'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import QuestListPanel, { UnifiedQuest } from '@/components/quest-list-panel/QuestListPanel';
import QuestSidePanel from '@/components/quest-side-panel/QuestSidePanel';
import QuestModal from '@/components/quest-modal/QuestModal';
import QuestAuthorPanel from '@/components/quest-author-panel/QuestAuthorPanel';
import UsdcReviewPanel from '@/components/usdc-review-panel/UsdcReviewPanel';
import dynamic from 'next/dynamic';
import { useSound } from '@/hooks/useSound';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import { QUEST_DEFINITIONS, QuestType } from '@/lib/quest-definitions';
import type { QuestCardKind } from '@/components/quest-card/QuestCard';
import styles from './page.module.css';

const AngelUpsellModal = dynamic(() => import('@/components/angel-upsell-modal/AngelUpsellModal'), { ssr: false });

// Same daily scene Blue's stage shows on /dao.
const sceneUrl = dailySceneBackgroundUrl();

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
}

interface CustomQuest {
  id: string;
  title: string;
  description: string;
  points: number;
  questType: 'no-proof' | 'proof-required';
  targetCount: number;
  creatorWallet: string;
  creatorHandle: string | null;
  assigneeWallet: string | null;
  expiresAt: string | null;
  createdAt: string;
  progressCount: number;
}

function questKindFromType(type: QuestType): QuestCardKind {
  switch (type) {
    case 'sealed-week': return 'course';
    case 'proof-required': return 'submit';
    case 'no-proof': return 'mission';
    case 'twitter-follow':
    case 'follow-and-own': return 'social';
    default: return 'custom';
  }
}

export default function QuestsPage() {
  const { ready, authenticated, getAccessToken } = usePrivy();
  const { play } = useSound();

  const [selectedQuest, setSelectedQuest] = useState<UnifiedQuest | null>(null);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);
  const [questCounts, setQuestCounts] = useState<Record<string, number>>({});
  const [customQuests, setCustomQuests] = useState<CustomQuest[]>([]);
  const [authoredQuests, setAuthoredQuests] = useState<CustomQuest[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isMobile || !selectedQuest) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isMobile, selectedQuest]);

  const [forgeOpen, setForgeOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [angelPitchOpen, setAngelPitchOpen] = useState(false);


  const fetchWithAuth = useCallback(async (url: string, init?: RequestInit) => {
    const token = await getAccessToken();
    const authHeader: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    return fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      headers: { ...authHeader, ...(init?.headers ?? {}) },
    });
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready || !authenticated) { setIsPro(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth('/api/account/status');
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (!cancelled) setIsPro(Boolean(data?.hasVipMembershipCard));
      } catch {
        if (!cancelled) setIsPro(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated, fetchWithAuth, ready]);

  const refreshQuestData = useCallback(async () => {
    if (!ready || !authenticated) {
      setWeekStatuses([]);
      setQuestCounts({});
      setCustomQuests([]);
      return;
    }

    try {
      const [weeksRes, countsRes, visibleRes] = await Promise.all([
        fetchWithAuth('/api/ethereal-progress/all'),
        fetchWithAuth('/api/quests/progress'),
        fetchWithAuth('/api/admin/quests/visible'),
      ]);

      if (weeksRes.ok) {
        const weekData = await weeksRes.json();
        setWeekStatuses(weekData.weeks ?? []);
      }
      if (countsRes.ok) {
        const countData = await countsRes.json();
        setQuestCounts(countData.counts ?? {});
      }
      if (visibleRes.ok) {
        const data = await visibleRes.json();
        setCustomQuests(data.quests ?? []);
      }
    } catch {
      setWeekStatuses([]);
      setQuestCounts({});
      setCustomQuests([]);
    }
  }, [ready, authenticated, fetchWithAuth]);

  const refreshAuthoredQuests = useCallback(async () => {
    if (!ready || !authenticated || !isPro) { setAuthoredQuests([]); return; }
    try {
      const res = await fetchWithAuth('/api/admin/quests?mine=true');
      if (res.ok) {
        const data = await res.json();
        setAuthoredQuests(data.quests ?? []);
      }
    } catch {
      setAuthoredQuests([]);
    }
  }, [ready, authenticated, isPro, fetchWithAuth]);

  useEffect(() => { refreshQuestData(); }, [refreshQuestData]);
  useEffect(() => { refreshAuthoredQuests(); }, [refreshAuthoredQuests]);

  useEffect(() => {
    const handler = () => { refreshQuestData(); refreshAuthoredQuests(); };
    window.addEventListener('userLoaded', handler);
    window.addEventListener('userLoggedIn', handler);
    window.addEventListener('shardsUpdated', handler);
    return () => {
      window.removeEventListener('userLoaded', handler);
      window.removeEventListener('userLoggedIn', handler);
      window.removeEventListener('shardsUpdated', handler);
    };
  }, [refreshQuestData, refreshAuthoredQuests]);

  const allQuests = useMemo<UnifiedQuest[]>(() => {
    const builtIn: UnifiedQuest[] = QUEST_DEFINITIONS.map((quest) => {
      const claimedCount = Math.min(questCounts[quest.key] ?? 0, quest.targetCount);
      const progressCount = quest.questType === 'sealed-week'
        ? (weekStatuses.find((w) => w.weekNumber === quest.weekNumber)?.isSealed ? 1 : 0)
        : claimedCount;

      return {
        id: quest.key,
        title: quest.title,
        points: quest.points,
        desc: quest.desc,
        rewardType: quest.questType,
        targetCount: quest.targetCount,
        progressCount,
        claimedCount,
        weekNumber: quest.weekNumber,
        icon: quest.icon,
        usdcReward: quest.usdcReward,
        kind: questKindFromType(quest.questType),
      };
    });

    const custom: UnifiedQuest[] = customQuests.map((q) => {
      const handleLabel = q.creatorHandle
        ? `By @${q.creatorHandle}`
        : q.creatorWallet
          ? `By ${q.creatorWallet.slice(0, 6)}…${q.creatorWallet.slice(-4)}`
          : undefined;
      return {
        id: q.id,
        title: q.title,
        points: q.points,
        desc: q.description,
        rewardType: q.questType,
        targetCount: q.targetCount,
        progressCount: q.progressCount,
        claimedCount: q.progressCount,
        kind: 'custom',
        authorLabel: handleLabel,
      };
    });

    return [...builtIn, ...custom];
  }, [customQuests, questCounts, weekStatuses]);

  const usdcAvailable = useMemo(
    () => allQuests
      .filter((q) => (q.usdcReward ?? 0) > 0 && (q.claimedCount ?? 0) < (q.targetCount ?? 1))
      .reduce((sum, q) => sum + (q.usdcReward ?? 0), 0),
    [allQuests],
  );

  const handleQuestAuthored = useCallback(() => {
    refreshAuthoredQuests();
    refreshQuestData();
  }, [refreshAuthoredQuests, refreshQuestData]);

  // Forge and claims are staff tools (VIP card holders). Everyone else gets
  // the Academic Angel pitch — holding the Angel NFT is what unlocks USDC
  // quest payouts.
  const handleForge = useCallback(() => {
    play('click');
    if (isPro) setForgeOpen(true);
    else setAngelPitchOpen(true);
  }, [isPro, play]);

  const handleClaims = useCallback(() => {
    play('click');
    if (isPro) setClaimOpen(true);
    else setAngelPitchOpen(true);
  }, [isPro, play]);

  const handleDeleteAuthored = useCallback(async (id: string) => {
    if (!window.confirm('Archive this quest? It will stop appearing for users.')) return;
    const token = await getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/admin/quests/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
      headers,
    });
    if (res.ok) handleQuestAuthored();
  }, [getAccessToken, handleQuestAuthored]);

  return (
    <>
      <div
        className={styles.pageLayout}
        style={{ '--quests-scene': `url(${sceneUrl})` } as CSSProperties}
      >
        <div className={styles.scene} aria-hidden="true" />
        <SideNavigation />
        <main className={styles.content}>
          <QuestListPanel
            quests={allQuests}
            selectedQuestId={selectedQuest?.id ?? null}
            onSelectQuest={setSelectedQuest}
            onForge={handleForge}
            onClaims={handleClaims}
            usdcAvailable={usdcAvailable}
          />
          <aside className={styles.sideColumn}>
            <QuestSidePanel
              quest={selectedQuest}
              onDeselect={() => setSelectedQuest(null)}
            />
          </aside>
        </main>
      </div>

      <QuestModal isOpen={forgeOpen} onClose={() => setForgeOpen(false)} title="Quest forge">
        <QuestAuthorPanel
          fetchWithAuth={fetchWithAuth}
          authoredQuests={authoredQuests}
          onCreated={handleQuestAuthored}
          onDelete={handleDeleteAuthored}
        />
      </QuestModal>

      <QuestModal isOpen={claimOpen} onClose={() => setClaimOpen(false)} title="Quests to review">
        <UsdcReviewPanel fetchWithAuth={fetchWithAuth} />
      </QuestModal>

      <AngelUpsellModal
        isOpen={angelPitchOpen}
        onClose={() => setAngelPitchOpen(false)}
      />
    </>
  );
}
