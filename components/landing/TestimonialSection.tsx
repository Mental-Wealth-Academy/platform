import Image from 'next/image';
import styles from './TestimonialSection.module.css';

export const TestimonialSection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.imageColumn}>
            <div className={styles.imageWrapper}>
              <div className={styles.imageMask}>
                <Image
                  src="/uploads/student-group.jpg"
                  alt="Students collaborating together"
                  width={800}
                  height={960}
                  className={styles.image}
                />
              </div>
            </div>
            <div className={styles.mobileAttribution}>
              <div className={styles.authorName}>Maya T.</div>
              <div className={styles.authorTitle}>Graduate Student, Temple University</div>
            </div>
          </div>

          <div className={styles.contentColumn}>
            <div className={styles.eyebrow}>Hear what our students have to say</div>
            <blockquote className={styles.quote}>
              Mental Wealth Academy helped me build connections and network at a time where I was uncertain, the passive weekly sessions were fun and low-stress to keep up with. I didn&apos;t feel judged or rushed, everything came naturally. This community actually gets it.
            </blockquote>
            <div className={styles.footer}>
              <Image
                src="/companylogos/temple-university.png"
                alt="Temple University"
                width={140}
                height={50}
                className={styles.universityLogo}
              />
              <div className={styles.attribution}>
                <div className={styles.authorName}>Maya T.</div>
                <div className={styles.authorTitle}>Graduate Student, Temple University</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
