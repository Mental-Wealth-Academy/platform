'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Sparkle, BookOpen, PencilSimpleLine } from '@phosphor-icons/react';
import { useSound } from '@/hooks/useSound';
import CtaButton from '@/components/shared/CtaButton';
import type { CourseData } from '@/lib/personal-course';
import styles from './HomeActionCards.module.css';

const AngelUpsellModal = dynamic(
  () => import('@/components/angel-upsell-modal/AngelUpsellModal'),
  { ssr: false }
);

export interface HomeActionCardsProps {
  personalCourse: CourseData | null;
  bookmarkedCount: number;
  hasAngel: boolean;
}

export default function HomeActionCards({
  personalCourse,
  bookmarkedCount,
  hasAngel,
}: HomeActionCardsProps) {
  const router = useRouter();
  const { play } = useSound();
  const [angelGateOpen, setAngelGateOpen] = useState(false);

  const handleCardClick = (href: string) => {
    play('click');
    router.push(href);
  };

  const handleStudioAction = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    play('click');
    if (!hasAngel) {
      setAngelGateOpen(true);
      return;
    }
    router.push('/course-builder');
  };

  const personalTitle = personalCourse?.title ?? (bookmarkedCount > 0 ? 'Saved Guides' : 'Personal Guide');
  const personalBadge = personalCourse ? 'Active Track' : bookmarkedCount > 0 ? 'Saved Guides' : 'Personal Track';
  const personalDesc = personalCourse
    ? `A personal 4-week track tuned to ${personalCourse.focus.toLowerCase()} — weekly readings and tasks tuned to your goal.`
    : bookmarkedCount > 0
    ? `${bookmarkedCount} guide${bookmarkedCount === 1 ? '' : 's'} saved to your library. Review and practice at your own pace.`
    : 'Generate a personalized 4-week learning path focused on your specific interests and goals.';
  const personalMeta = personalCourse
    ? '4 sessions · In progress'
    : bookmarkedCount > 0
    ? `${bookmarkedCount} guides saved · Self-paced`
    : '4 sessions · Free';
  const personalCta = personalCourse
    ? 'Continue Track'
    : bookmarkedCount > 0
    ? 'View Bookmarks'
    : 'Start Track';

  return (
    <section className={styles.actionsContainer} aria-label="Learning actions">
      <div className={styles.actionsHeader}>
        <div className={styles.actionsHeaderMain}>
          <span className={styles.actionsEyebrow}>Actions</span>
          <h2 className={styles.actionsTitle}>Learning Paths</h2>
        </div>
        <p className={styles.actionsSubtitle}>
          Pick up where you left off or start a new syllabus
        </p>
      </div>

      <div className={styles.actionsGrid}>
        {/* Card 1: Blue's Quest */}
        <article
          className={styles.card}
          onClick={() => handleCardClick('/shadow-work')}
          onMouseEnter={() => play('soft-hover')}
          role="region"
          aria-label="Blue's Quest action card"
        >
          <div className={styles.cardTop}>
            <div className={styles.iconContainer}>
              <Image
                src="/blue/blue-home.png"
                alt="Blue"
                width={44}
                height={44}
                className={styles.iconImage}
              />
            </div>
            <span className={styles.badge}>12-Week Track</span>
          </div>

          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>Blue&apos;s Quest</h3>
            <p className={styles.cardDesc}>
              Guided shadow work and core curriculum with Blue. Complete lessons, daily reflections, and earn credits.
            </p>

            <div className={styles.metaRow}>
              <span>12 sessions</span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span>Credit rewards</span>
            </div>

            <div className={styles.cardFooter}>
              <CtaButton
                href="/shadow-work"
                variant="primary"
                block
                onClick={(e) => e.stopPropagation()}
              >
                Continue Quest
              </CtaButton>
            </div>
          </div>
        </article>

        {/* Card 2: Personal Curriculum */}
        <article
          className={styles.card}
          onClick={() => handleCardClick('/course/personal')}
          onMouseEnter={() => play('soft-hover')}
          role="region"
          aria-label="Personal Guide action card"
        >
          <div className={styles.cardTop}>
            <div className={styles.iconContainer}>
              {bookmarkedCount > 0 && !personalCourse ? (
                <BookOpen size={24} weight="bold" color="var(--color-primary)" />
              ) : (
                <Image
                  src="/academic-angels.webp"
                  alt="Curriculum emblem"
                  width={44}
                  height={44}
                  className={styles.iconImage}
                />
              )}
            </div>
            <span className={styles.badge}>{personalBadge}</span>
          </div>

          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>{personalTitle}</h3>
            <p className={styles.cardDesc}>{personalDesc}</p>

            <div className={styles.metaRow}>
              <span>{personalMeta}</span>
            </div>

            <div className={styles.cardFooter}>
              <CtaButton
                href="/course/personal"
                variant="secondary"
                block
                onClick={(e) => e.stopPropagation()}
              >
                {personalCta}
              </CtaButton>
            </div>
          </div>
        </article>

        {/* Card 3: Course Studio */}
        <article
          className={styles.card}
          onClick={() => handleStudioAction()}
          onMouseEnter={() => play('soft-hover')}
          role="region"
          aria-label="Course Studio action card"
        >
          <div className={styles.cardTop}>
            <div className={styles.iconContainer}>
              <PencilSimpleLine size={24} weight="bold" color="var(--color-primary)" />
            </div>
            <span className={styles.badge}>Course Studio</span>
          </div>

          <div className={styles.cardBody}>
            <h3 className={styles.cardTitle}>Build a Course</h3>
            <p className={styles.cardDesc}>
              Design custom syllabi, assemble lesson modules from verified guides, and publish learning tracks for the Academy.
            </p>

            <div className={styles.metaRow}>
              <span>Custom syllabus</span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span>Creator tools</span>
            </div>

            <div className={styles.cardFooter}>
              <CtaButton
                variant="secondary"
                block
                onClick={handleStudioAction}
              >
                Build a Course
              </CtaButton>
            </div>
          </div>
        </article>
      </div>

      <AngelUpsellModal
        isOpen={angelGateOpen}
        onClose={() => setAngelGateOpen(false)}
      />
    </section>
  );
}
