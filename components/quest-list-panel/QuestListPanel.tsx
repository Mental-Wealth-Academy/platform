'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Check, CaretLeft, CaretRight, ArrowRight } from '@phosphor-icons/react';
import type { DrawerQuest } from '@/components/quest-drawer/QuestDrawer';
import type { QuestCardKind } from '@/components/quest-card/QuestCard';
import { getWellnessTheme } from '@/components/quest-icon/QuestIcon';
import { useSound } from '@/hooks/useSound';
import styles from './QuestListPanel.module.css';

export interface UnifiedQuest extends DrawerQuest {
  kind: QuestCardKind;
}

interface QuestListPanelProps {
  quests: UnifiedQuest[];
  selectedQuestId: string | null;
  onSelectQuest: (quest: UnifiedQuest) => void;
  onForge?: () => void;
  onClaims?: () => void;
  usdcAvailable?: number;
}

function isQuestCleared(quest: UnifiedQuest): boolean {
  return (quest.claimedCount ?? 0) >= (quest.targetCount ?? 1);
}

export default function QuestListPanel({
  quests,
  selectedQuestId,
  onSelectQuest,
}: QuestListPanelProps) {
  const { play } = useSound();

  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState<'left' | 'right' | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const completedQuests = quests.filter((q) => isQuestCleared(q));
  const availableQuests = quests.filter((q) => !isQuestCleared(q));
  const displayQuests = activeTab === 'available' ? availableQuests : completedQuests;

  // Keep activeIndex within bounds
  useEffect(() => {
    if (displayQuests.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex >= displayQuests.length) {
      setActiveIndex(Math.max(0, displayQuests.length - 1));
    }
  }, [displayQuests.length, activeIndex]);

  // Sync activeIndex with external selectedQuestId
  useEffect(() => {
    if (!selectedQuestId || displayQuests.length === 0) return;
    const idx = displayQuests.findIndex((q) => q.id === selectedQuestId);
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [selectedQuestId, displayQuests, activeIndex]);

  // Clear animation after duration
  useEffect(() => {
    if (!swipeAnim) return;
    const timer = setTimeout(() => setSwipeAnim(null), 240);
    return () => clearTimeout(timer);
  }, [swipeAnim]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      play('click');
      setSwipeAnim('right');
      const nextIdx = activeIndex - 1;
      setActiveIndex(nextIdx);
      onSelectQuest(displayQuests[nextIdx]);
    }
  }, [activeIndex, displayQuests, onSelectQuest, play]);

  const handleNext = useCallback(() => {
    if (activeIndex < displayQuests.length - 1) {
      play('click');
      setSwipeAnim('left');
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      onSelectQuest(displayQuests[nextIdx]);
    }
  }, [activeIndex, displayQuests, onSelectQuest, play]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  const handleTabChange = (tab: 'available' | 'completed') => {
    play('click');
    setActiveTab(tab);
    setActiveIndex(0);
    const targetList = tab === 'available' ? availableQuests : completedQuests;
    if (targetList[0]) {
      onSelectQuest(targetList[0]);
    }
  };

  const currentQuest = displayQuests[activeIndex] ?? null;
  const theme = currentQuest ? getWellnessTheme(currentQuest.id || activeIndex) : null;
  const ThemeIcon = theme?.icon ?? null;
  const targetCount = currentQuest?.targetCount ?? 1;
  const progressCount = Math.min(currentQuest?.progressCount ?? 0, targetCount);
  const completed = currentQuest ? isQuestCleared(currentQuest) : false;
  const inProgress = !completed && progressCount > 0;
  const usdcReward = currentQuest?.usdcReward ?? 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.listHeader}>
          <span className={styles.listHeaderTitle}>Quest Board</span>
        </div>

        {/* Full-width tabs */}
        <div className={styles.tabBar} role="tablist" aria-label="Quest filter">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'available'}
            className={`${styles.tab} ${activeTab === 'available' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('available')}
          >
            Available
            <span className={styles.tabCount}>{availableQuests.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`${styles.tab} ${activeTab === 'completed' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('completed')}
          >
            Completed
            <span className={styles.tabCount}>{completedQuests.length}</span>
          </button>
        </div>

        {/* Main Quest Card Viewport */}
        <div className={styles.cardViewport}>
          {!currentQuest ? (
            <div className={styles.empty}>
              {activeTab === 'available'
                ? 'All quests cleared. Check the completed tab.'
                : 'No completed quests yet.'}
            </div>
          ) : (
            <div
              className={`${styles.card} ${swipeAnim ? styles[`swipe_${swipeAnim}`] : ''}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              role="region"
              aria-label={`Quest: ${currentQuest.title}`}
            >
              {/* Vibrant Wellness Theme Stage Header */}
              {theme && ThemeIcon && (
                <div className={styles.stage} data-theme={theme.name}>
                  <div className={styles.stageBackdrop} aria-hidden="true" />
                  <div className={styles.stageGlow} aria-hidden="true" />

                  {/* Top Badges Row */}
                  <div className={styles.stageBadgesRow}>
                    <div className={styles.statusBadges}>
                      {completed ? (
                        <span className={styles.clearedBadge}>
                          <Check size={13} weight="bold" />
                          Quest cleared
                        </span>
                      ) : inProgress ? (
                        <span className={styles.inProgressBadge}>
                          In progress
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.rewardBadges}>
                      <div className={styles.rewardChip} title={`${currentQuest.points} credits`}>
                        <Image src="/icons/ui-diamond.svg" alt="" width={15} height={15} />
                        <span>+{currentQuest.points}</span>
                        <span className={styles.rewardLabel}>credits</span>
                      </div>
                      {usdcReward > 0 && (
                        <div
                          className={`${styles.rewardChip} ${styles.rewardChipUsdc}`}
                          title={`$${usdcReward} USDC bounty`}
                        >
                          <Image src="/icons/usdc-logo.svg" alt="USDC" width={15} height={15} />
                          <span>+${usdcReward}</span>
                          <span className={styles.rewardLabel}>USDC</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Centered Theme Emblem and Label */}
                  <div className={styles.stageCenter}>
                    <div className={styles.themeEmblem}>
                      <ThemeIcon size={38} weight="duotone" className={styles.themeIcon} />
                    </div>
                    <span className={styles.themeLabel}>{theme.label}</span>
                  </div>
                </div>
              )}

              {/* Card Body */}
              <div className={styles.cardBody}>
                <div className={styles.titleRow}>
                  <h2 className={styles.title}>{currentQuest.title}</h2>
                  {currentQuest.authorLabel && (
                    <span className={styles.byline}>By {currentQuest.authorLabel}</span>
                  )}
                </div>

                <p className={styles.desc}>{currentQuest.desc}</p>

                {/* Multi-step progress bar */}
                {targetCount > 1 && (
                  <div className={styles.progressContainer}>
                    <div className={styles.progressHeader}>
                      <span className={styles.progressText}>Objective progress</span>
                      <span className={styles.progressCount}>
                        {progressCount} / {targetCount}
                      </span>
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: `${Math.round((progressCount / targetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <div className={styles.cardActionRow}>
                  {completed ? (
                    <div className={styles.clearedStatusRow}>
                      <Check size={18} weight="bold" />
                      <span>Quest cleared</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => {
                        play('click');
                        onSelectQuest(currentQuest);
                      }}
                      onMouseEnter={() => play('hover')}
                    >
                      <span>Inspect goal and requirements</span>
                      <ArrowRight size={16} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className={styles.bottomNavRow}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={activeIndex === 0}
            onClick={handlePrev}
            aria-label="Previous quest"
          >
            <CaretLeft size={13} weight="bold" />
            Prev
          </button>

          <div className={styles.navCenter}>
            <span className={styles.pageInfo}>
              Quest {displayQuests.length === 0 ? 0 : activeIndex + 1} of {displayQuests.length}
            </span>
            {displayQuests.length > 1 && displayQuests.length <= 12 && (
              <div className={styles.dotTrack} aria-hidden="true">
                {displayQuests.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.dot} ${idx === activeIndex ? styles.dotActive : ''}`}
                    onClick={() => {
                      play('click');
                      setActiveIndex(idx);
                      onSelectQuest(displayQuests[idx]);
                    }}
                    tabIndex={-1}
                    aria-label={`Go to quest ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.pageBtn}
            disabled={activeIndex >= displayQuests.length - 1}
            onClick={handleNext}
            aria-label="Next quest"
          >
            Next
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
