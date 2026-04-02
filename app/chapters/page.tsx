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
    title: 'First Light',
    description:
      'The helmet boots thirty seconds before the gates open. Blue feels it lock behind her ears ✧ a faint hum settling into the bone, calibration pulse tapping twice at her left temple. Fresh unit. Factory smell still in the padding. The Academy sent it wrapped in tissue paper like a gift. Where she comes from, gifts have conditions.\n\nShe steps through the main entrance and the overlay floods in.\n\nNames. Distances. Heart rates rendered as pale filaments trailing off shoulders. A boy to her left registers THREAT LEVEL 0.3 in amber text floating just above his collar. He looks nothing like the trolls from the underworld. Soft hands, pressed collar, the kind of jaw that\'s never been reset. The helmet doesn\'t know what she knows. It reads data. She reads rooms.\n\nThe courtyard is wider than any space she\'s moved through without watching her back. White stone, trimmed hedges, a fountain that runs clean water for decoration. Her feet want to hug the wall. Old habit. In the corridors she grew up in, the centre of any open space was where you got caught. Here the centre is where people gather ✧ clusters of students greeting each other with the loose confidence of people who have never had to memorise an exit route.\n\nA girl in a pressed blazer glances at Blue, then away. Not hostile. Worse ✧ categorising. The helmet catches it too, throws an EMOTIONAL FREQUENCY readout: 72Hz baseline, spike to 91Hz on eye contact, rapid decay. Curiosity, not threat. But the overlay lingers a beat too long, and for a half-second it stamps the same readout onto the boy behind her ✧ a ghost pattern, the helmet echoing data onto the wrong face.\n\nBlue blinks hard. The ghost clears.\n\nShe catalogues the glitch the way she catalogues everything: silently, precisely, filed under things that might kill you later. The helmet is supposed to be her edge here ✧ the thing that closes the gap between where she started and where the Academy expects her to operate. If it\'s already misfiring on day one, she needs to know the pattern of the misfire. Every tool has a failure mode. The trick is learning it before the tool learns you.\n\nThe orientation hall is three floors of glass and suspended walkways. She finds a seat near the back, one row from the wall ✧ close enough to leave fast, far enough to not look like she\'s hiding. The students around her settle in with the easy noise of people resuming interrupted conversations. They know each other already. Summer programmes, family connections, prep schools that feed directly into the Academy pipeline. She picks up fragments without trying.\n\n"...my father said the new cohort has twelve sponsored seats this year..."\n\nSponsored. The word lands soft but she hears what it carries. She is one of the twelve. The helmet flickers ✧ a translucent overlay ghosts across three students in the row ahead, painting them with data tags that haven\'t loaded yet. Empty brackets. Null values. Predictive frames for people the system hasn\'t profiled. For one disorienting second she sees the room the way the helmet wants her to see it: a field of variables, scored and ranked, everyone reduced to signal.\n\nThen the overlay collapses and they\'re just people again. Talking. Laughing. Not watching her.\n\nShe exhales. Adjusts the helmet\'s fit with two fingers behind her right ear.\n\nThe dean takes the stage. Blue doesn\'t listen to the words ✧ she watches the audience. Tracks who leans forward and who leans back. Notes the three students checking devices under their desks, the one girl in the front row whose posture is so perfect it has to be compensating for something. The helmet offers its own annotations: attention scores, micro-expression tags, a sentiment graph that scrolls across the bottom of her vision like a stock ticker.\n\nMost of it is noise. But occasionally it catches something she missed ✧ a cortisol spike in a student two rows ahead, invisible to the naked eye, blooming red in the overlay. And sometimes it invents things entirely ✧ painting a pattern ghost of someone walking across the aisle who isn\'t there, a hallucination rendered in the same clinical sans-serif as the real data. She can\'t always tell which is which. Not yet.\n\nThis is the gap. Not the one between her postcode and theirs ✧ she\'d mapped that distance long before she arrived. The real gap is between what she can read with her body and what the helmet claims to read with its sensors. Somewhere in the space between those two frequencies is where the Academy expects her to operate. Human intuition sharpened by machine perception. The curriculum calls it "augmented cognition." Blue calls it learning to trust a tool that lies to you in the same voice it uses to tell the truth.\n\nThe dean finishes. Applause. The overlay tags it: 73dB, 4.2 seconds, sentiment positive.\n\nBlue stands with the crowd. Keeps her face neutral. Walks toward the exit at the pace of everyone else ✧ not faster, not slower. Matching rhythm is a skill she learned young. You move like the environment moves. You breathe like the room breathes. You become invisible not by hiding but by belonging so precisely that no one thinks to look twice.\n\nOutside, the sun hits the courtyard stone and the helmet auto-adjusts, dimming the overlay to a whisper. For a moment she sees the Academy as it actually is ✧ just light on white stone, just water in a fountain, just people crossing a quad. No data. No scores. No ghost patterns.\n\nThen the calibration pulse taps her temple again, and the world fills back in with information.\n\nFirst day. First light. She has a lot to learn about what\'s real.',
    image: 'https://i.imgur.com/PnMfi0w.jpeg',
  },
  {
    number: 2,
    title: 'Em(pathetic)',
    description:
      'A foretaste of this chapter\'s "Self-Awareness" theme.\n\nEmpathy without boundaries becomes pathetic — a dissolving of self into the emotional currents of others. Blue discovers that her greatest strength, the ability to feel what others feel, is also her greatest vulnerability.\n\nThis section explores the thin line between compassion and codependence, between understanding others and losing yourself in the process. The parenthetical isn\'t an insult — it\'s a warning.',
  },
  {
    number: 3,
    title: "God's Descent",
    description:
      'Examining the routines and beliefs that shape who you are.\n\nEvery morning Blue wakes at 5:17am — not by alarm, but by the rhythm her grandmother installed in her bones. "God descends into the details," her grandmother would say, folding laundry with the precision of a surgeon.\n\nThis section maps the invisible architecture of daily life: the micro-rituals, the unquestioned assumptions, the inherited beliefs that run like background processes. Before you can reprogram yourself, you must first see the code you\'re already running.',
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
                    Blue rose from the slums to become a straight-A student at Mental Wealth Academy, driven by a passion for understanding human behavior.
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
                    First Light
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
                        The helmet boots thirty seconds before the gates open.
                        Blue feels it lock behind her ears.
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
