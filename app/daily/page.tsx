'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import BookCard from '@/components/book-card/BookCard';
import { SurveysPageSkeleton } from '@/components/skeleton/Skeleton';
import styles from './page.module.css';

const readings = [
  {
    title: 'How to make something great',
    author: 'By: Dr. Lina Ortiz, Ph.D.',
    description:
      'In the pantheon of creativity, whether product design, art, science, architecture, software, or some hybrid creature from the abyss of the mind\'s black hole, true greatness emerges not from one stroke of genius, but careful curation of the entire process.',
    category: 'Digital Research',
    imageUrl: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=900&auto=format&fit=crop&q=60',
    slug: 'how-to-make-something-great',
  },
  {
    title: 'Micro University?',
    author: 'By: Prof. Marcus Li, D.Phil.',
    description:
      'A rigorous theoretical and empirical analysis of governance mechanisms within academic decentralized autonomous organizations. This monograph synthesizes mechanism design theory, social choice theory, and institutional economics to evaluate the efficacy of quadratic voting protocols, reputation-weighted decision-making, and stewardship models.',
    category: 'Decision-making',
    imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=900&auto=format&fit=crop&q=60',
    slug: 'micro-university',
  },
  {
    title: 'From Viral 2 Ethereal',
    author: 'By: Dr. Jhinn Bay, Ph.D.',
    description:
      'A critical examination of autonomous agents designed for systematic literature review, citation network analysis, and knowledge synthesis. This investigation employs both computational experiments and philosophical inquiry to delineate the boundaries between algorithmic summarization and genuine scholarly comprehension.',
    category: 'AI Tools',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&auto=format&fit=crop&q=60',
    slug: 'from-viral-to-ethereal',
  },
];

export default function DailyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [readingSlug, setReadingSlug] = useState<string | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [isReadingLoading, setIsReadingLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setIsLoaded(true), 100);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleReadClick = useCallback(async (slug: string) => {
    setReadingSlug(slug);
    setIsReadingLoading(true);
    try {
      const res = await fetch(`/readings/${slug}.md`);
      if (res.ok) {
        const text = await res.text();
        setMarkdownContent(text);
      } else {
        setMarkdownContent('# Article not found\n\nThis reading is not yet available.');
      }
    } catch {
      setMarkdownContent('# Error\n\nFailed to load the article.');
    } finally {
      setIsReadingLoading(false);
    }
  }, []);

  const handleCloseReading = () => {
    setReadingSlug(null);
    setMarkdownContent('');
  };

  // Close on Escape
  useEffect(() => {
    if (!readingSlug) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseReading();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [readingSlug]);

  const activeReading = readings.find((r) => r.slug === readingSlug);

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.content}>
        {isLoading ? (
          <SurveysPageSkeleton />
        ) : (
          <>
            <header className={styles.hero}>
              <span className={styles.eyebrow}>Daily Practice</span>
              <h1 className={styles.title}>Daily</h1>
              <p className={styles.subtitle}>
                Curated readings from researchers and thought leaders. Read, rate, and save articles to deepen your understanding.
              </p>
            </header>

            <div className={`${styles.readingsGrid} ${isLoaded ? styles.readingsGridLoaded : ''}`}>
              {readings.map((book, index) => (
                <div
                  key={book.slug}
                  className={styles.cardWrapper}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <BookCard
                    title={book.title}
                    author={book.author}
                    description={book.description}
                    category={book.category}
                    imageUrl={book.imageUrl}
                    slug={book.slug}
                    onReadClick={handleReadClick}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Reading View Modal */}
      {readingSlug && (
        <div className={styles.readingOverlay} onClick={handleCloseReading}>
          <div className={styles.readingModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.readingModalHeader}>
              <button
                className={styles.readingCloseButton}
                onClick={handleCloseReading}
                type="button"
                aria-label="Close reading"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              {activeReading && (
                <div className={styles.readingModalMeta}>
                  <span className={styles.readingModalCategory}>{activeReading.category}</span>
                  <span className={styles.readingModalAuthor}>{activeReading.author}</span>
                </div>
              )}
            </div>
            <div className={styles.readingModalBody}>
              {isReadingLoading ? (
                <div className={styles.readingLoading}>Loading article...</div>
              ) : (
                <div className={styles.markdownContent}>
                  <ReactMarkdown>{markdownContent}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
