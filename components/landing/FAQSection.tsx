'use client';

import { useState } from 'react';
import styles from './FAQSection.module.css';
import { useSound } from '@/hooks/useSound';

const FAQ_ITEMS = [
  {
    question: 'What is Mental Wealth Academy?',
    answer:
      'Mental Wealth Academy is a guided 12-week personal growth program. It combines journaling, reflection, practical exercises, and community support to help you build better habits, understand yourself more clearly, and make real changes in your life.',
  },
  {
    question: 'What does the 12-week course cover?',
    answer:
      'Each week focuses on a different part of your life and mindset, including safety, identity, confidence, boundaries, connection, compassion, and purpose. The course gives you structured prompts and exercises that help you reflect, stay consistent, and apply what you learn in everyday life.',
  },
  {
    question: 'What kind of tools do you use?',
    answer:
      'We research and integrate tools from neuroscience and personal development. Things like reflective journaling frameworks, cognitive behavioral exercises, mindfulness protocols, and decision-making models. All of it bolted onto infrastructure that gives you ownership over your progress.',
  },
  {
    question: 'What are companions?',
    answer:
      'Companions are AI guides inside the platform. They remember your progress, help you stay oriented, and add personality to the experience. You can think of them as supportive digital characters that help carry the story and guide you through different parts of the program.',
  },
  {
    question: 'How much time does it take each week?',
    answer:
      'Roughly 2 to 3 hours. One lesson, one reflective exercise, one optional discussion with your cohort. You move at your own pace. Consistency matters more than speed here.',
  },
  {
    question: 'Is this a therapy replacement?',
    answer:
      'No. This is education on psychology and behavioral improvement, not clinical treatment. We teach you frameworks for understanding how your mind works, how groups coordinate, and how to take ownership of your mental wealth. If you need therapy, get therapy. This sits alongside it.',
  },
];

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`${styles.faqChevron} ${open ? styles.faqChevronOpen : ''}`}
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 7.5L10 12.5L15 7.5" />
  </svg>
);

export const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { play } = useSound();

  const toggle = (index: number) => {
    const willOpen = openIndex !== index;
    play(willOpen ? 'toggle-on' : 'toggle-off');
    setOpenIndex(willOpen ? index : null);
  };

  return (
    <section className={styles.faqSection}>
      <div className={styles.faqContainer}>
        <p className={styles.faqEyebrow}>FAQ</p>
        <h2 className={styles.faqTitle}>Frequently asked questions</h2>
        <ul className={styles.faqList}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <li key={i} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => toggle(i)}
                  onMouseEnter={() => play('hover')}
                  aria-expanded={isOpen}
                  type="button"
                >
                  <span className={styles.faqQuestionText}>{item.question}</span>
                  <ChevronIcon open={isOpen} />
                </button>
                <div
                  className={`${styles.faqAnswer} ${isOpen ? styles.faqAnswerOpen : ''}`}
                >
                  <div className={styles.faqAnswerInner}>
                    <p className={styles.faqAnswerText}>{item.answer}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          className={styles.scrollToTop}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 16V4" />
            <path d="M4 10L10 4L16 10" />
          </svg>
          <span>Back to top</span>
        </button>
      </div>
    </section>
  );
};
