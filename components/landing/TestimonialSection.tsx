import React from 'react';
import styles from './TestimonialSection.module.css';

const testimonials = [
  {
    quote: 'The peer connections I made here changed my perspective entirely. I found a support system I didn\'t know I needed.',
    name: 'Jordan K.',
    title: 'Undergraduate, Howard University',
  },
  {
    quote: 'Mental Wealth Academy helped me build connections and network at a time where I was uncertain, the passive weekly sessions were fun and low-stress to keep up with. This community actually gets it.',
    name: 'Maya T.',
    title: 'Graduate Student, Temple University',
  },
  {
    quote: 'The gamified quests kept me engaged when traditional learning felt draining. I actually looked forward to every session.',
    name: 'Aisha R.',
    title: 'PhD Candidate, MIT',
  },
];

export const TestimonialSection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.eyebrow}>Hear what our students have to say</div>
        <div className={styles.grid}>
          {testimonials.map((t, i) => (
            <div key={i} className={`${styles.card} ${i === 1 ? styles.cardFeatured : ''}`}>
              <blockquote className={styles.quote}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div className={styles.footer}>
                <div className={styles.avatar}>{t.name.charAt(0)}</div>
                <div className={styles.attribution}>
                  <div className={styles.authorName}>{t.name}</div>
                  <div className={styles.authorTitle}>{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
