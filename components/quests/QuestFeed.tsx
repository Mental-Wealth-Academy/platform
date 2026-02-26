'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './QuestFeed.module.css';

// Types
interface QuestData {
  id: string;
  title: string;
  description: string;
  category: 'mental-health' | 'productivity' | 'wealth' | 'community';
  payout: number;
  poolSize: number;
  maxWinners: number;
  currentParticipants: number;
  timeEstimate: 'quick' | 'standard' | 'extended';
  deadline?: string;
  questType: 'proof-required' | 'automatic' | 'twitter-follow';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Filter Types
type CategoryFilter = 'all' | 'mental-health' | 'productivity' | 'wealth' | 'community';
type PayoutFilter = 'all' | 'low' | 'medium' | 'high';
type TimeFilter = 'all' | 'quick' | 'standard' | 'extended';

// Category config
const categoryConfig = {
  'mental-health': { label: 'Mental Health', color: '#9B7ED9', icon: '🧠' },
  'productivity': { label: 'Productivity', color: '#5168FF', icon: '🚀' },
  'wealth': { label: 'Wealth', color: '#62BE8F', icon: '💰' },
  'community': { label: 'Community', color: '#FF8C42', icon: '👥' },
};

// Sample Quest Data
const sampleQuests: QuestData[] = [
  {
    id: 'q1',
    title: 'Complete 5 Daily Ideas',
    description: 'Learn 5 micro-insights from our idea cards to expand your mental wellness knowledge.',
    category: 'mental-health',
    payout: 15,
    poolSize: 500,
    maxWinners: 50,
    currentParticipants: 23,
    timeEstimate: 'quick',
    questType: 'automatic',
    difficulty: 'beginner',
  },
  {
    id: 'q2',
    title: 'Create a Viral Video',
    description: 'Use AI tools to craft a compelling marketing video featuring Mental Wealth Academy.',
    category: 'community',
    payout: 200,
    poolSize: 1000,
    maxWinners: 5,
    currentParticipants: 12,
    timeEstimate: 'extended',
    questType: 'proof-required',
    difficulty: 'advanced',
  },
  {
    id: 'q3',
    title: 'Follow @MentalWealthDAO',
    description: 'Connect your X account and follow our official Twitter for the latest updates.',
    category: 'community',
    payout: 10,
    poolSize: 200,
    maxWinners: 100,
    currentParticipants: 67,
    timeEstimate: 'quick',
    questType: 'twitter-follow',
    difficulty: 'beginner',
  },
  {
    id: 'q4',
    title: 'Meditations Productivity Challenge',
    description: 'Implement 3 productivity techniques from our library and share your results.',
    category: 'productivity',
    payout: 75,
    poolSize: 750,
    maxWinners: 10,
    currentParticipants: 8,
    timeEstimate: 'standard',
    questType: 'proof-required',
    difficulty: 'intermediate',
  },
  {
    id: 'q5',
    title: 'DeFi Basics Quiz',
    description: 'Complete our decentralized finance basics quiz to test your crypto knowledge.',
    category: 'wealth',
    payout: 25,
    poolSize: 500,
    maxWinners: 20,
    currentParticipants: 15,
    timeEstimate: 'quick',
    questType: 'automatic',
    difficulty: 'beginner',
  },
];

// Quest Card Component
const QuestCard: React.FC<{
  quest: QuestData;
  onStart: () => void;
  onSave: () => void;
}> = ({ quest, onStart, onSave }) => {
  const cat = categoryConfig[quest.category];
  const scaledPayout = Math.round(quest.payout * (quest.maxWinners / Math.max(quest.currentParticipants, 1)));
  
  return (
    <div className={styles.questCard}>
      {/* Category Badge */}
      <div 
        className={styles.categoryBadge}
        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
      >
        <span>{cat.icon}</span>
        <span>{cat.label}</span>
      </div>

      {/* Main Content */}
      <div className={styles.cardContent}>
        <h2 className={styles.questTitle}>{quest.title}</h2>
        <p className={styles.questDescription}>{quest.description}</p>

        {/* Pooled Rewards Info */}
        <div className={styles.poolInfo}>
          <div className={styles.poolStat}>
            <span className={styles.poolLabel}>Pool Size</span>
            <span className={styles.poolValue}>
              <Image src="/icons/shard.svg" alt="" width={16} height={16} />
              {quest.poolSize}
            </span>
          </div>
          <div className={styles.poolStat}>
            <span className={styles.poolLabel}>Winners</span>
            <span className={styles.poolValue}>{quest.currentParticipants}/{quest.maxWinners}</span>
          </div>
          <div className={styles.poolStat}>
            <span className={styles.poolLabel}>Est. Reward</span>
            <span className={styles.poolValueHighlight}>
              <Image src="/icons/shard.svg" alt="" width={16} height={16} />
              ~{scaledPayout}
            </span>
          </div>
        </div>

        {/* Meta Info */}
        <div className={styles.metaRow}>
          <span className={styles.metaBadge} data-time={quest.timeEstimate}>
            {quest.timeEstimate === 'quick' && '⚡ <1hr'}
            {quest.timeEstimate === 'standard' && '⏱️ 1-8hr'}
            {quest.timeEstimate === 'extended' && '📅 8hr+'}
          </span>
          <span className={styles.metaBadge} data-difficulty={quest.difficulty}>
            {quest.difficulty}
          </span>
          <span className={styles.metaBadge} data-type={quest.questType}>
            {quest.questType === 'automatic' && '🤖 Auto'}
            {quest.questType === 'proof-required' && '📸 Proof'}
            {quest.questType === 'twitter-follow' && '🐦 Twitter'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.cardActions}>
        <button 
          className={styles.saveButton}
          onClick={onSave}
          type="button"
          aria-label="Save quest"
        >
          <span>⭐</span>
        </button>
        <button 
          className={styles.startButton}
          onClick={onStart}
          type="button"
        >
          Start Quest
        </button>
      </div>
    </div>
  );
};

// Filter Bar Component
const FilterBar: React.FC<{
  category: CategoryFilter;
  payout: PayoutFilter;
  time: TimeFilter;
  onCategoryChange: (v: CategoryFilter) => void;
  onPayoutChange: (v: PayoutFilter) => void;
  onTimeChange: (v: TimeFilter) => void;
}> = ({ category, payout, time, onCategoryChange, onPayoutChange, onTimeChange }) => {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Skill</label>
        <select 
          value={category} 
          onChange={(e) => onCategoryChange(e.target.value as CategoryFilter)}
          className={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          <option value="mental-health">Mental Health</option>
          <option value="productivity">Productivity</option>
          <option value="wealth">Wealth</option>
          <option value="community">Community</option>
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Payout</label>
        <select 
          value={payout} 
          onChange={(e) => onPayoutChange(e.target.value as PayoutFilter)}
          className={styles.filterSelect}
        >
          <option value="all">Any Amount</option>
          <option value="low">Low ($0-50)</option>
          <option value="medium">Medium ($50-200)</option>
          <option value="high">High ($200+)</option>
        </select>
      </div>
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Time</label>
        <select 
          value={time} 
          onChange={(e) => onTimeChange(e.target.value as TimeFilter)}
          className={styles.filterSelect}
        >
          <option value="all">Any Duration</option>
          <option value="quick">Quick (&lt;1hr)</option>
          <option value="standard">Standard (1-8hr)</option>
          <option value="extended">Extended (8hr+)</option>
        </select>
      </div>
    </div>
  );
};

// Main QuestFeed Component
export const QuestFeed: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Filter quests
  const filteredQuests = useMemo(() => {
    return sampleQuests.filter(q => {
      if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
      if (payoutFilter === 'low' && q.payout > 50) return false;
      if (payoutFilter === 'medium' && (q.payout <= 50 || q.payout > 200)) return false;
      if (payoutFilter === 'high' && q.payout <= 200) return false;
      if (timeFilter !== 'all' && q.timeEstimate !== timeFilter) return false;
      return true;
    });
  }, [categoryFilter, payoutFilter, timeFilter]);

  // Handle snap scroll
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const scrollTop = feedRef.current.scrollTop;
    const cardHeight = feedRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / cardHeight);
    setCurrentIndex(newIndex);
  }, []);

  const scrollToCard = (index: number) => {
    if (!feedRef.current) return;
    const cardHeight = feedRef.current.clientHeight;
    feedRef.current.scrollTo({
      top: index * cardHeight,
      behavior: 'smooth',
    });
  };

  const handleStart = (questId: string) => {
    // TODO: Navigate to quest detail or start flow
    console.log('Starting quest:', questId);
  };

  const handleSave = (questId: string) => {
    // TODO: Save to user's saved quests
    console.log('Saving quest:', questId);
  };

  return (
    <div className={styles.feedContainer}>
      {/* Filter Bar */}
      <FilterBar
        category={categoryFilter}
        payout={payoutFilter}
        time={timeFilter}
        onCategoryChange={setCategoryFilter}
        onPayoutChange={setPayoutFilter}
        onTimeChange={setTimeFilter}
      />

      {/* Vertical Feed */}
      <div 
        ref={feedRef}
        className={styles.feed}
        onScroll={handleScroll}
      >
        <AnimatePresence>
          {filteredQuests.length > 0 ? (
            filteredQuests.map((quest, index) => (
              <motion.div
                key={quest.id}
                className={styles.feedItem}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <QuestCard
                  quest={quest}
                  onStart={() => handleStart(quest.id)}
                  onSave={() => handleSave(quest.id)}
                />
              </motion.div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🔍</span>
              <h3>No quests match your filters</h3>
              <p>Try adjusting your filter criteria</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      {filteredQuests.length > 1 && (
        <div className={styles.progressDots}>
          {filteredQuests.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              onClick={() => scrollToCard(index)}
              aria-label={`Go to quest ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}

      {/* Swipe Hint */}
      <div className={styles.swipeHint}>
        <span>↑ Swipe for more quests</span>
      </div>
    </div>
  );
};

export default QuestFeed;
