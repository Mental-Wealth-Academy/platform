import styles from './loading.module.css';

/**
 * Article-shaped placeholder for a DAG guide (/learn/guides/[slug] and
 * /home/guides/[slug]). Rendered by the route-level loading.tsx and again by
 * the page itself while it fetches, so the panel is never an empty frame.
 */
export function GuideArticleSkeleton() {
  return (
    <div className={styles.page} aria-hidden="true">
      <div className={styles.headerMeta}>
        <span className={`${styles.skeleton} ${styles.backBtn}`} />
        <span className={`${styles.skeleton} ${styles.chip}`} />
        <span className={`${styles.skeleton} ${styles.chip}`} />
      </div>

      <span className={`${styles.skeleton} ${styles.title}`} />
      <span className={`${styles.skeleton} ${styles.subtitle}`} />

      <div className={styles.divider} />

      <div className={styles.paragraph}>
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '100%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '94%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '78%' }} />
      </div>

      <span className={`${styles.skeleton} ${styles.sectionHeading}`} />
      <div className={styles.paragraph}>
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '100%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '96%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '91%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '65%' }} />
      </div>

      <span className={`${styles.skeleton} ${styles.sectionHeading}`} />
      <div className={styles.paragraph}>
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '98%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '92%' }} />
        <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '70%' }} />
      </div>
    </div>
  );
}

/** Placeholder for the guide details rail that sits beside the article. */
export function GuideDetailsSkeleton() {
  return (
    <aside className={styles.guideDetails} aria-hidden="true">
      <span className={`${styles.skeleton} ${styles.detailsTitle}`} />
      <div className={styles.detailsList}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.detailCard}>
            <span className={`${styles.skeleton} ${styles.detailIcon}`} />
            <div className={styles.detailText}>
              <span className={`${styles.skeleton} ${styles.detailVal}`} />
              <span className={`${styles.skeleton} ${styles.detailLabel}`} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
