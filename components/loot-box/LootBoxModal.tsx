'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useSound } from '@/hooks/useSound';
import styles from './LootBoxModal.module.css';

interface LootItem {
  id: string;
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
  image: string;
  description: string;
  chance: number; // percentage
}

const LOOT_TABLE: LootItem[] = [
  {
    id: 'shards-5',
    name: '+5 Shards',
    tier: 'common',
    image: '/icons/ui-shard.svg',
    description: 'A small shard bonus to fuel your journey.',
    chance: 35,
  },
  {
    id: 'shards-15',
    name: '+15 Shards',
    tier: 'uncommon',
    image: '/icons/ui-shard.svg',
    description: 'A generous shard drop. Keep spinning!',
    chance: 25,
  },
  {
    id: 'xp-boost',
    name: 'XP Boost',
    tier: 'common',
    image: '/icons/guidance.svg',
    description: 'Double quest XP for your next 3 completions.',
    chance: 20,
  },
  {
    id: 'voting-power',
    name: 'Voting Power +1',
    tier: 'uncommon',
    image: '/icons/governance.svg',
    description: 'Temporary governance boost for the next proposal.',
    chance: 10,
  },
  {
    id: 'edition-01',
    name: 'Edition 01',
    tier: 'rare',
    image: 'https://i.imgur.com/57ahVVX.png',
    description: 'The coveted Edition 01 magazine. A collector\'s piece.',
    chance: 6,
  },
  {
    id: 'ctrl-hrzn',
    name: 'Academy CTRL HRZN',
    tier: 'legendary',
    image: 'https://i.imgur.com/TPujE2j.png',
    description: 'The legendary CTRL HRZN. Only the luckiest claim this.',
    chance: 4,
  },
];

const SPIN_COST = 10;
const EMERGENCY_FUND_PERCENT = 20;

// Build a weighted pool for reel display variety
function weightedPick(): LootItem {
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const item of LOOT_TABLE) {
    cumulative += item.chance;
    if (roll < cumulative) return item;
  }
  return LOOT_TABLE[0];
}

function buildReelItems(count: number): LootItem[] {
  return Array.from({ length: count }, () => weightedPick());
}

const TIER_STYLE: Record<string, string> = {
  common: styles.tierCommon,
  uncommon: styles.tierUncommon,
  rare: styles.tierRare,
  legendary: styles.tierLegendary,
};

interface LootBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  shardCount: number | null;
  onShardsSpent: (newCount: number) => void;
}

const LootBoxModal: React.FC<LootBoxModalProps> = ({ isOpen, onClose, shardCount, onShardsSpent }) => {
  const { play } = useSound();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<LootItem | null>(null);
  const [reelItems, setReelItems] = useState<LootItem[]>(() => buildReelItems(40));
  const [reelOffset, setReelOffset] = useState(0);
  const animFrameRef = useRef<number>(0);
  const reelRef = useRef<HTMLDivElement>(null);

  // Item height matches CSS .reelItem height
  const itemHeight = typeof window !== 'undefined' && window.innerWidth <= 900 ? 120 : 140;

  const canSpin = shardCount !== null && shardCount >= SPIN_COST;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setSpinning(false);
      setReelOffset(0);
      setReelItems(buildReelItems(40));
    }
  }, [isOpen]);

  const spin = useCallback(async () => {
    if (!canSpin || spinning) return;

    play('click');
    setResult(null);
    setSpinning(true);

    // Determine final result
    const finalItem = weightedPick();

    // Build reel: random items + final item at a target index
    const newReel = buildReelItems(40);
    const targetIndex = 30; // land on index 30
    newReel[targetIndex] = finalItem;
    setReelItems(newReel);

    // Animate the reel scroll
    const targetOffset = targetIndex * itemHeight;
    const duration = 3000; // 3 seconds
    const startTime = performance.now();
    const startOffset = 0;
    setReelOffset(0);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for slot machine feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentOffset = startOffset + (targetOffset - startOffset) * eased;
      setReelOffset(currentOffset);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
        setSpinning(false);
        setResult(finalItem);
        play(finalItem.tier === 'legendary' ? 'celebration' : finalItem.tier === 'rare' ? 'success' : 'click');

        // Deduct shards via API
        deductShards();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSpin, spinning, play, itemHeight]);

  const deductShards = async () => {
    try {
      const res = await fetch('/api/loot-box/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        onShardsSpent(data.newShardCount);
        window.dispatchEvent(new Event('shardsUpdated'));
      }
    } catch (err) {
      console.error('Failed to record spin:', err);
    }
  };

  const handleCollect = () => {
    play('success');
    setResult(null);
    setReelOffset(0);
    setReelItems(buildReelItems(40));
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Loot Box</h2>
          <p className={styles.subtitle}>Spin for rare items, shards, and boosts</p>
        </div>

        {/* Spin Area */}
        <div className={styles.spinArea}>
          {/* Reel Window */}
          <div className={styles.reelWindow}>
            <div className={styles.reelPointer} />
            <div className={styles.reelPointerLeft} />
            <div
              ref={reelRef}
              className={styles.reelStrip}
              style={{ transform: `translateY(-${reelOffset}px)` }}
            >
              {reelItems.map((item, i) => (
                <div key={`${item.id}-${i}`} className={styles.reelItem}>
                  <img
                    src={item.image}
                    alt={item.name}
                    className={styles.reelItemIcon}
                  />
                  <div className={styles.reelItemInfo}>
                    <span className={styles.reelItemName}>{item.name}</span>
                    <span className={`${styles.reelItemTier} ${TIER_STYLE[item.tier]}`}>
                      {item.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spin Button */}
          <button
            className={`${styles.spinButton} ${spinning ? styles.spinButtonSpinning : ''}`}
            onClick={spin}
            disabled={!canSpin || spinning}
            onMouseEnter={() => play('hover')}
          >
            {spinning ? 'Spinning...' : 'Spin'}
            <span className={styles.costBadge}>
              <Image src="/icons/ui-shard.svg" alt="" width={14} height={14} className={styles.costIcon} />
              {SPIN_COST}
            </span>
          </button>

          {!canSpin && !spinning && (
            <div className={styles.insufficientNotice}>
              Not enough shards — you need {SPIN_COST} to spin
              {shardCount !== null && ` (you have ${shardCount})`}
            </div>
          )}
        </div>

        {/* Drop Table */}
        <div className={styles.lootTable}>
          <div className={styles.lootTableTitle}>Drop Rates</div>
          <div className={styles.lootTableGrid}>
            {LOOT_TABLE.map((item) => (
              <div key={item.id} className={styles.lootTableRow}>
                <div className={styles.lootTableItem}>
                  <img src={item.image} alt="" className={styles.lootTableIcon} />
                  <span className={styles.lootTableName}>{item.name}</span>
                </div>
                <span className={`${styles.lootTableChance} ${TIER_STYLE[item.tier]}`} style={{ padding: '2px 6px', borderRadius: 3 }}>
                  {item.chance}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Fund Notice */}
        <div className={styles.fundNotice}>
          <p className={styles.fundNoticeText}>
            <span className={styles.fundNoticeHighlight}>{EMERGENCY_FUND_PERCENT}%</span> of every spin funds the{' '}
            <span className={styles.fundNoticeHighlight}>Emergency Individual Support</span> budget
          </p>
        </div>

        {/* Result Overlay */}
        {result && (
          <div className={styles.resultOverlay}>
            <div style={{ position: 'relative' }}>
              <img src={result.image} alt={result.name} className={styles.resultImage} />
              <div className={styles.resultShine} />
            </div>
            <div className={styles.resultTitle}>{result.name}</div>
            <div className={`${styles.resultTier} ${TIER_STYLE[result.tier]}`}>
              {result.tier}
            </div>
            <div className={styles.resultDescription}>{result.description}</div>
            <button
              className={styles.resultButton}
              onClick={handleCollect}
              onMouseEnter={() => play('hover')}
            >
              Collect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LootBoxModal;
