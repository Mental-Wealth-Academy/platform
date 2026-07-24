'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, BookmarkSimple } from '@phosphor-icons/react';
import type { GuideRecord } from '@/lib/guides-db';
import { getWellbeingDomain } from '@/lib/wellbeing-domains';
import { EDUCATION_LEVELS, GUIDE_GOALS, type EducationLevel, type GuideGoal } from '@/lib/guide-discovery-filters';
import { useSound } from '@/hooks/useSound';
import { isBookmarked, toggleBookmark, onBookmarksUpdated } from '@/lib/bookmarks';
import styles from './GuideGallery.module.css';

const NO_SUBJECT = 'General';
const GUIDES_PER_PAGE = 12;

export type GuideFilterState = {
  educationLevels: EducationLevel[];
  goals: GuideGoal[];
};

/** Deterministic 32-bit hash of a string — stable seed per guide. */
function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small seeded PRNG (mulberry32) so each cover renders the same every time. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COVER_W = 300;
const COVER_H = 168;

/**
 * A per-guide "futuristic data overlay": a halftone dot field, a seeded signal
 * trace, concentric sensor rings, HUD registration ticks, and a readout chip —
 * all in brand primary at low opacity over a tinted panel. Deterministic from
 * the guide id, so a topic always wears the same face.
 */
function GuideCoverArt({ seed, label }: { seed: string; label: string }) {
  const art = useMemo(() => {
    const rng = mulberry32(hashSeed(seed));
    const hex = hashSeed(seed).toString(16).toUpperCase().padStart(8, '0').slice(0, 4);
    const numVal = (hashSeed(seed) % 99) + 1;

    const norm = label.toLowerCase();
    let type = 'default';
    let gradId = 'defaultGrad';
    let bgFill = 'url(#defaultGrad)';
    let decorations: React.ReactNode = null;
    let elements: React.ReactNode = null;

    // 1. Acceptance and Reappraisal / Compassion / Shame / Anger / Emotion / Coping
    if (
      norm.includes('acceptance') ||
      norm.includes('reappraisal') ||
      norm.includes('compassion') ||
      norm.includes('shame') ||
      norm.includes('anger') ||
      norm.includes('emotion') ||
      norm.includes('feeling') ||
      norm.includes('love') ||
      norm.includes('coping')
    ) {
      type = 'emotions';
      gradId = 'emotionsGrad';
      bgFill = 'url(#emotionsGrad)';
      decorations = (
        <g opacity="0.6">
          <path d="M 40 45 C 38 42, 33 42, 33 47 C 33 52, 40 58, 40 58 C 40 58, 47 52, 47 47 C 47 42, 42 42, 40 45 Z" fill="#FFA5B5" />
          <path d="M 250 110 C 248 107, 243 107, 243 112 C 243 117, 250 123, 250 123 C 250 123, 257 117, 257 112 C 257 107, 252 107, 250 110 Z" fill="#FFA5B5" transform="scale(0.8) translate(60, 20)" />
        </g>
      );
      elements = (
        <g>
          <circle cx="128" cy="84" r="38" fill="#FFCCD5" stroke="#E59A9A" strokeWidth="2.5" />
          <circle cx="172" cy="84" r="38" fill="#D2F0D2" stroke="#A8D5A8" strokeWidth="2.5" />
          <path d="M 150 72 C 145 65, 134 65, 134 75 C 134 85, 150 97, 150 97 C 150 97, 166 85, 166 75 C 166 65, 155 65, 150 72 Z" fill="#FF8BA7" stroke="#C75C73" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
    // 2. ADHD / Focus / Attention / Rumination / Mindfulness
    else if (
      norm.includes('attention') ||
      norm.includes('focus') ||
      norm.includes('adhd') ||
      norm.includes('rumination') ||
      norm.includes('mindful') ||
      norm.includes('observing')
    ) {
      type = 'focus';
      gradId = 'focusGrad';
      bgFill = 'url(#focusGrad)';
      decorations = (
        <g opacity="0.6">
          <path d="M 50 35 L 53 45 L 63 48 L 53 51 L 50 61 L 47 51 L 37 48 L 47 45 Z" fill="#FBC02D" />
          <path d="M 240 120 L 242 127 L 249 129 L 242 131 L 240 138 L 238 131 L 231 129 L 238 127 Z" fill="#FBC02D" />
        </g>
      );
      elements = (
        <g>
          <path d="M 125 105 L 105 125" stroke="#795548" strokeWidth="6" strokeLinecap="round" />
          <circle cx="145" cy="85" r="24" fill="#FFFFFF" stroke="#4A6572" strokeWidth="3.5" />
          <circle cx="145" cy="85" r="16" fill="#FFFDE7" />
          <path d="M 145 85 L 148 88 L 145 91 L 142 88 Z" fill="#FBC02D" />
          <polygon points="145,85 220,55 220,115" fill="#FFE082" opacity="0.3" />
          <path d="M 210 85 L 213 91 L 220 93 L 213 95 L 210 101 L 207 95 L 200 93 L 207 91 Z" fill="#FBC02D" />
        </g>
      );
    }
    // 3. Brain / Neuroscience / Neuron / Cognitive / Memory / Plasticity
    else if (
      norm.includes('brain') ||
      norm.includes('neuron') ||
      norm.includes('neuro') ||
      norm.includes('cognitive') ||
      norm.includes('memory') ||
      norm.includes('retrieval') ||
      norm.includes('plasticity')
    ) {
      type = 'brain';
      gradId = 'brainGrad';
      bgFill = 'url(#brainGrad)';
      decorations = (
        <g opacity="0.5" stroke="#9575CD" strokeWidth="1.5" strokeDasharray="3 3" fill="none">
          <path d="M 30 50 Q 80 30 130 50" />
          <path d="M 170 120 Q 220 140 270 120" />
          <circle cx="30" cy="50" r="4" fill="#B39DDB" />
          <circle cx="130" cy="50" r="4" fill="#B39DDB" />
        </g>
      );
      elements = (
        <g>
          <g stroke="#FFA726" strokeWidth="2.5" strokeLinecap="round">
            <line x1="150" y1="36" x2="150" y2="28" />
            <line x1="180" y1="65" x2="188" y2="65" />
            <line x1="120" y1="65" x2="112" y2="65" />
            <line x1="171" y1="44" x2="177" y2="38" />
            <line x1="129" y1="44" x2="123" y2="38" />
          </g>
          <path d="M 136 74 C 136 58, 164 58, 164 74 C 164 85, 156 89, 156 96 L 144 96 C 144 89, 136 85, 136 74 Z" fill="#FFF59D" stroke="#EF6C00" strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="144" y="96" width="12" height="6" rx="1.5" fill="#CFD8DC" stroke="#37474F" strokeWidth="2.5" />
        </g>
      );
    }
    // 4. Learning / Study / Practice / Desirable Difficulty / Project Design / Adolescence / Aging
    else if (
      norm.includes('learning') ||
      norm.includes('study') ||
      norm.includes('practice') ||
      norm.includes('difficulty') ||
      norm.includes('feedback') ||
      norm.includes('goals') ||
      norm.includes('project') ||
      norm.includes('adolescence') ||
      norm.includes('aging')
    ) {
      type = 'learning';
      gradId = 'learningGrad';
      bgFill = 'url(#learningGrad)';
      decorations = (
        <g opacity="0.6">
          <path d="M 30 110 L 60 95 L 90 100 L 120 85" fill="none" stroke="#64B5F6" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
        </g>
      );
      elements = (
        <g>
          <rect x="110" y="94" width="80" height="16" rx="2" fill="#81D4FA" stroke="#0288D1" strokeWidth="3" />
          <rect x="110" y="94" width="15" height="16" fill="#4FC3F7" stroke="#0288D1" strokeWidth="3" />
          <rect x="120" y="78" width="60" height="16" rx="2" fill="#AED581" stroke="#558B2F" strokeWidth="3" />
          <rect x="120" y="78" width="12" height="16" fill="#9CCC65" stroke="#558B2F" strokeWidth="3" />
          <path d="M 150 48 L 153 56 L 161 59 L 153 62 L 150 70 L 147 62 L 139 59 L 147 56 Z" fill="#FFE082" />
        </g>
      );
    }
    // 5. Breathing / Sleep / Routine / Daily / Wellness
    else if (
      norm.includes('breathing') ||
      norm.includes('sleep') ||
      norm.includes('daily') ||
      norm.includes('routine') ||
      norm.includes('movement') ||
      norm.includes('body') ||
      norm.includes('wellness') ||
      norm.includes('health') ||
      norm.includes('nutrition') ||
      norm.includes('food')
    ) {
      type = 'wellness';
      gradId = 'wellnessGrad';
      bgFill = 'url(#wellnessGrad)';
      decorations = (
        <g opacity="0.5">
          <path d="M 45 40 Q 60 30 55 45 Q 40 45 45 40 Z" fill="#A5D6A7" />
          <path d="M 255 100 Q 270 90 265 105 Q 250 105 255 100 Z" fill="#A5D6A7" />
        </g>
      );
      elements = (
        <g>
          <circle cx="165" cy="65" r="22" fill="#FFE082" stroke="#F5B041" strokeWidth="3" />
          <path d="M 110 94 Q 120 80 135 84 Q 150 74 168 84 Q 185 80 195 94 Z" fill="#FFFFFF" stroke="#B0BEC5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    }
    // 6. Values / Decision / Algorithmic / Ethics / Judgement / AI
    else if (
      norm.includes('values') ||
      norm.includes('decision') ||
      norm.includes('ethics') ||
      norm.includes('judgment') ||
      norm.includes('judgement') ||
      norm.includes('recommendation') ||
      norm.includes('algorithmic') ||
      norm.includes('science') ||
      norm.includes('ai')
    ) {
      type = 'ethics';
      gradId = 'ethicsGrad';
      bgFill = 'url(#ethicsGrad)';
      decorations = (
        <g opacity="0.6">
          <line x1="50" y1="40" x2="80" y2="60" stroke="#BCAAA4" strokeWidth="2" strokeDasharray="3 3" />
          <circle cx="50" cy="40" r="3" fill="#8D6E63" />
          <circle cx="80" cy="60" r="3" fill="#8D6E63" />
        </g>
      );
      elements = (
        <g>
          <line x1="150" y1="52" x2="150" y2="108" stroke="#795548" strokeWidth="4" strokeLinecap="round" />
          <path d="M 125 108 L 175 108" stroke="#795548" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="116" y1="62" x2="184" y2="62" stroke="#A1887F" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="116" y1="62" x2="110" y2="82" stroke="#A1887F" strokeWidth="1.5" />
          <line x1="116" y1="62" x2="122" y2="82" stroke="#A1887F" strokeWidth="1.5" />
          <path d="M 104 82 Q 116 92 128 82 Z" fill="#FFE082" stroke="#F5B041" strokeWidth="2" />
          <line x1="184" y1="62" x2="178" y2="82" stroke="#A1887F" strokeWidth="1.5" />
          <line x1="184" y1="62" x2="190" y2="82" stroke="#A1887F" strokeWidth="1.5" />
          <path d="M 172 82 Q 184 92 196 82 Z" fill="#FFE082" stroke="#F5B041" strokeWidth="2" />
        </g>
      );
    }
    // Default: Sprout
    else {
      type = 'default';
      gradId = 'defaultGrad';
      bgFill = 'url(#defaultGrad)';
      decorations = (
        <g opacity="0.6">
          <path d="M 30 130 Q 35 110 32 100 Q 28 110 30 130" fill="#81C784" />
          <path d="M 270 130 Q 275 110 272 100 Q 268 110 270 130" fill="#81C784" />
        </g>
      );
      elements = (
        <g>
          <path d="M 136 100 L 140 120 L 160 120 L 164 100 Z" fill="#E0A96D" stroke="#D35400" strokeWidth="3" strokeLinejoin="round" />
          <path d="M 150 100 Q 150 70 146 50" fill="none" stroke="#81C784" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M 148 78 Q 128 68 130 82 Q 142 84 148 78 Z" fill="#A5D6A7" stroke="#4CAF50" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M 149 64 Q 169 54 167 68 Q 155 70 149 64 Z" fill="#A5D6A7" stroke="#4CAF50" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    }

    return { hex, numVal, bgFill, decorations, elements };
  }, [seed, label]);

  return (
    <svg
      className={styles.coverArt}
      viewBox={`0 0 ${COVER_W} ${COVER_H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${label} cover`}
    >
      <defs>
        <linearGradient id="emotionsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF0F2" />
          <stop offset="100%" stopColor="#FFE3E8" />
        </linearGradient>
        <linearGradient id="focusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFCE8" />
          <stop offset="100%" stopColor="#FFF0C4" />
        </linearGradient>
        <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FAF0FF" />
          <stop offset="100%" stopColor="#EAD2FF" />
        </linearGradient>
        <linearGradient id="learningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0F8FF" />
          <stop offset="100%" stopColor="#D6EEFF" />
        </linearGradient>
        <linearGradient id="wellnessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0FFF4" />
          <stop offset="100%" stopColor="#D8FAD8" />
        </linearGradient>
        <linearGradient id="ethicsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCFBF2" />
          <stop offset="100%" stopColor="#F4EFE0" />
        </linearGradient>
        <linearGradient id="defaultGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4FFF8" />
          <stop offset="100%" stopColor="#E0FCEE" />
        </linearGradient>
      </defs>

      {/* Pastel Background */}
      <rect width="100%" height="100%" fill={art.bgFill} />

      {/* Soft cover lines texture */}
      <g stroke="#ffffff" strokeWidth="0.8" opacity="0.3">
        <line x1="0" y1="20" x2="300" y2="20" />
        <line x1="0" y1="40" x2="300" y2="40" />
        <line x1="0" y1="60" x2="300" y2="60" />
        <line x1="0" y1="80" x2="300" y2="80" />
        <line x1="0" y1="100" x2="300" y2="100" />
        <line x1="0" y1="120" x2="300" y2="120" />
        <line x1="0" y1="140" x2="300" y2="140" />
      </g>

      {/* Dynamic Decorations */}
      {art.decorations}

      {/* Centerpiece Vector Illustration */}
      {art.elements}

      {/* Frame Border */}
      <rect x="6" y="6" width={COVER_W - 12} height={COVER_H - 12} fill="none" stroke="#795548" strokeWidth="2.5" rx="8" opacity="0.35" />

      {/* Page number marker */}
      <text
        className={styles.coverReadout}
        x={16}
        y={COVER_H - 16}
        style={{ fill: '#795548', opacity: 0.7, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
      >
        No. {art.numVal}
      </text>
    </svg>
  );
}

export function GuideGalleryCard({ guide }: { guide: GuideRecord }) {
  const { play } = useSound();
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(guide.slug));
    return onBookmarksUpdated(() => {
      setBookmarked(isBookmarked(guide.slug));
    });
  }, [guide.slug]);

  const primarySubject = guide.subjects[0] ?? NO_SUBJECT;
  const domain = getWellbeingDomain(primarySubject);
  const meta = domain?.label ?? primarySubject;

  return (
    <Link
      href={`/learn/guides/${guide.slug}`}
      className={styles.card}
      onMouseEnter={() => play('soft-hover')}
    >
      <div className={styles.cover}>
        <GuideCoverArt seed={guide.id} label={guide.topicTitle} />
        <span className={styles.coverTag}>{meta}</span>
        <button
          type="button"
          className={styles.bookmarkBtn}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            play('click');
            toggleBookmark(guide.slug);
          }}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark guide"}
        >
          <BookmarkSimple size={18} weight={bookmarked ? "fill" : "regular"} />
        </button>
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{guide.topicTitle}</span>
        {guide.summary && <span className={styles.cardSummary}>{guide.summary}</span>}
      </div>
    </Link>
  );
}

export default function GuideGallery({ guides, filters }: { guides: GuideRecord[]; filters: GuideFilterState }) {
  const [page, setPage] = useState(1);

  const visibleGuides = useMemo(() => {
    return guides.filter((guide) =>
      (filters.educationLevels.length === 0 || filters.educationLevels.some((level) => guide.educationLevels.includes(level)))
      && (filters.goals.length === 0 || filters.goals.some((goal) => guide.goals.includes(goal))),
    );
  }, [guides, filters]);

  const pageCount = Math.ceil(visibleGuides.length / GUIDES_PER_PAGE);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const pageStart = (currentPage - 1) * GUIDES_PER_PAGE;
  const pageGuides = visibleGuides.slice(pageStart, pageStart + GUIDES_PER_PAGE);
  const leadingPages = Array.from({ length: Math.min(3, pageCount) }, (_, index) => index + 1);

  useEffect(() => {
    setPage(1);
  }, [filters.educationLevels, filters.goals]);

  if (guides.length === 0) return null;

  return (
    <div className={styles.gallery}>
      <div className={styles.results}>
        <div className={styles.grid}>
          {pageGuides.map((guide) => (
            <GuideGalleryCard key={guide.id} guide={guide} />
          ))}
        </div>
        {visibleGuides.length === 0 && <p className={styles.empty}>No guides match these filters yet.</p>}
        {pageCount > 1 && (
          <nav className={styles.pagination} aria-label="Guide pages">
            <button type="button" className={styles.paginationButton} onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}>
              Previous
            </button>
            <div className={styles.paginationPages}>
              {leadingPages.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  className={`${styles.paginationPageButton} ${pageNumber === currentPage ? styles.paginationPageButtonActive : ''}`}
                  onClick={() => setPage(pageNumber)}
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                >
                  {pageNumber}
                </button>
              ))}
              {pageCount > 4 && <span className={styles.paginationEllipsis} aria-hidden="true">…</span>}
              {pageCount > 3 && (
                <button
                  type="button"
                  className={`${styles.paginationPageButton} ${pageCount === currentPage ? styles.paginationPageButtonActive : ''}`}
                  onClick={() => setPage(pageCount)}
                  aria-current={pageCount === currentPage ? 'page' : undefined}
                >
                  {pageCount}
                </button>
              )}
            </div>
            <button type="button" className={styles.paginationButton} onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount}>
              Next
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

export function GuideFilterSidebar({ filters, onChange }: {
  filters: GuideFilterState;
  onChange: (filters: GuideFilterState) => void;
}) {
  return (
    <div className={styles.filters} aria-label="Guide filters">
      <FilterGroup
        label="Education level"
        options={EDUCATION_LEVELS}
        selected={filters.educationLevels}
        onChange={(educationLevels) => onChange({ ...filters, educationLevels })}
      />
      <FilterGroup
        label="Goals"
        options={GUIDE_GOALS}
        selected={filters.goals}
        onChange={(goals) => onChange({ ...filters, goals })}
      />
    </div>
  );
}

function FilterGroup<T extends string>({ label, options, selected, onChange }: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const { play } = useSound();
  const toggle = (value: T) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
    play('soft-hover');
  };
  return (
    <section className={styles.filterGroup}>
      <h2 className={styles.filterTitle}>{label}</h2>
      <button type="button" className={styles.filterOption} onClick={() => onChange([])} aria-pressed={selected.length === 0}>
        <span className={`${styles.checkmark} ${selected.length === 0 ? styles.checkmarkSelected : ''}`}>{selected.length === 0 && <Check size={13} weight="bold" />}</span>
        All
      </button>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button key={option} type="button" className={styles.filterOption} onClick={() => toggle(option)} aria-pressed={active}>
            <span className={`${styles.checkmark} ${active ? styles.checkmarkSelected : ''}`}>{active && <Check size={13} weight="bold" />}</span>
            {option}
          </button>
        );
      })}
    </section>
  );
}
