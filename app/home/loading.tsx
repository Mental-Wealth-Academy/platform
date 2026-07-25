import styles from './loading.module.css';

const folderSkeletons = Array.from({ length: 4 }, (_, index) => index);
const courseSkeletons = Array.from({ length: 3 }, (_, index) => index);

export default function HomeLoading() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label="Loading home">
      <main className={styles.pageColumns}>
        <div className={styles.globalPanel}>
          <div className={styles.panelHeader}>
            <span className={`${styles.skeleton} ${styles.headerMark}`} />
            <span className={`${styles.skeleton} ${styles.headerTitle}`} />
          </div>

          <section className={styles.dashboardHeader} aria-hidden="true">
            <div className={styles.profileCard}>
              <span className={`${styles.skeleton} ${styles.avatar}`} />
              <div className={styles.profileCopy}>
                <span className={`${styles.skeleton} ${styles.profileTitle}`} />
                <span className={`${styles.skeleton} ${styles.profileDetail}`} />
              </div>
            </div>
            <div className={styles.indicators}>
              {Array.from({ length: 3 }, (_, index) => (
                <div className={styles.indicator} key={index}>
                  <span className={`${styles.skeleton} ${styles.indicatorLabel}`} />
                  <span className={`${styles.skeleton} ${styles.indicatorValue}`} />
                </div>
              ))}
            </div>
            <div className={styles.notes}>
              <span className={`${styles.skeleton} ${styles.note}`} />
              <span className={`${styles.skeleton} ${styles.note}`} />
            </div>
          </section>

          <section className={styles.folderSection} aria-hidden="true">
            <div className={styles.tabs}>
              <span className={`${styles.skeleton} ${styles.tabActive}`} />
              <span className={`${styles.skeleton} ${styles.tab}`} />
              <span className={`${styles.skeleton} ${styles.tab}`} />
            </div>
            <div className={styles.folderRow}>
              {folderSkeletons.map((index) => (
                <div className={styles.folder} key={index}>
                  <span className={`${styles.skeleton} ${styles.folderImage}`} />
                  <span className={`${styles.skeleton} ${styles.folderTitle}`} />
                  <span className={`${styles.skeleton} ${styles.folderDetail}`} />
                </div>
              ))}
            </div>
          </section>

          <section className={styles.courseGrid} aria-hidden="true">
            {courseSkeletons.map((index) => (
              <div className={styles.courseCard} key={index}>
                <span className={`${styles.skeleton} ${styles.courseImage}`} />
                <div className={styles.courseBody}>
                  <span className={`${styles.skeleton} ${styles.courseEyebrow}`} />
                  <span className={`${styles.skeleton} ${styles.courseTitle}`} />
                  <span className={`${styles.skeleton} ${styles.courseDescription}`} />
                  <span className={`${styles.skeleton} ${styles.courseDescriptionShort}`} />
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
