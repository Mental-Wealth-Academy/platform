'use client';

import React, { useState, useEffect } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import PromptCard from '@/components/prompt-card/PromptCard';
import BookCard from '@/components/book-card/BookCard';
import AccordionJournalCard from '@/components/accordion-journal/AccordionJournalCard';
import { SurveysPageSkeleton } from '@/components/skeleton/Skeleton';
import styles from './page.module.css';

const taskLibrary = [
  {
    promptName: 'Nano Banano - Cyberpunk Cityscape',
    promptText: `Create a stunning cyberpunk cityscape at night, featuring neon-lit skyscrapers that pierce through a dense fog. The scene should include:

- Vibrant neon signs in cyan, magenta, and electric blue
- Flying vehicles with glowing trails cutting through the sky
- Rain-slicked streets reflecting the neon glow
- Holographic advertisements floating in the air
- A sense of depth with buildings fading into the misty distance
- High contrast between dark shadows and bright neon lights
- Style: Digital art, cinematic lighting, 4K quality`,
    submittedBy: 'Jordan Park',
  },
  {
    promptName: 'Nano Banano - Surreal Nature Fusion',
    promptText: `Design a surreal landscape where nature and technology merge seamlessly. Imagine:

- Bioluminescent plants that pulse with soft light
- Mechanical butterflies with crystalline wings
- Trees with circuit-like patterns in their bark
- Floating islands connected by energy bridges
- A color palette of deep purples, electric greens, and warm golds
- Magical atmosphere with particles of light drifting through the air
- Style: Fantasy art, highly detailed, dreamlike quality`,
    submittedBy: 'Riley Morgan',
  },
  {
    promptName: 'Nano Banano - Abstract Geometric Art',
    promptText: `Generate an abstract geometric composition featuring:

- Interlocking geometric shapes in vibrant colors
- Smooth gradients transitioning between complementary hues
- Clean lines and precise angles
- Depth created through layering and shadows
- A balanced composition with visual flow
- Modern, minimalist aesthetic
- High resolution with sharp details
- Style: Contemporary digital art, vector-inspired`,
    submittedBy: 'Casey Lee',
  },
];

const readings = [
  {
    title: 'How to make something great',
    author: 'By: Dr. Lina Ortiz, Ph.D.',
    description:
      'In the pantheon of creativity, wether product design, art, schiece, architecture, software, or some hybrid creature from the abyss of the mind\'s black hole, true greatness emerges not from one stroke of genius, but careful curation of the entire process.',
    category: 'Digital Research',
    imageUrl: 'https://images.unsplash.com/photo-1639628739763-3d4ada1a656a?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y3liZXIlMjBwc3ljaG9sb2d5fGVufDB8fDB8fHww',
  },
  {
    title: 'Micro University?',
    author: 'By: Prof. Marcus Li, D.Phil.',
    description:
      'A rigorous theoretical and empirical analysis of governance mechanisms within academic decentralized autonomous organizations. This monograph synthesizes mechanism design theory, social choice theory, and institutional economics to evaluate the efficacy of quadratic voting protocols, reputation-weighted decision-making, and stewardship models in maintaining both democratic legitimacy and epistemic rigor within scholarly communities.',
    category: 'Decision-making',
    imageUrl: 'https://plus.unsplash.com/premium_photo-1683977922495-3ab3ce7ba4e6?q=80&w=2200&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    title: 'From Viral 2 Ethereal',
    author: 'By: Dr. Jhinn Bay, Ph.D.',
    description:
      'A critical examination of autonomous agents designed for systematic literature review, citation network analysis, and knowledge synthesis. This investigation employs both computational experiments and philosophical inquiry to delineate the boundaries between algorithmic summarization and genuine scholarly comprehension, addressing questions of epistemic authority, bias propagation, and the necessary conditions for human oversight in AI-augmented research workflows.',
    category: 'AI Tools',
    imageUrl: 'https://images.unsplash.com/photo-1580077910645-a6fd54032e15?w=900&auto=format&fit=crop&q=60',
  },
];

export default function TasksPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'journal' | 'nano' | 'readings'>('journal');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => setIsLoaded(true), 100);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const showReadings = activeFilter === 'readings';
  const showJournal = activeFilter === 'journal';
  const showNano = activeFilter === 'nano';

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
              <h1 className={styles.title}>Tasks</h1>
              <p className={styles.subtitle}>
                Explore community-submitted prompts, templates, and readings. Copy, customize, and contribute your own to help others learn.
              </p>
            </header>

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
              <button
                className={`${styles.filterTab} ${activeFilter === 'journal' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('journal')}
                type="button"
              >
                Weekly Journal
              </button>
              <button
                className={`${styles.filterTab} ${activeFilter === 'readings' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('readings')}
                type="button"
              >
                Readings
              </button>
              <button
                className={`${styles.filterTab} ${activeFilter === 'nano' ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter('nano')}
                type="button"
              >
                Nano Banano
              </button>
            </div>

            {/* Weekly Journal Section */}
            {showJournal && (
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
            )}

            {/* Readings Section */}
            {showReadings && (
              <div className={`${styles.tasksGrid} ${isLoaded ? styles.tasksGridLoaded : ''}`}>
                {readings.map((book, index) => (
                  <div
                    key={book.title}
                    className={styles.taskCardWrapper}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <BookCard {...book} />
                  </div>
                ))}
              </div>
            )}

            {/* Nano Banano Prompts */}
            {showNano && (
              <div className={`${styles.tasksGrid} ${isLoaded ? styles.tasksGridLoaded : ''}`}>
                {taskLibrary.map((task, index) => (
                  <div
                    key={task.promptName}
                    className={styles.taskCardWrapper}
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <PromptCard
                      promptName={task.promptName}
                      promptText={task.promptText}
                      submittedBy={task.submittedBy}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
