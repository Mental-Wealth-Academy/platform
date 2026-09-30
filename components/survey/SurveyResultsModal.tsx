'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle, ShieldCheck, Sparkle, ArrowRight, X } from '@phosphor-icons/react';
import CtaButton from '@/components/shared/CtaButton';
import type { SurveyResults } from './types';
import { resolveArchetype, type ArchetypeProfile } from './archetypeData';
import styles from './SurveyResultsModal.module.css';

interface SurveyResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: SurveyResults | null;
  variant?: 'modal' | 'inline';
  onOpenMint?: () => void;
  mintInfo?: { username: string; walletAddress: string; profileType: string } | null;
}

function CircularGauge({
  score,
  label,
  desc,
}: {
  score: number;
  label: string;
  desc?: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(score, 100)) / 100;

  return (
    <div className={styles.gaugeCard}>
      <div className={styles.gaugeSvgWrapper}>
        <svg viewBox="0 0 88 88" className={styles.gaugeSvg}>
          <circle cx="44" cy="44" r={radius} className={styles.gaugeTrack} />
          <circle
            cx="44"
            cy="44"
            r={radius}
            className={styles.gaugeFill}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
          <text x="44" y="49" textAnchor="middle" className={styles.gaugeScoreText}>
            {Math.round(score)}%
          </text>
        </svg>
      </div>
      <span className={styles.gaugeLabel}>{label}</span>
      {desc && <span className={styles.gaugeDesc}>{desc}</span>}
    </div>
  );
}

export default function SurveyResultsModal({
  isOpen,
  onClose,
  results,
  variant = 'modal',
  onOpenMint,
  mintInfo,
}: SurveyResultsModalProps) {
  const [showContent, setShowContent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && results) {
      const timer = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen, results]);

  useEffect(() => {
    if (variant !== 'modal') return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, variant]);

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setShowContent(false);
      setTimeout(() => onClose(), 200);
    },
    [onClose],
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  const archetype: ArchetypeProfile = useMemo(() => {
    if (!results) {
      return resolveArchetype({
        surveyId: 'default',
        surveyTitle: 'Assessment',
        personalizedTitle: 'Scholar',
        answers: {},
        analysis: '',
        insights: [],
        timestamp: new Date().toISOString(),
      });
    }
    return resolveArchetype(results);
  }, [results]);

  if (!isOpen || !results || !mounted) return null;

  const panelContent = (
    <div
      className={`${styles.resultsContainer} ${showContent ? styles.resultsContainerVisible : ''} ${variant === 'inline' ? styles.resultsContainerInline : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sticky / Top Navigation Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerEyebrow}>Report verified</span>
          <span className={styles.headerTitle}>{results.surveyTitle}</span>
        </div>
        <button
          onClick={(e) => handleClose(e)}
          className={styles.closeBtn}
          aria-label="Close report"
          type="button"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      {/* Main Scrollable Report Surface */}
      <div className={styles.scrollBody} ref={scrollContainerRef}>
        {/* Page Heading matching Images 1, 2, 4, 5 */}
        <div className={styles.pageTitleSection}>
          <h2 className={styles.pageMainHeading}>
            Your Archetype <span className={styles.accentWord}>Full Report</span> Is Ready
          </h2>
        </div>

        {/* ── Signature Archetype Card with Grok-Bot Character ── */}
        <div className={styles.archetypeCard}>
          <div className={styles.archetypeCardInner}>
            <div className={styles.archetypeInfo}>
              <span className={styles.archetypeEyebrow}>Personality Archetype</span>
              <h3 className={styles.archetypeTitle}>{archetype.title}</h3>
              <span className={styles.archetypeSubtitle}>{archetype.subtitle}</span>
              <p className={styles.archetypeAlias}>{archetype.alias}</p>
            </div>

            {/* Circular coordinate radar frame with character image */}
            <div className={styles.archetypeVisualFrame}>
              <svg viewBox="0 0 160 160" className={styles.coordRingSvg} aria-hidden="true">
                <circle cx="80" cy="80" r="74" className={styles.coordRingOuter} />
                <circle cx="80" cy="80" r="54" className={styles.coordRingMid} />
                <circle cx="80" cy="80" r="34" className={styles.coordRingInner} />
                <line x1="80" y1="6" x2="80" y2="154" className={styles.coordAxis} />
                <line x1="6" y1="80" x2="154" y2="80" className={styles.coordAxis} />
              </svg>
              <Image
                src={archetype.imageSrc}
                alt={archetype.title}
                width={130}
                height={130}
                className={styles.archetypeAvatarImg}
                priority
              />
            </div>
          </div>

          {/* Embedded Highlight Callout Box inside Card */}
          <div className={styles.archetypeBanner}>
            <span className={styles.archetypeBannerEyebrow}>{archetype.rarity}</span>
            <button
              type="button"
              className={styles.archetypeBannerBtn}
              onClick={() => {
                const el = document.getElementById('report-modules');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Explore Full Report
            </button>
          </div>
        </div>

        {/* ── Social Proof / Milestone Counter Bar ── */}
        <div className={styles.counterSection}>
          <h4 className={styles.counterHeading}>Uncover Your Archetype Report</h4>
          <div className={styles.counterRow}>
            <span className={styles.counterLabel}>Over</span>
            <div className={styles.ticketCounter} aria-label="14,829 reports completed">
              <span className={styles.ticketDigit}>1</span>
              <span className={styles.ticketDigit}>4</span>
              <span className={styles.ticketDigit}>8</span>
              <span className={styles.ticketDigit}>2</span>
              <span className={styles.ticketDigit}>9</span>
            </div>
            <span className={styles.counterLabel}>reports analyzed</span>
          </div>

          <div className={styles.milestoneBadge}>
            <Image src="/icons/ui-diamond.svg" alt="" width={14} height={14} />
            <span>+100 diamonds awarded · Saved to Academy profile</span>
          </div>
        </div>

        <div id="report-modules" className={styles.modulesWrapper}>
          {/* ── 1. Archetype Traits ── */}
          <section className={styles.moduleSection}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleNum}>1</span>
              <h4 className={styles.moduleTitle}>Archetype traits</h4>
            </div>

            <div className={styles.moduleCard}>
              <p className={styles.analysisNarrative}>
                {results.analysis || archetype.summary}
              </p>

              {/* Trait Pills */}
              <div className={styles.traitsList}>
                {archetype.traits.map((trait) => (
                  <span key={trait} className={styles.traitPill}>
                    <Sparkle size={12} weight="fill" className={styles.traitPillIcon} />
                    {trait}
                  </span>
                ))}
              </div>

              {/* Insights */}
              {results.insights && results.insights.length > 0 && (
                <div className={styles.insightsList}>
                  {results.insights.map((insight, idx) => (
                    <div key={idx} className={styles.insightItem}>
                      <CheckCircle size={15} weight="fill" className={styles.insightCheck} />
                      <span className={styles.insightText}>{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── 2. Your Inner Strength (2x2 Circular Gauges) ── */}
          <section className={styles.moduleSection}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleNum}>2</span>
              <h4 className={styles.moduleTitle}>Your inner strength</h4>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.gaugesGrid}>
                {archetype.innerStrengths.map((strength) => (
                  <CircularGauge
                    key={strength.label}
                    score={strength.score}
                    label={strength.label}
                    desc={strength.desc}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── 3. Routine and Habits / Relational Dynamics (2x2 Circular Gauges) ── */}
          <section className={styles.moduleSection}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleNum}>3</span>
              <h4 className={styles.moduleTitle}>Routine and habits</h4>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.gaugesGrid}>
                {archetype.relationalHabits.map((habit) => (
                  <CircularGauge
                    key={habit.label}
                    score={habit.score}
                    label={habit.label}
                    desc={habit.desc}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── 4. Growth Edges & Academy Action ── */}
          <section className={styles.moduleSection}>
            <div className={styles.moduleHeader}>
              <span className={styles.moduleNum}>4</span>
              <h4 className={styles.moduleTitle}>Growth edges & next steps</h4>
            </div>

            <div className={styles.moduleCard}>
              <div className={styles.adviceList}>
                {archetype.growthAdvice.map((advice, idx) => (
                  <div key={idx} className={styles.adviceItem}>
                    <span className={styles.adviceBullet}>{idx + 1}</span>
                    <span className={styles.adviceText}>{advice}</span>
                  </div>
                ))}
              </div>

              {/* Recommended Academy Guide */}
              {archetype.recommendedGuideSlug && (
                <div className={styles.recommendedGuideBox}>
                  <div className={styles.recommendedGuideHeader}>
                    <span className={styles.recommendedEyebrow}>Recommended academy guide</span>
                    <span className={styles.recommendedTitle}>{archetype.recommendedGuideTitle}</span>
                  </div>
                  <Link
                    href={`/learn/guides/${archetype.recommendedGuideSlug}`}
                    className={styles.recommendedCta}
                    onClick={() => handleClose()}
                  >
                    <span>Start guide</span>
                    <ArrowRight size={14} weight="bold" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* ── Certificate Mint Card (if Attachment Style or onOpenMint provided) ── */}
          {(onOpenMint || (mintInfo && results.surveyId === 'attachment-style')) && (
            <section className={styles.moduleSection}>
              <div className={styles.mintBannerCard}>
                <div className={styles.mintBannerIcon}>
                  <ShieldCheck size={28} weight="fill" />
                </div>
                <div className={styles.mintBannerText}>
                  <h4 className={styles.mintBannerTitle}>Mint verified onchain certificate</h4>
                  <p className={styles.mintBannerDesc}>
                    Permanent soulbound credential on Base verifying your {archetype.title} assessment read.
                  </p>
                </div>
                {onOpenMint && (
                  <CtaButton
                    variant="primary"
                    size="sm"
                    onClick={onOpenMint}
                    className={styles.mintBannerBtn}
                  >
                    Mint certificate
                  </CtaButton>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Sticky Bottom Dock on Mobile */}
      <div className={styles.footerDock}>
        <CtaButton
          variant="primary"
          size="md"
          block
          onClick={(e) => handleClose(e)}
          className={styles.footerCta}
        >
          Done · Return to Academy
        </CtaButton>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return <div className={styles.inlineShell}>{panelContent}</div>;
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {panelContent}
    </div>,
    document.body,
  );
}
