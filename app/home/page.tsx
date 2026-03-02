'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import styles from './page.module.css';

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
  sealTxHash: string | null;
}

function ArtworkSection({ isLoaded }: { isLoaded: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : '');
  };

  return (
    <div className={`${styles.artworkSection} ${isLoaded ? styles.artworkSectionLoaded : ''}`}>
      <div className={styles.journalHeader}>
        <span className={styles.sectionLabel}>Creative Expression</span>
        <h2 className={styles.sectionTitle}>Artwork</h2>
      </div>
      <div className={styles.artworkCard}>
        <p className={styles.artworkDesc}>
          Seal all 14 milestones then upload a piece of art that represents the new you.
        </p>
        <div
          className={styles.artworkDropzone}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.artworkFileInput}
            onChange={handleFileChange}
          />
          <span className={styles.artworkDropzoneIcon}>+</span>
          <span className={styles.artworkDropzoneText}>
            {fileName || 'Click to select an image'}
          </span>
          <span className={styles.artworkDropzoneHint}>PNG, JPG, or GIF up to 10 MB</span>
        </div>
        <button className={styles.artworkSubmit} type="button">
          Submit Artwork
        </button>
      </div>
    </div>
  );
}

const WEEK_TITLES = [
  'Introduction: Reading',
  'Recovering a Sense of Safety',
  'Recovering a Sense of Identity',
  'Recovering a Sense of Power',
  'Recovering a Sense of Integrity',
  'Recovering a Sense of Possibility',
  'Recovering a Sense of Abundance',
  'Recovering a Sense of Connection',
  'Recovering a Sense of Strength',
  'Recovering a Sense of Compassion',
  'Recovering a Sense of Self-Protection',
  'Recovering a Sense of Autonomy',
  'Recovering a Sense of Faith',
  'Epilogue',
];

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [weekStatuses, setWeekStatuses] = useState<WeekStatus[]>([]);

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
  }, []);

  // Fetch all week statuses on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/wealth-progress/all', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setWeekStatuses(data.weeks);
        }
      } catch {
        // Not authenticated — use empty defaults
      }
    })();
  }, []);

  const handleSealComplete = useCallback((weekNumber: number, txHash: string) => {
    setWeekStatuses(prev =>
      prev.map(w =>
        w.weekNumber === weekNumber ? { ...w, isSealed: true, sealTxHash: txHash } : w
      )
    );
  }, []);

  const getWeekStatus = (week: number) => weekStatuses.find(w => w.weekNumber === week);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content}>
            {/* Hero Pill */}
            <div className={`${styles.heroPill} ${isLoaded ? styles.heroPillLoaded : ''}`}>
              <Image
                src="https://i.imgur.com/HFjHyUZ.png"
                alt="Azura"
                width={40}
                height={40}
                className={styles.heroPillAvatar}
                unoptimized
              />
              <span className={styles.heroPillText}>For those seeking something more</span>
            </div>

            {/* Course Intro */}
            <div className={`${styles.courseIntro} ${isLoaded ? styles.courseIntroLoaded : ''}`}>
              <span className={styles.courseLabel}>An Oasis of Intellectual Refreshment</span>
              <h2 className={styles.courseTitle}>Discover Your Ethereal Horizon</h2>
              <p className={styles.courseDesc}>
                A 12-week journey towards the Ethereal Horizon. Each week focuses on recovering a core sense of self. Complete creative exercises and seal them for your self-paced evolution.
              </p>
              <div className={styles.courseBanner}>
                <Image
                  src="https://i.imgur.com/ckhi8jC.jpeg"
                  alt="Discover Your Ethereal Horizon"
                  width={900}
                  height={240}
                  className={styles.courseBannerImg}
                  unoptimized
                />
              </div>
            </div>

            {/* Journal Section */}
            <div className={`${styles.journalSection} ${isLoaded ? styles.journalSectionLoaded : ''}`}>
              <div className={styles.journalHeader}>
                <span className={styles.sectionLabel}>Wealth Progress</span>
                <h2 className={styles.sectionTitle}>Ethereal Horizon Pathway</h2>
              </div>
              <div className={styles.journalCards}>
                {WEEK_TITLES.map((title, i) => {
                  const status = getWeekStatus(i);
                  return (
                    <AccordionJournalCard
                      key={i}
                      weekNumber={i}
                      weekTitle={title}
                      initialIsSealed={status?.isSealed}
                      initialSealTxHash={status?.sealTxHash}
                      onSealComplete={handleSealComplete}
                    />
                  );
                })}
              </div>
            </div>

            {/* Artwork Section */}
            <ArtworkSection isLoaded={isLoaded} />
      </main>
    </div>
  );
}
