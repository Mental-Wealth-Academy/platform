'use client';

import { useState } from 'react';
import styles from './FAQSection.module.css';

const FAQ_ITEMS = [
  {
    question: 'What is Mental Wealth Academy?',
    answer:
      'Mental Wealth Academy (MWA) is a decentralized education platform that combines evidence-based mental health curriculum with blockchain governance. Members complete weekly quests, earn on-chain credentials, and vote on how the community treasury is allocated.',
  },
  {
    question: 'How does governance work?',
    answer:
      'Governance is handled through the AzuraKillStreak smart contract deployed on Base. Members who complete quests earn voting power. Proposals are submitted on-chain, reviewed by the Azura AI agent, and executed automatically once they reach quorum.',
  },
  {
    question: 'Who is Azura?',
    answer:
      'Azura is the academy\'s AI agent — she reviews governance proposals for safety and alignment, manages the community treasury, and provides personalized feedback on quest submissions. She runs on ElizaOS and operates transparently on-chain.',
  },
  {
    question: 'Is Mental Wealth Academy free to use?',
    answer:
      'The core curriculum and community features are free to access. Premium quests and advanced tracks may require a small contribution to the community treasury, which is governed and allocated by members themselves.',
  },
  {
    question: 'How much time do I need each week?',
    answer:
      'Most members spend around 2–3 hours per week. Each weekly quest includes a short lesson, a reflective exercise, and an optional discussion prompt. You can move at your own pace — streaks reward consistency, not speed.',
  },
  {
    question: 'How does the treasury work?',
    answer:
      'The treasury is a multi-sig smart contract on Base that holds community funds. Members propose and vote on how funds are spent — whether that\'s funding new course content, grants for mental health research, or community initiatives. Every transaction is verified by Azura\'s oracle network before execution.',
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
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
      </div>
    </section>
  );
};
