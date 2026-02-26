'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import styles from './SuccessStories.module.css';

interface SuccessStory {
  id: string;
  username: string;
  avatarUrl?: string;
  questTitle: string;
  reward: number;
  testimonial: string;
  completedAt: string;
}

// Sample stories
const sampleStories: SuccessStory[] = [
  {
    id: 's1',
    username: 'mindful_maya',
    avatarUrl: '/uploads/HappyEmote.png',
    questTitle: 'Daily Ideas Challenge',
    reward: 25,
    testimonial: 'Learning 5 ideas a day changed my morning routine. Small wins add up!',
    completedAt: '2 hours ago',
  },
  {
    id: 's2',
    username: 'crypto_sage',
    questTitle: 'DeFi Basics Quiz',
    reward: 50,
    testimonial: 'Finally understand what DAOs are. The expert commentary was worth it.',
    completedAt: '5 hours ago',
  },
  {
    id: 's3',
    username: 'productivity_pro',
    avatarUrl: '/uploads/ConfusedEmote.png',
    questTitle: 'Meditations Productivity',
    reward: 75,
    testimonial: 'Implemented the Pomodoro technique from the ideas. Game changer!',
    completedAt: '1 day ago',
  },
  {
    id: 's4',
    username: 'wellness_warrior',
    questTitle: 'Community Builder',
    reward: 100,
    testimonial: 'Love how the quests connect with what I learned. Real application!',
    completedAt: '2 days ago',
  },
];

export const SuccessStories: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 280;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Success Stories</h2>
        <div className={styles.navButtons}>
          <button 
            onClick={() => scroll('left')}
            className={styles.navButton}
            aria-label="Previous"
            type="button"
          >
            ←
          </button>
          <button 
            onClick={() => scroll('right')}
            className={styles.navButton}
            aria-label="Next"
            type="button"
          >
            →
          </button>
        </div>
      </div>

      <div ref={scrollRef} className={styles.carousel}>
        {sampleStories.map((story, index) => (
          <motion.div
            key={story.id}
            className={styles.storyCard}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* User Info */}
            <div className={styles.userInfo}>
              <div className={styles.avatar}>
                {story.avatarUrl ? (
                  <Image
                    src={story.avatarUrl}
                    alt={story.username}
                    width={40}
                    height={40}
                    className={styles.avatarImage}
                    unoptimized
                  />
                ) : (
                  <span className={styles.avatarPlaceholder}>
                    {story.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className={styles.userDetails}>
                <span className={styles.username}>@{story.username}</span>
                <span className={styles.timestamp}>{story.completedAt}</span>
              </div>
            </div>

            {/* Quest Badge */}
            <div className={styles.questBadge}>
              <span className={styles.questIcon}>⚔️</span>
              <span className={styles.questName}>{story.questTitle}</span>
            </div>

            {/* Testimonial */}
            <p className={styles.testimonial}>&ldquo;{story.testimonial}&rdquo;</p>

            {/* Reward */}
            <div className={styles.reward}>
              <span className={styles.rewardLabel}>Earned</span>
              <span className={styles.rewardValue}>
                <Image src="/icons/shard.svg" alt="" width={16} height={16} />
                +{story.reward}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SuccessStories;
