'use client';

import React, { useState, useEffect, useRef } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import { SurveysPageSkeleton } from '@/components/skeleton/Skeleton';
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
          Share your creative work with the community. Upload drawings, paintings, digital art, or any visual expression of your recovery journey.
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
              <h1 className={styles.title}>Meditations</h1>
              <p className={styles.subtitle}>
                Structured weekly journal prompts and creative recovery exercises. Complete activities, reflect, and seal your progress on-chain.
              </p>
            </header>

            {/* Artwork Section */}
            <ArtworkSection isLoaded={isLoaded} />

            {/* Meditations Journal Section */}
            <div className={`${styles.journalSection} ${isLoaded ? styles.journalSectionLoaded : ''}`}>
              <div className={styles.journalHeader}>
                <span className={styles.sectionLabel}>Creative Recovery</span>
                <h2 className={styles.sectionTitle}>Meditations Journal</h2>
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
