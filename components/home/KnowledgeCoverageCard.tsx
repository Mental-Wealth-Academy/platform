'use client';

import React, { useMemo } from 'react';
import styles from './KnowledgeCoverageCard.module.css';

export interface SubjectCoverage {
  subject: string;
  total: number;
  completed: number;
}

interface KnowledgeCoverageCardProps {
  className?: string;
  titleClassName?: string;
  authenticated: boolean;
  stats: {
    totalGuides: number;
    completedGuides: number;
    subjects: SubjectCoverage[];
  } | null;
}

/** Rows shown before the tail is folded into a "+n more" line. */
const VISIBLE_ROWS = 5;

/**
 * Coverage of the published guide library, one meter per subject: how much of
 * each subject you have finished against how much of it exists. One hue, one
 * series, values direct-labelled at the bar end.
 */
export default function KnowledgeCoverageCard({
  className,
  titleClassName,
  authenticated,
  stats,
}: KnowledgeCoverageCardProps) {
  const ranked = useMemo(() => {
    if (!stats) return [];
    return [...stats.subjects]
      .filter((s) => s.total > 0)
      .sort((a, b) => {
        const ratio = b.completed / b.total - a.completed / a.total;
        if (ratio !== 0) return ratio;
        return b.total - a.total;
      });
  }, [stats]);

  const rows = ranked.slice(0, VISIBLE_ROWS);
  const remainder = ranked.length - rows.length;
  const hasData = Boolean(stats) && ranked.length > 0;

  return (
    <article className={className} aria-labelledby="knowledge-coverage-title">
      <h2 id="knowledge-coverage-title" className={titleClassName}>
        Knowledge coverage
      </h2>

      {hasData && stats ? (
        <>
          <p className={styles.summary}>
            <span className={styles.summaryValue}>{stats.completedGuides}</span>
            <span className={styles.summaryLabel}>
              of {stats.totalGuides} guide{stats.totalGuides === 1 ? '' : 's'} complete
            </span>
          </p>

          <ul className={styles.rows}>
            {rows.map((row) => {
              const pct = Math.min(100, (row.completed / row.total) * 100);
              return (
                <li
                  key={row.subject}
                  className={styles.row}
                  title={`${row.subject}: ${row.completed} of ${row.total} guides complete`}
                >
                  <span className={styles.rowLabel}>{row.subject}</span>
                  <span className={styles.track} aria-hidden="true">
                    <span
                      className={styles.fill}
                      style={{ width: `${pct}%`, minWidth: row.completed > 0 ? 5 : 0 }}
                    />
                  </span>
                  <span className={styles.rowValue}>
                    {row.completed}
                    <span className={styles.rowValueTotal}>/{row.total}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className={styles.footnote}>
            {remainder > 0
              ? `Sorted by coverage · ${remainder} more subject${remainder === 1 ? '' : 's'} in the library`
              : 'Sorted by coverage'}
          </p>
        </>
      ) : (
        <p className={styles.empty}>
          {authenticated
            ? 'No guides finished yet. Coverage appears here as you complete them, subject by subject.'
            : 'Sign in and finish a guide. Your coverage of the library will be charted here.'}
        </p>
      )}
    </article>
  );
}
