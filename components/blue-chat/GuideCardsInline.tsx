'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './BlueChat.module.css';
import type { GuideRecommendCard } from '@/lib/guide-api-schemas';

const MAX_PREREQ_CHIPS = 3;

interface GuideCardsInlineProps {
  cards: GuideRecommendCard[];
  /** Called when the user follows a card link, so the chat overlay can close. */
  onNavigate?: () => void;
}

/**
 * Small knowledge-node cards Blue drops into the chat: the guide, a one-line
 * summary, and the prereqs still standing between the user and it. Clicking
 * the card or 'open node' navigates directly to the learning node.
 */
const GuideCardsInline: React.FC<GuideCardsInlineProps> = ({ cards, onNavigate }) => {
  const router = useRouter();

  const handleNavigate = (slug: string) => {
    router.push(`/learn/guides/${slug}`);
    setTimeout(() => {
      onNavigate?.();
    }, 60);
  };

  return (
    <div className={styles.guideCards}>
      {cards.map((card) => {
        const hiddenPrereqs = card.prereqs.length - MAX_PREREQ_CHIPS;
        // Don't show 'ready now' badge; only show 'done' or 'X steps away' if locked
        const showBadge = card.completed || (!card.ready && card.prereqs.length > 0);
        const badgeClass = card.completed
          ? styles.guideCardBadgeDone
          : styles.guideCardBadgeLocked;
        const badgeText = card.completed
          ? 'done'
          : `${card.prereqs.length} step${card.prereqs.length === 1 ? '' : 's'} away`;

        return (
          <div
            key={card.id}
            className={styles.guideCard}
            onClick={() => handleNavigate(card.slug)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigate(card.slug);
              }
            }}
          >
            <div className={styles.guideCardHead}>
              <span className={styles.guideCardTitle}>
                {card.topicTitle}
              </span>
              {showBadge && (
                <span className={`${styles.guideCardBadge} ${badgeClass}`}>{badgeText}</span>
              )}
            </div>
            {card.summary && <p className={styles.guideCardSummary}>{card.summary}</p>}
            <div className={styles.guideCardFoot}>
              {typeof card.estimatedMinutes === 'number' && (
                <span className={styles.guideCardMinutes}>{card.estimatedMinutes} min</span>
              )}
              {!card.completed && card.prereqs.length > 0 && (
                <span
                  className={styles.guideCardPrereqs}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className={styles.guideCardPrereqLabel}>first:</span>
                  {card.prereqs.slice(0, MAX_PREREQ_CHIPS).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.guideCardPrereqChip}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigate(p.slug);
                      }}
                    >
                      {p.topicTitle}
                    </button>
                  ))}
                  {hiddenPrereqs > 0 && (
                    <span className={styles.guideCardPrereqMore}>and {hiddenPrereqs} more</span>
                  )}
                </span>
              )}
              <span className={styles.guideCardGo}>
                open node →
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GuideCardsInline;
