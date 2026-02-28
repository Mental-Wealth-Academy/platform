'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import styles from './page.module.css';

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
          Seal all 12 weeks then upload a piece of art that represents the new you.
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

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsLoaded(true));
  }, []);

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
              <h2 className={styles.courseTitle}>Exploring The Self</h2>
              <p className={styles.courseDesc}>
                A 12-week guided journey inspired by The Artist&apos;s Way. Each week focuses on recovering a core sense of self. Complete creative exercises and seal them at your own pace.
              </p>
              <div className={styles.courseBanner}>
                <Image
                  src="https://i.imgur.com/ckhi8jC.jpeg"
                  alt="Exploring The Self"
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
                <span className={styles.sectionLabel}>Weekly Workbooks</span>
                <h2 className={styles.sectionTitle}>12-Week Pathway</h2>
              </div>
              <div className={styles.journalCards}>
                <AccordionJournalCard
                  weekNumber={0}
                  weekTitle="Introduction: Reading"
                />
                <AccordionJournalCard
                  weekNumber={1}
                  weekTitle="Recovering a Sense of Safety"
                />
                <AccordionJournalCard
                  weekNumber={2}
                  weekTitle="Recovering a Sense of Identity"
                />
                <AccordionJournalCard
                  weekNumber={3}
                  weekTitle="Recovering a Sense of Power"
                />
                <AccordionJournalCard
                  weekNumber={4}
                  weekTitle="Recovering a Sense of Integrity"
                />
                <AccordionJournalCard
                  weekNumber={5}
                  weekTitle="Recovering a Sense of Possibility"
                />
                <AccordionJournalCard
                  weekNumber={6}
                  weekTitle="Recovering a Sense of Abundance"
                />
                <AccordionJournalCard
                  weekNumber={7}
                  weekTitle="Recovering a Sense of Connection"
                />
                <AccordionJournalCard
                  weekNumber={8}
                  weekTitle="Recovering a Sense of Strength"
                />
                <AccordionJournalCard
                  weekNumber={9}
                  weekTitle="Recovering a Sense of Compassion"
                />
                <AccordionJournalCard
                  weekNumber={10}
                  weekTitle="Recovering a Sense of Self-Protection"
                />
                <AccordionJournalCard
                  weekNumber={11}
                  weekTitle="Recovering a Sense of Autonomy"
                />
                <AccordionJournalCard
                  weekNumber={12}
                  weekTitle="Recovering a Sense of Faith"
                />
                <AccordionJournalCard
                  weekNumber={13}
                  weekTitle="Epilogue"
                />
              </div>
            </div>

            {/* Artwork Section */}
            <ArtworkSection isLoaded={isLoaded} />
      </main>
    </div>
  );
}
