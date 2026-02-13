'use client';

import React, { useState, useEffect } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import { SurveysPageSkeleton } from '@/components/skeleton/Skeleton';
import styles from './page.module.css';

export default function TasksPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setIsLoaded(true), 100);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content}>
        {isLoading ? (
          <SurveysPageSkeleton />
        ) : (
          <>
            {/* Hero Section */}
            <header className={styles.hero}>
              <span className={styles.eyebrow}>Community Resources</span>
              <h1 className={styles.title}>Weekly</h1>
              <p className={styles.subtitle}>
                Structured weekly journal prompts and creative recovery exercises. Complete activities, reflect, and seal your progress on-chain.
              </p>
            </header>

            {/* Weekly Journal Section */}
            <div className={`${styles.journalSection} ${isLoaded ? styles.journalSectionLoaded : ''}`}>
              <div className={styles.journalHeader}>
                <span className={styles.sectionLabel}>Creative Recovery</span>
                <h2 className={styles.sectionTitle}>Weekly Journal</h2>
              </div>
              <div className={styles.journalCards}>
                <AccordionJournalCard
                  weekNumber={1}
                  weekTitle="Recovering a Sense of Safety"
                />
                <AccordionJournalCard
                  weekNumber={2}
                  weekTitle="Recovering a Sense of Identity"
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
