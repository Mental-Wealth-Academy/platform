'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Check, Sparkle, Coins, CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { DrawerQuest } from '@/components/quest-drawer/QuestDrawer';
import type { QuestCardKind } from '@/components/quest-card/QuestCard';
import { useSound } from '@/hooks/useSound';
import styles from './QuestListPanel.module.css';

export interface UnifiedQuest extends DrawerQuest {
  kind: QuestCardKind;
}

const KIND_COLOR: Record<QuestCardKind, string> = {
  course: '#5168ff',
  mission: '#4ea968',
  submit: '#ff9c51',
  social: '#a871f4',
  custom: '#ff648e',
};

const KIND_LABEL: Record<QuestCardKind, string> = {
  course: 'Course',
  mission: 'Mission',
  submit: 'Submit',
  social: 'Social',
  custom: 'Custom',
};

interface QuestListPanelProps {
  quests: UnifiedQuest[];
  selectedQuestId: string | null;
  onSelectQuest: (quest: UnifiedQuest) => void;
  onForge: () => void;
  onClaims: () => void;
  usdcAvailable: number;
}

function isQuestCleared(quest: UnifiedQuest): boolean {
  return (quest.claimedCount ?? 0) >= (quest.targetCount ?? 1);
}

export default function QuestListPanel({
  quests,
  selectedQuestId,
  onSelectQuest,
  onForge,
  onClaims,
  usdcAvailable,
}: QuestListPanelProps) {
  const { play } = useSound();

  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const PAGE_SIZE = 3;

  const completedQuests = quests.filter((q) => isQuestCleared(q));
  const availableQuests = quests.filter((q) => !isQuestCleared(q));
  const displayQuests = activeTab === 'available' ? availableQuests : completedQuests;
  const totalPages = isMobile ? Math.max(1, Math.ceil(displayQuests.length / PAGE_SIZE)) : 1;
  // Clamp the page when the list shrinks (a quest gets cleared, a refresh drops
  // one) or when a resize changes the page count — otherwise the board renders
  // an empty slice with no empty-state to explain it.
  const safePage = Math.min(currentPage, totalPages - 1);
  useEffect(() => {
    if (currentPage > totalPages - 1) setCurrentPage(totalPages - 1);
  }, [currentPage, totalPages]);

  const pagedQuests = isMobile
    ? displayQuests.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
    : displayQuests;

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.listHeader}>
          <span className={styles.listHeaderTitle}>
            <span className={styles.listHeaderJa}>任務</span> Quest Board
          </span>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => { play('click'); onForge(); }}
              onMouseEnter={() => play('hover')}
            >
              <Sparkle size={13} weight="fill" />
              Quest forge
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => { play('click'); onClaims(); }}
              onMouseEnter={() => play('hover')}
            >
              <Coins size={13} weight="fill" />
              Claims
            </button>
          </div>
          {usdcAvailable > 0 && (
            <span
              className={styles.usdcStat}
              title="USDC bounties are paid on-chain to your wallet. Academic Angels only — hold the NFT on Base to unlock."
            >
              <Image src="/icons/usdc-logo.svg" alt="USDC" width={15} height={15} />
              ${usdcAvailable}
              <span className={styles.usdcStatLabel}>rewards</span>
            </span>
          )}
        </div>

        <div className={styles.tabBar} role="tablist" aria-label="Quest filter">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'available'}
            className={`${styles.tab} ${activeTab === 'available' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('available'); setCurrentPage(0); }}
          >
            Available
            <span className={styles.tabCount}>{availableQuests.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`${styles.tab} ${activeTab === 'completed' ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab('completed'); setCurrentPage(0); }}
          >
            Completed
            <span className={styles.tabCount}>{completedQuests.length}</span>
          </button>
        </div>

        <div className={styles.list}>
          {displayQuests.length === 0 ? (
            <div className={styles.empty}>
              {activeTab === 'available'
                ? 'All quests cleared! Check the completed tab.'
                : 'No completed quests yet.'}
            </div>
          ) : (
            pagedQuests.map((quest) => {
              const targetCount = quest.targetCount ?? 1;
              const completed = isQuestCleared(quest);
              const inProgress = !completed && (quest.progressCount ?? 0) > 0;
              const color = KIND_COLOR[quest.kind];
              const isSelected = quest.id === selectedQuestId;
              const usdcReward = quest.usdcReward ?? 0;

              return (
                <button
                  key={quest.id}
                  type="button"
                  className={`${styles.card} ${isSelected ? styles.cardActive : ''} ${completed ? styles.cardDone : ''}`}
                  style={{ '--accent': color } as React.CSSProperties}
                  onClick={() => { play('click'); onSelectQuest(quest); }}
                  onMouseEnter={() => play('hover')}
                >
                  <span className={styles.artwork} data-kind={quest.kind} aria-hidden="true" />

                  <span className={styles.info}>
                    <span className={styles.metaRow}>
                      <span className={styles.kindTag}>
                        <span className={styles.kindDot} aria-hidden="true" />
                        {KIND_LABEL[quest.kind]}
                      </span>
                      {inProgress && <span className={styles.stateTag}>In progress</span>}
                      {quest.authorLabel && <span className={styles.byline}>{quest.authorLabel}</span>}
                    </span>
                    <span className={styles.title}>{quest.title}</span>
                    <span className={styles.desc}>{quest.desc}</span>
                  </span>

                  <span className={styles.rewards}>
                    {completed ? (
                      <>
                        <span className={styles.checkDone}>
                          <Check size={14} weight="bold" />
                        </span>
                        <span className={styles.clearedLabel}>Cleared</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.rewardChip} title={`${quest.points} credits`}>
                          <Image src="/icons/ui-diamond.svg" alt="" width={13} height={13} />
                          {quest.points}
                          <span className={styles.srOnly}> credits</span>
                        </span>
                        {usdcReward > 0 && (
                          <span className={`${styles.rewardChip} ${styles.rewardChipUsdc}`} title={`$${usdcReward} USDC bounty`}>
                            <Image src="/icons/usdc-logo.svg" alt="USDC" width={14} height={14} />
                            ${usdcReward}
                          </span>
                        )}
                        {targetCount > 1 && (
                          <span
                            className={styles.progressLabel}
                            title={`${Math.min(quest.progressCount ?? 0, targetCount)} of ${targetCount} completed`}
                          >
                            {Math.min(quest.progressCount ?? 0, targetCount)}/{targetCount}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {isMobile && displayQuests.length > PAGE_SIZE && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={safePage === 0}
              onClick={() => { play('click'); setCurrentPage((p) => Math.max(0, p - 1)); }}
              aria-label="Previous page"
            >
              <CaretLeft size={12} weight="bold" />
              Prev
            </button>
            <span className={styles.pageInfo}>
              Page {safePage + 1} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={safePage >= totalPages - 1}
              onClick={() => { play('click'); setCurrentPage((p) => Math.min(totalPages - 1, p + 1)); }}
              aria-label="Next page"
            >
              Next
              <CaretRight size={12} weight="bold" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
