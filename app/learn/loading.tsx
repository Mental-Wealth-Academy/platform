import styles from './loading.module.css';

const featuredCards = Array.from({ length: 6 }, (_, index) => index);
const guideRows = Array.from({ length: 6 }, (_, index) => index);
const rowTitleWidths = ['46%', '38%', '52%', '34%', '44%', '40%'];

/**
 * Skeleton for the /learn guide library. Unlike /home (folders + course
 * grid), this traces the guides view: the floating list/cards/3d toggle,
 * progress card, popular-topics grid, knowledge map banner, and the
 * all-guides list.
 */
export default function LearnLoading() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading guides">
      <main className={styles.pageColumns}>
        <div className={styles.globalPanel} aria-hidden="true">
          <div className={styles.panelHeader}>
            <span className={`${styles.skeleton} ${styles.headerMark}`} />
            <span className={`${styles.skeleton} ${styles.headerTitle}`} />
          </div>
          <div className={styles.guidePanel}>
          <div className={styles.viewToggle}>
            <span className={`${styles.skeleton} ${styles.toggleBtn} ${styles.toggleBtnActive}`} />
            <span className={`${styles.skeleton} ${styles.toggleBtn}`} />
            <span className={`${styles.skeleton} ${styles.toggleBtn}`} />
          </div>

          <div className={styles.content}>
            <div className={styles.progressCard}>
              <div className={styles.progressStats}>
                <div className={styles.progressStat}>
                  <span className={`${styles.skeleton} ${styles.progressNum}`} />
                  <span className={`${styles.skeleton} ${styles.progressLabel}`} />
                </div>
                <div className={styles.progressStat}>
                  <span className={`${styles.skeleton} ${styles.progressNum}`} />
                  <span className={`${styles.skeleton} ${styles.progressLabel}`} />
                </div>
              </div>
              <div className={styles.progressTrack}>
                <span className={styles.progressFill} />
              </div>
            </div>

            <div className={styles.subjectLabel}>
              <span className={`${styles.skeleton} ${styles.subjectLabelBar}`} />
            </div>

            <div className={styles.featuredGrid}>
              {featuredCards.map((index) => (
                <div className={styles.featuredCard} key={index}>
                  <span className={`${styles.skeleton} ${styles.featuredTitle}`} />
                  <span className={`${styles.skeleton} ${styles.featuredSummary}`} />
                </div>
              ))}
            </div>

            <div className={styles.subjectLabel}>
              <span className={`${styles.skeleton} ${styles.subjectLabelBar}`} />
            </div>

            <div className={styles.treeCard}>
              <span className={`${styles.skeleton} ${styles.treeCardLabel}`} />
            </div>

            <div className={styles.guideList}>
              {guideRows.map((index) => (
                <div className={styles.guideRow} key={index}>
                  <span className={`${styles.skeleton} ${styles.guideRowDot}`} />
                  <span
                    className={`${styles.skeleton} ${styles.guideRowTitle}`}
                    style={{ width: rowTitleWidths[index] }}
                  />
                  <span className={`${styles.skeleton} ${styles.guideRowMeta}`} />
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
