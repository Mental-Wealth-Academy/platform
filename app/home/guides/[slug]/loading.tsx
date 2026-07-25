import styles from './loading.module.css';

/**
 * Skeleton loader for the DAG guide article page (/learn/guides/[slug] and
 * /home/guides/[slug]). Traces the guide article layout: header, linetitled
 * article body, lede paragraph, ruled section headings, and the guide details
 * sidebar.
 */
export default function GuideLoading() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading guide">
      <main className={styles.guideLayout}>
        <div className={styles.page} aria-hidden="true">
          {/* Back link & Category Chip */}
          <div className={styles.headerMeta}>
            <span className={`${styles.skeleton} ${styles.backBtn}`} />
            <span className={`${styles.skeleton} ${styles.chip}`} />
            <span className={`${styles.skeleton} ${styles.chip}`} />
          </div>

          {/* Title & Subtitle */}
          <span className={`${styles.skeleton} ${styles.title}`} />
          <span className={`${styles.skeleton} ${styles.subtitle}`} />

          {/* Article Divider */}
          <div className={styles.divider} />

          {/* Lede / Intro Paragraph */}
          <div className={styles.paragraph}>
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '100%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '94%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '78%' }} />
          </div>

          {/* Section 1 */}
          <span className={`${styles.skeleton} ${styles.sectionHeading}`} />
          <div className={styles.paragraph}>
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '100%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '96%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '91%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '65%' }} />
          </div>

          {/* Section 2 */}
          <span className={`${styles.skeleton} ${styles.sectionHeading}`} />
          <div className={styles.paragraph}>
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '98%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '92%' }} />
            <span className={`${styles.skeleton} ${styles.line}`} style={{ width: '70%' }} />
          </div>
        </div>

        {/* Guide Details Sidebar */}
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
      </main>
    </div>
  );
}
