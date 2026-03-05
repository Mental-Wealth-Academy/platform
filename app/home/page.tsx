'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface WeekStatus {
  weekNumber: number;
  isSealed: boolean;
  sealTxHash: string | null;
}

function ArtworkSection({ isLoaded }: { isLoaded: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const { play } = useSound();

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
          onClick={() => { play('click'); fileInputRef.current?.click(); }}
          onMouseEnter={() => play('hover')}
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
        <button className={styles.artworkSubmit} type="button" onClick={() => play('success')} onMouseEnter={() => play('hover')}>
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { play } = useSound();

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
  }, []);

  // Check auth first, then fetch week statuses only if authenticated
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json().catch(() => ({ user: null }));
        if (!meData?.user) return;

        setIsAuthenticated(true);
        const res = await fetch('/api/ethereal-progress/all', { credentials: 'include' });
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

  const handleFocus = useCallback((e: React.FocusEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'TEXTAREA' || tag === 'INPUT') play('hover');
  }, [play]);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content} onFocus={handleFocus}>
            {/* Aquarium Pill */}
            <div className={`${styles.heroPill} ${isLoaded ? styles.heroPillLoaded : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.imgur.com/ACKcust.gif"
                alt="Aquarium"
                className={styles.heroPillGif}
              />
            </div>

            {/* 12-Week Timeline */}
            <div className={`${styles.calendarSection} ${isLoaded ? styles.calendarSectionLoaded : ''}`}>
              <div className={styles.journalHeader}>
                <span className={styles.courseLabel}>An Oasis of Intellectual Refreshment</span>
                <h2 className={styles.courseTitle}>Discover Your Ethereal Horizon</h2>
                <p className={styles.courseDesc}>
                  Each week strips back a layer, recovering a core sense of self you probably forgot you had. Creative exercises, sealed on-chain, at your own pace.
                </p>
              </div>
              <div className={styles.timeline}>
                <div className={styles.timelineTrack}>
                  <div
                    className={styles.timelineFill}
                    style={{ width: `${(weekStatuses.filter(w => w.isSealed && w.weekNumber > 0 && w.weekNumber < WEEK_TITLES.length - 1).length / (WEEK_TITLES.length - 2)) * 100}%` }}
                  />
                </div>
                <div className={styles.timelineMarkers}>
                  {WEEK_TITLES.map((title, i) => {
                    if (i === 0 || i === WEEK_TITLES.length - 1) return null;
                    const status = getWeekStatus(i);
                    const isSealed = status?.isSealed ?? false;
                    return (
                      <div key={i} className={styles.timelineMarker} title={title}>
                        <div className={`${styles.timelineDot} ${isSealed ? styles.timelineDotSealed : ''}`}>
                          {isSealed && <span className={styles.timelineDotCheck}>&#10003;</span>}
                        </div>
                        <span className={styles.timelineLabel}>{i}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Journal Section */}
            <div className={`${styles.journalSection} ${isLoaded ? styles.journalSectionLoaded : ''}`}>
              <div className={styles.privacyNotice}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Daily journals are stored safely against your pseudonym. All journal entries are saved through encryption, and unlocked using the final key earned after all 12 weeks are sealed.
              </div>
              <div className={styles.journalCards}>
                {WEEK_TITLES.map((title, i) => {
                  if (i === 0 || i === WEEK_TITLES.length - 1) return null;
                  const status = getWeekStatus(i);
                  return (
                    <AccordionJournalCard
                      key={i}
                      weekNumber={i}
                      weekTitle={title}
                      initialIsSealed={status?.isSealed}
                      initialSealTxHash={status?.sealTxHash}
                      onSealComplete={handleSealComplete}
                      enablePersistence={isAuthenticated}
                    />
                  );
                })}
              </div>
            </div>

            {/* Artwork Section */}
            <ArtworkSection isLoaded={isLoaded} />

            {/* Course Banner */}
            <div className={`${styles.courseBanner} ${isLoaded ? styles.courseIntroLoaded : ''}`}>
              <Image
                src="https://i.imgur.com/ckhi8jC.jpeg"
                alt="Discover Your Ethereal Horizon"
                width={900}
                height={240}
                className={styles.courseBannerImg}
                unoptimized
              />
            </div>
      </main>
    </div>
  );
}
