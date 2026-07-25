import styles from './UpcomingEvent.module.css';

export default function UpcomingEvent() {
  return (
    <section className={styles.card} aria-labelledby="upcoming-event-title">
      <div className={styles.header}>
        <span className={styles.kanji} lang="ja">次回</span>
        <span id="upcoming-event-title" className={styles.headerTitle}>Upcoming Event</span>
        <span className={styles.subject}>Psychology</span>
      </div>
      <div className={styles.body}>
        <div className={styles.time}>
          <span className={styles.date}>July 31st, 1pm EST</span>
        </div>
        <h2 className={styles.eventTitle}>Mental Wealth Workshop</h2>
      </div>
    </section>
  );
}
