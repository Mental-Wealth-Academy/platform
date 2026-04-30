import Link from 'next/link';
import styles from './SnapshotFeaturesSection.module.css';

const features = [
  {
    title: 'A Cohort For Next-Gen Scientists',
    body:
      'Twelve weeks of quests, readings, and field studies. Real start, real end — applied behavioral research with collaborators who publish.',
  },
  {
    title: 'Ascend With Paradigmic Research',
    body:
      'B.L.U.E. reads every submission and pays out the reward. Your reflections become training data. Her judgments evolve as you do.',
  },
  {
    title: 'Universal Credit System',
    body:
      'On-chain credits earned in one case-study app, spendable across all of them. $Shards live in your wallet — not on our servers.',
  },
  {
    title: 'Meta-Parasocial & Cybersecurity Research Programs',
    body:
      'Programs span trust, distrust, parasocial dynamics, and digital autonomy. Each ships as its own disposable app. When it retires, your data and credentials don’t.',
  },
  {
    title: 'Certified Academic Labs',
    body:
      'Defensible research instruments and IRB-style protocols. Your participation generates verifiable credentials and a behavioral dataset you co-own.',
  },
  {
    title: 'Lifetime Membership',
    body:
      '$90 soul-bound NFT. One purchase, full access to every cohort and lab — for as long as the platform exists.',
  },
];

export const SnapshotFeaturesSection: React.FC = () => {
  return (
    <section className={styles.section} aria-labelledby="snapshot-features-eyebrow">
      <div className={styles.container}>
        <header className={styles.header}>
          <p id="snapshot-features-eyebrow" className={styles.eyebrow}>
            <span className={styles.eyebrowAccent}>Features</span>
          </p>
        </header>

        <div className={styles.grid}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.cell}>
              <h3 className={styles.cellTitle}>{feature.title}</h3>
              <p className={styles.cellBody}>{feature.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.footer}>
          <Link href="/community" className={styles.moreLink}>
            More Details
            <svg
              className={styles.chevron}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SnapshotFeaturesSection;
