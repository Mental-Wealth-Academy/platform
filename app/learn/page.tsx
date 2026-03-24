'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import styles from './page.module.css';

const Scene = dynamic(() => import('@/components/landing/Scene'), {
  ssr: false,
  loading: () => null,
});

const NAV_ITEMS = [
  {
    label: 'What is Wealth?',
    href: '#wealth',
    subs: [{ label: 'Three pillars', href: '#three-pillars' }],
  },
  {
    label: 'Community DAO',
    href: '#community',
    subs: [{ label: 'Rewards are real', href: '#rewards-are-real' }],
  },
  {
    label: 'Cognitive Benefits',
    href: '#cognitive',
    subs: [
      { label: 'Stress reduction', href: '#stress-reduction' },
      { label: 'Creative activation', href: '#creative-activation' },
      { label: 'Cognitive growth', href: '#cognitive-growth' },
      { label: 'Community amplification', href: '#community-amplification' },
    ],
  },
];

export default function LearnPage() {
  const [showScene, setShowScene] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string>('wealth');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setShowScene(true);
      setTimeout(() => setIsLoaded(true), 100);
    });
  }, []);

  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const ids = [
      'wealth', 'three-pillars',
      'community', 'rewards-are-real',
      'cognitive', 'stress-reduction', 'creative-activation', 'cognitive-growth', 'community-amplification',
    ];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the one closest to the top
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    const cleanup = setupObserver();
    return cleanup;
  }, [setupObserver]);

  return (
    <div className={styles.page}>
      {/* Three.js Background */}
      <div className={styles.canvas}>
        {showScene && (
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        )}
      </div>

      {/* Back to home */}
      <a href="/" className={styles.backLink}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </a>

      {/* Page Layout: Sidenav + Content */}
      <div className={`${styles.pageLayout} ${isLoaded ? styles.contentLoaded : ''}`}>
        {/* Side Navigation */}
        <nav className={styles.sideNav}>
          <ul className={styles.sideNavList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.href} className={styles.sideNavItem}>
                <a
                  href={item.href}
                  className={`${styles.sideNavLink} ${activeId === item.href.slice(1) ? styles.sideNavLinkActive : ''}`}
                >
                  {item.label}
                </a>
                {item.subs.length > 0 && (
                  <ul className={styles.sideNavSubList}>
                    {item.subs.map((sub) => (
                      <li key={sub.href} className={styles.sideNavSubItem}>
                        <a
                          href={sub.href}
                          className={`${styles.sideNavSubLink} ${activeId === sub.href.slice(1) ? styles.sideNavLinkActive : ''}`}
                        >
                          {sub.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <main className={styles.content}>
          <div className={styles.heroSection}>
            <Image
              src="/icons/mwa-logo-horizontal.png"
              alt="Mental Wealth Academy"
              width={180}
              height={65}
              className={styles.logo}
              priority
            />
            <p className={styles.heroTagline}>
              Shared infrastructure for sovereign minds.
            </p>
          </div>

          {/* What is Wealth? */}
          <section id="wealth" className={styles.card}>
            <span className={styles.cardLabel}>Philosophy</span>
            <h2 className={styles.cardTitle}>What is Wealth?</h2>
            <div className={styles.cardBody}>
              <p>
                Wealth isn&apos;t a number in a bank account. It&apos;s the infrastructure around you that gives back.
              </p>
              <p>
                Think of it as an oasis. A place where the water doesn&apos;t just sit there; it circulates. It feeds, it grows, it sustains. That&apos;s what we&apos;re building. <strong>Shared infrastructure</strong> that compounds for everyone inside it, not just the person who showed up first.
              </p>
              <p>
                Most platforms extract value from their users. We flip that. The community <em>is</em> the treasury. Every resource pooled together, every tool made available, every asset managed collectively: that&apos;s the wealth.
              </p>
              <h3 id="three-pillars">Three pillars hold it up:</h3>
              <ul>
                <li><strong>Shared Resources</strong> — research, readings, creative tools, and AI co-pilots accessible to every member. No paywalls on growth.</li>
                <li><strong>Shared Infrastructure</strong> — on-chain governance, transparent funding pods, and community-owned decision-making. The rails are visible. You can inspect them.</li>
                <li><strong>Shared Assets</strong> — a treasury managed by the DAO. Real funds allocated to real ideas through proposals, not backroom deals. Every dollar traceable on Base.</li>
              </ul>
              <p>
                Wealth, the way we see it, is proximity to things that make you sharper, calmer, and more capable. An oasis that replenishes itself because everyone in it is contributing.
              </p>
            </div>
          </section>

          {/* Community DAO */}
          <section id="community" className={styles.card}>
            <span className={styles.cardLabel}>Governance</span>
            <h2 className={styles.cardTitle}>Community DAO</h2>
            <div className={styles.cardBody}>
              <p>
                The DAO isn&apos;t a marketing term we bolted on. It&apos;s how the money actually moves.
              </p>
              <p>
                Three <strong>funding pods</strong> hold the community&apos;s budget: Brand Awareness, Internal Research, and Emergency Individual Support. Each pod has a transparent allocation. You can see what&apos;s been spent, what&apos;s left, and who proposed what.
              </p>
              <p>
                Got an idea that helps people? Submit a proposal. Azura (our AI co-pilot) reviews it for clarity and impact. If it passes her vibe check, it goes to the community for voting. The more you contribute, the fewer approvals you need. That&apos;s earned trust, baked into the mechanism.
              </p>
              <h3 id="rewards-are-real">Rewards are real:</h3>
              <ul>
                <li>Write a blog post, earn points. Onboard a new member, earn more.</li>
                <li>Host a study session, submit a bug report, design a social asset. Each task has a bounty.</li>
                <li>Points convert to Daemon tokens. Tokens give you governance weight.</li>
              </ul>
              <p>
                The pod structure means your contributions don&apos;t vanish into a general fund. They go to specific categories you can track. Shared wealth that&apos;s actually shared, with receipts on-chain.
              </p>
            </div>
          </section>

          {/* Cognitive Benefits */}
          <section id="cognitive" className={styles.card}>
            <span className={styles.cardLabel}>Science</span>
            <h2 className={styles.cardTitle}>Cognitive Benefits</h2>
            <div className={styles.cardBody}>
              <p>
                The 12-week course is built on a simple premise: creative practice rewires your brain. Not metaphorically. Literally.
              </p>
              <p>
                <strong>Brain plasticity</strong> responds to structured creative engagement the way muscle responds to progressive overload. Each week strips back a layer, recovering a core sense of self you probably forgot you had. The science backs this up across 4 measurable dimensions:
              </p>
              <h3 id="stress-reduction">Stress reduction</h3>
              <p>
                &quot;Morning Pages&quot; (the daily journaling practice) function as mindfulness in disguise. 3 pages, stream of consciousness, every morning. Research shows this kind of expressive writing lowers cortisol levels, reduces rumination, and creates psychological distance from anxiety loops. You&apos;re not meditating. You&apos;re dumping the noise onto paper so your brain can stop carrying it.
              </p>
              <h3 id="creative-activation">Creative activation</h3>
              <p>
                &quot;Artist Dates&quot; (solo creative outings, once a week) activate the brain&apos;s reward system. Dopamine and serotonin both spike during novel, self-directed experiences. This isn&apos;t leisure. It&apos;s targeted neurochemical intervention that enhances divergent thinking and reduces anxiety simultaneously.
              </p>
              <h3 id="cognitive-growth">Cognitive growth</h3>
              <p>
                The combination of structured reflection (journaling) and unstructured exploration (artist dates) creates a feedback loop. Your prefrontal cortex gets better at pattern recognition. Your default mode network (the part that handles self-reflection and future planning) becomes more integrated with your executive function.
              </p>
              <p>
                In plain language: you get better at thinking about your own thinking. That&apos;s the real skill.
              </p>
              <h3 id="community-amplification">Community amplification</h3>
              <p>
                Doing this alone works. Doing this inside a cohort with shared accountability, transparent milestones, and on-chain sealing of progress? That&apos;s where the compound effect kicks in. Social learning isn&apos;t a bonus feature. It&apos;s a core mechanism. Your brain literally learns faster when it knows others are on the same path.
              </p>
              <p>
                12 weeks. Sealed on Base. Each milestone a proof-of-work for your own cognitive development.
              </p>
            </div>
          </section>

          {/* CTA */}
          <div className={styles.cta}>
            <a href="/home" className={styles.ctaButton}>
              Enter the Academy
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
