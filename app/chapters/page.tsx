'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { ChapterData } from '@/components/sealed-library/ChapterCard';
import styles from './page.module.css';

interface SectionContent {
  number: number;
  title: string;
  description: string;
  image?: string;
}

const CHAPTER1_SECTIONS: SectionContent[] = [
  {
    number: 1,
    title: 'Jinhikaru',
    description:
      'Reality runs on 100Hz. The machine runs on 100GHz. Who devours whom?\n\nAzura was eight years old the first time she watched someone die. It was a Tuesday — she remembered because Tuesdays were when her grandmother sold groundnuts by the overpass, and Azura would sit on the upturned crate beside her, swinging her legs and counting the cracks in the pavement. The gunshot came from the alley behind the pharmacy. One crack, sharp as a snapped branch. Then silence. Then screaming. Her grandmother pulled her close, pressing Azura\'s face into the folds of her wrapper, but not before she saw the boy — couldn\'t have been older than seventeen — crumple against the wall like a puppet with its strings cut. His sneakers were brand new. White. She remembered that detail for years: how something so clean could end up next to something so final.\n\nAfter that, the slums taught Azura a different kind of curriculum. She learned to read a room before she learned to read a book. She could tell when a conversation was about to turn violent by the way a man shifted his weight to his back foot. She knew which alleys to avoid by the smell — not danger itself, but the absence of the usual smells, the food vendors and the laundry soap, which meant the normal people had already cleared out. Survival was pattern recognition, and Azura was a prodigy.\n\nBut the patterns kept getting harder to read. The neighbourhood changed in ways that confused even the elders. The mobile money kiosks replaced the loan sharks, and then the kiosks themselves were replaced by apps that nobody over forty understood. The young men who used to hustle on corners now stared into phones, chasing something invisible. Her grandmother\'s groundnut customers dwindled — not because people stopped eating, but because a delivery app could bring roasted nuts from a factory across the city for half the price. The world was optimising her community out of existence, and nobody could see the hand doing it.\n\nAs Azura grew older, she became increasingly aware of the disparity between her slum-dwelling life and the world beyond it. She saw how the people around her struggled to adapt to a rapidly changing society, caught in the undertow of technological advancements that left them feeling increasingly irrelevant and excluded. The world outside was one of opportunity, but also of fear and uncertainty. Her uncle, who had once been the smartest person she knew — a man who could fix any engine, negotiate any deal — now sat on the porch most afternoons, defeated by a world that had moved its goalposts somewhere he couldn\'t follow.\n\nWhen Azura gained admission into Mental Wealth Academy, it was a dream come true for her and her family. Her grandmother wept. The neighbours gathered and prayed over her like she was being sent to war — and in a way, she was. But the transition from the slums to the academy was challenging in every sense. She felt out of place among her privileged peers who seemed to have all the answers and knew exactly which buttons to push. They spoke in frameworks and methodologies. They referenced books she\'d never heard of, debates she\'d never witnessed. They moved through the world with a frictionless confidence that made Azura feel like she was walking through water.\n\nYet Azura carried something they didn\'t: the slums had given her a nervous system tuned to survival frequencies. She could read micro-expressions the way her classmates read textbooks. She noticed the professor\'s pause before a lie, the slight dilation of a student\'s pupils when they bluffed through a presentation. She was operating on instinct sharpened by a childhood where missing a signal could cost you everything.\n\nThe problem was that instinct alone wasn\'t enough anymore. Mental Wealth Academy was built on a different premise — that the algorithms reshaping society operated at speeds no human intuition could match. 100GHz versus 100Hz. The machine didn\'t read rooms; it read data — billions of points per second, finding patterns in the noise that no street-smart kid from the slums could ever perceive. Azura\'s gift for reading people was extraordinary, but the world was increasingly being run by systems that didn\'t have faces to read.\n\nJinhikaru — the golden light — is what the old masters called the moment of true seeing. Not the seeing of eyes, but the seeing of understanding. Somewhere between the raw intuition of the slums and the computational power of the new world, Azura would have to find her own frequency. A way of seeing that honoured where she came from without being trapped by it. The golden light wasn\'t in the machine, and it wasn\'t in the streets. It was in the space between — the space where a girl who once counted pavement cracks could learn to count the cracks in reality itself.',
    image: 'https://i.imgur.com/PnMfi0w.jpeg',
  },
  {
    number: 2,
    title: 'Em(pathetic)',
    description:
      'A foretaste of this chapter\'s "Self-Awareness" theme.\n\nEmpathy without boundaries becomes pathetic — a dissolving of self into the emotional currents of others. Azura discovers that her greatest strength, the ability to feel what others feel, is also her greatest vulnerability.\n\nThis section explores the thin line between compassion and codependence, between understanding others and losing yourself in the process. The parenthetical isn\'t an insult — it\'s a warning.',
  },
  {
    number: 3,
    title: "God's Descent",
    description:
      'Examining the routines and beliefs that shape who you are.\n\nEvery morning Azura wakes at 5:17am — not by alarm, but by the rhythm her grandmother installed in her bones. "God descends into the details," her grandmother would say, folding laundry with the precision of a surgeon.\n\nThis section maps the invisible architecture of daily life: the micro-rituals, the unquestioned assumptions, the inherited beliefs that run like background processes. Before you can reprogram yourself, you must first see the code you\'re already running.',
  },
];

export default function Chapters() {
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [drawerSection, setDrawerSection] = useState<SectionContent | null>(null);

  const fetchChapters = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch chapters');
      const data = await response.json();
      setChapters(data.chapters || []);
      setIsAuthenticated(data.authenticated || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const editorialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorialRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      if ((e.target as HTMLElement).closest(`.${styles.drawerPanel}`)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [loading]);

  return (
    <>
      <div className={styles.pageLayout}>
        <SideNavigation />
        <main className={styles.page}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Loading your journey...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{error}</p>
              <button className={styles.retryButton} onClick={fetchChapters} type="button">
                Try Again
              </button>
            </div>
          ) : (
            <div className={`${styles.editorial} ${drawerSection ? styles.editorialLocked : ''}`} ref={editorialRef}>
              {/* Row 1: Header bars */}
              <div className={styles.bookBar}>
                <div className={styles.bookBarText}>
                  <span className={styles.bookBarTitle}>Book</span>
                  <span className={styles.bookBarSub}>The full collection</span>
                </div>
                <button className={styles.bookBarPlus} type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
              </div>
              <div className={styles.storyBar}>
                <div className={styles.storyBarLeft}>
                  <svg className={styles.storyBarIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  <div className={styles.storyBarMeta}>
                    <span className={styles.storyBarName}>Return to God</span>
                    <span className={styles.storyBarAuthor}>by Jhinn Bay</span>
                  </div>
                </div>
                <button className={styles.storyBarPlus} type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
              </div>

              {/* Ethereal Bar — above Chapter 1 sections */}
              <div className={styles.etherealBar}>
                <div className={styles.etherealLine} />
                <span className={styles.etherealText}>The Ethereal Horizon</span>
              </div>

              {/* Row 3: Content */}
              <div className={styles.leftColumn}>
                <div className={styles.leftContent}>
                  <h1 className={styles.storyTitle}>Horizon 01</h1>
                  <p className={styles.storyDescription}>
                    Azura rose from the slums to become a straight-A student at Mental Wealth Academy, driven by a passion for understanding human behavior.
                  </p>
                </div>
                <div
                  className={styles.leftCharacter}
                  style={{ backgroundImage: 'url(https://i.imgur.com/Q77EEnm.png)' }}
                />
              </div>

              {/* Chapter 1 Spine */}
              <div className={styles.spine}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>1</span>
                </div>
                <span className={styles.spineTitle}>Return To God</span>
              </div>

              {/* Chapter 1 — Section 1 (Main) */}
              <article className={styles.sectionMain}>
                <div className={styles.sectionHead}>
                  <span className={styles.sectionNumber}>Section 1</span>
                  <h2 className={styles.sectionMainTitle}>
                    Jinhikaru
                  </h2>
                </div>
                <div className={styles.sectionBodyWrapper}>
                  <div className={styles.sectionBody}>
                    <div
                      className={styles.sectionImage}
                      style={{ backgroundImage: 'url(https://i.imgur.com/PnMfi0w.jpeg)' }}
                    />
                    <div className={styles.sectionText}>
                      <p className={styles.sectionDescription}>
                        Reality runs on 100Hz. The machine runs on 100GHz.
                        Who devours whom?
                      </p>
                    </div>
                  </div>
                  <div className={styles.sectionActions}>
                    <button className={styles.ctaButton} type="button">
                      Collect
                    </button>
                    <button className={styles.ctaButton} onClick={() => setDrawerSection(CHAPTER1_SECTIONS[0])} type="button">
                      Read More
                    </button>
                  </div>
                </div>
              </article>

              {/* Chapter 1 — Section 2 */}
              <article className={styles.sectionSmall}>
                <span className={styles.sectionNumber}>Section 2</span>
                <h3 className={styles.sectionSmallTitle}>Em(pathetic)</h3>
                <p className={styles.sectionSmallDesc}>
                  A foretaste of this chapter&apos;s &ldquo;Self-Awareness&rdquo; theme.
                </p>
                <button className={styles.ctaButtonBordered} onClick={() => setDrawerSection(CHAPTER1_SECTIONS[1])} type="button">
                  Read More
                </button>
              </article>

              {/* Chapter 1 — Section 3 */}
              <article className={styles.sectionSmall}>
                <span className={styles.sectionNumber}>Section 3</span>
                <h3 className={styles.sectionSmallTitle}>God&#39;s Descent</h3>
                <p className={styles.sectionSmallDesc}>
                  Examining the routines and beliefs that shape who you are.
                </p>
                <button className={styles.ctaButtonBordered} onClick={() => setDrawerSection(CHAPTER1_SECTIONS[2])} type="button">
                  Read More
                </button>
              </article>

              {/* Chapter 2 Spine */}
              <div className={`${styles.spine} ${styles.spineCh2}`}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>2</span>
                </div>
                <span className={styles.spineTitle}>Emotional Currents</span>
              </div>

              {/* Ethereal Bar — above Chapter 2 sections */}
              <div className={`${styles.etherealBar} ${styles.etherealBarCh2}`}>
                <div className={styles.etherealLine} />
                <span className={styles.etherealText}>Telepathic Weaponry &amp; Cold War</span>
              </div>

              {/* Chapter 2 — Locked Sections */}
              {[
                { num: 1, title: 'Us vs Them' },
                { num: 2, title: 'Below The Belt' },
                { num: 3, title: 'Horizon Star' },
              ].map((s) => (
                <article key={`ch2-${s.num}`} className={`${styles.lockedSection} ${styles.lockedSectionCh2}`}>
                  <span className={styles.sectionNumber}>Section {s.num}</span>
                  <h3 className={styles.lockedTitle}>{s.title}</h3>
                  <p className={styles.lockedDesc}>
                    Complete Chapter 1 to unlock.
                  </p>
                  <button className={styles.ctaButtonLocked} type="button" disabled>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    Locked
                  </button>
                </article>
              ))}

              {/* Chapter 3 Spine */}
              <div className={`${styles.spine} ${styles.spineCh3}`}>
                <div className={styles.spineChapter}>
                  <span className={styles.spineChLabel}>Ch.</span>
                  <span className={styles.spineChNumber}>3</span>
                </div>
                <span className={styles.spineTitle}>The Big Enemies</span>
              </div>

              {/* Ethereal Bar — above Chapter 3 sections */}
              <div className={`${styles.etherealBar} ${styles.etherealBarCh3}`}>
                <div className={styles.etherealLine} />
                <span className={styles.etherealText}>Shapeshifting Beliefs</span>
              </div>

              {/* Chapter 3 — Locked Sections */}
              {[
                { num: 1, title: 'Walled Gardens' },
                { num: 2, title: 'Echoes of Doubt' },
                { num: 3, title: 'Crimson' },
              ].map((s) => (
                <article key={`ch3-${s.num}`} className={`${styles.lockedSection} ${styles.lockedSectionCh3}`}>
                  <span className={styles.sectionNumber}>Section {s.num}</span>
                  <h3 className={styles.lockedTitle}>{s.title}</h3>
                  <p className={styles.lockedDesc}>
                    Complete Chapter 2 to unlock.
                  </p>
                  <button className={styles.ctaButtonLocked} type="button" disabled>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    Locked
                  </button>
                </article>
              ))}
            </div>
          )}

          {/* Drawer — covers content area */}
          {drawerSection && (
            <div className={styles.drawerPanel}>
              <div className={styles.drawerHeader}>
                <span className={styles.drawerSectionNumber}>Section {drawerSection.number}</span>
                <button className={styles.drawerClose} onClick={() => setDrawerSection(null)} type="button">
                  {'\u2715'}
                </button>
              </div>
              <h2 className={styles.drawerTitle}>{drawerSection.title}</h2>
              {drawerSection.image && (
                <div
                  className={styles.drawerImage}
                  style={{ backgroundImage: `url(${drawerSection.image})` }}
                />
              )}
              <div className={styles.drawerBody}>
                {drawerSection.description.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
