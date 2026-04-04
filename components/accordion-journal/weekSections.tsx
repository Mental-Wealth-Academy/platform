import React from 'react';
import type { JournalSection } from './AccordionJournalCard';

// Shared icons — solid fill
const PenIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
);
const ClockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);
const WalkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z"/>
  </svg>
);
const ListIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>
);
const TextIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);
const HeartIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const CheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);
const StarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
);

// Week 5 unique icons — solid fill
const FlameIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
  </svg>
);
const SparkleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1l2.39 7.26L22 9l-7.61 2.74L12 23l-2.39-11.26L2 9l7.61-2.74z"/>
  </svg>
);
const CompassIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.88-11.71L10 11l-1.71 5.29L14 15l1.88-5.71z"/>
  </svg>
);
const HourglassIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 2v6l4 4-4 4v6h12v-6l-4-4 4-4V2H6z"/>
  </svg>
);
const LightningIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
  </svg>
);
const GemIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 9l10 13L22 9z"/>
  </svg>
);
const PuzzleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z"/>
  </svg>
);
const TargetIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4a6 6 0 1 1 0 12A6 6 0 0 1 12 6zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
  </svg>
);
const KeyIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

// Artist Date section (shared across most weeks)
function artistDate(): JournalSection {
  return {
    id: 'artist-date',
    title: 'Artist Date',
    icon: ClockIcon,
    type: 'text',
    instructions: 'Take yourself on a solo artist date this week. A block of time (about two hours) set aside and committed to nurturing your creative consciousness. A visit to a great junk store, a solo trip to the beach, an old movie — the point is to have fun and explore.',
    placeholder: 'Describe your artist date plans or experience...',
  };
}

// Artist Walk section (shared across most weeks)
function artistWalk(): JournalSection {
  return {
    id: 'artist-walk',
    title: 'Artist Walk',
    icon: WalkIcon,
    type: 'checklist',
    instructions: 'Take your artist for a walk, the two of you. A brisk twenty-minute walk can dramatically alter consciousness.',
    checkItems: [
      'Completed 20-minute walk',
      'Walked mindfully (no phone)',
      'Noticed something new or inspiring',
    ],
  };
}

// ─── Week 0: Introduction ────────────────────────────────────────────
export const week0Sections: JournalSection[] = [
  {
    id: 'intro-reading',
    title: 'What\'s Your Ethereal Horizon?',
    icon: TextIcon,
    type: 'text',
    instructions: 'A DIVINE BEING STRUCK BY INFINITE! A DIVINE TREE THAT GREW FROM WITHIN ME, AND IT BRANCHED THROUGH THE RHIZOME. AND ROSE AN ETHEREAL HORIZON.',
    placeholder: 'Write your genesis thoughts...',
  },
];

// ─── Week 3: Power ───────────────────────────────────────────────────
export const week3Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'anger-exercise',
    title: 'Anger Exercise',
    icon: ListIcon,
    type: 'list',
    instructions: 'Anger is fuel. It tells us what we want. List situations, people, or events that make you angry. Anger is a map — it shows us where our boundaries are and what matters to us.',
    listCount: 5,
    listLabels: ['Anger 1', 'Anger 2', 'Anger 3', 'Anger 4', 'Anger 5'],
  },
  {
    id: 'synchronicity-log',
    title: 'Synchronicity Log',
    icon: TextIcon,
    type: 'text',
    instructions: 'Record any coincidences, lucky breaks, or "answered prayers" you notice this week. Tracking synchronicity builds trust in the process.',
    placeholder: 'Describe synchronicities you noticed...',
  },
  {
    id: 'forbidden-joys',
    title: 'Forbidden Joys List',
    icon: HeartIcon,
    type: 'numbered-list',
    instructions: 'List ten things you love and would love to do but aren\'t allowed to. Who says you can\'t? Often the things on this list are what we need most.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'wish-list',
    title: 'Wish List',
    icon: StarIcon,
    type: 'numbered-list',
    instructions: 'Write down your wishes quickly — don\'t overthink. Eighteen wishes minimum. Include small and large wishes. Some may surprise you.',
    listCount: 18,
    listLabels: Array.from({ length: 18 }, (_, i) => `${i + 1}.`),
  },
];

// ─── Week 4: Integrity ───────────────────────────────────────────────
export const week4Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'reading-deprivation',
    title: 'Reading Deprivation',
    icon: CheckIcon,
    type: 'checklist',
    instructions: 'This week, abstain from reading. No books, magazines, newspapers, or scrolling. This is a radical but powerful tool. When we fill our well with others\' words, our own remain unheard.',
    checkItems: [
      'Avoided reading books/magazines',
      'Avoided scrolling social media feeds',
      'Used freed time for creative activity',
      'Noticed what came up during the deprivation',
    ],
  },
  {
    id: 'buried-dreams',
    title: 'Buried Dreams List',
    icon: ListIcon,
    type: 'numbered-list',
    instructions: 'List five dreams that have been buried. What did you want to be? What did you want to do? These buried dreams are compass points. They show the direction of your true north.',
    listCount: 5,
    listLabels: Array.from({ length: 5 }, (_, i) => `Dream ${i + 1}`),
  },
  {
    id: 'creative-injuries',
    title: 'Inventory of Creative Injuries',
    icon: TextIcon,
    type: 'text',
    instructions: 'Write about a time your creativity was crushed. Who said what? How old were you? What was the setting? How did it make you feel? How has it shaped your creative life since?',
    placeholder: 'Describe a creative injury...',
  },
  {
    id: 'life-is-what',
    title: 'Life Is What?',
    icon: TextIcon,
    type: 'text',
    instructions: 'Complete the sentence "Life is..." with as many endings as you can think of. Then complete "If I had more integrity, I would..." five times.',
    placeholder: 'Life is...\n\nIf I had more integrity, I would...',
  },
];

// ─── Week 5: Possibility ─────────────────────────────────────────────
export const week5Sections: JournalSection[] = [
  {
    id: 'god',
    title: 'God',
    icon: FlameIcon,
    type: 'list',
    instructions: 'The reason I can\'t really believe in a supportive God is ... List five grievances. (God can take it.)',
    listCount: 5,
    listLabels: ['Grievance 1', 'Grievance 2', 'Grievance 3', 'Grievance 4', 'Grievance 5'],
  },
  {
    id: 'desires',
    title: 'List 5 Desires',
    icon: HeartIcon,
    type: 'list',
    instructions: 'If I had either faith or money I would try ... List five desires. For the next week, be alert for images of these desires. When you spot them, clip them, buy them, photograph them, draw them, collect them somehow. With these images, begin a file of dreams that speak to you. Add to it continually for the duration of the course.',
    listCount: 5,
    listLabels: ['Desire 1', 'Desire 2', 'Desire 3', 'Desire 4', 'Desire 5'],
  },
  {
    id: 'imaginary-lives',
    title: 'List 5 Imaginary Lives',
    icon: SparkleIcon,
    type: 'list',
    instructions: 'One more time, list five imaginary lives. Have they changed? Are you doing more parts of them? You may want to add images of these lives to your image file.',
    listCount: 5,
    listLabels: ['Life 1', 'Life 2', 'Life 3', 'Life 4', 'Life 5'],
  },
  {
    id: 'adventures',
    title: 'List 5 Adventures',
    icon: CompassIcon,
    type: 'list',
    instructions: 'If I were twenty and had money ... List five adventures. Again, add images of these to your visual image file.',
    listCount: 5,
    listLabels: ['Adventure 1', 'Adventure 2', 'Adventure 3', 'Adventure 4', 'Adventure 5'],
  },
  {
    id: 'postponed-pleasures',
    title: 'List 5 Postponed Pleasures',
    icon: HourglassIcon,
    type: 'list',
    instructions: 'If I were sixty-five and had money ... List five postponed pleasures. And again, collect these images. This is a very potent tool.',
    listCount: 5,
    listLabels: ['Pleasure 1', 'Pleasure 2', 'Pleasure 3', 'Pleasure 4', 'Pleasure 5'],
  },
  {
    id: 'mean-to-yourself',
    title: 'List 10 Ways You Are Mean to Yourself',
    icon: LightningIcon,
    type: 'numbered-list',
    instructions: 'Ten ways I am mean to myself are ... Just as making the positive explicit helps allow it into our lives, making the negative explicit helps us to exorcise it.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'items-to-own',
    title: 'List 10 Items You Want to Own',
    icon: GemIcon,
    type: 'numbered-list',
    instructions: 'Ten items I would like to own that I don\'t are ... And again, you may want to collect these images. In order to boost sales, experts in sales motivation often teach rookie salesmen to post images of what they would like to own. It works.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'favorite-creative-block',
    title: 'Favorite Creative Block',
    icon: PuzzleIcon,
    type: 'text',
    instructions: 'Honestly, my favorite creative block is ... TV, over-reading, friends, work, rescuing others, overexercise. You name it. Whether you can draw or not, please cartoon yourself indulging in it.',
    placeholder: 'Describe your favorite creative block...',
  },
  {
    id: 'blame-for-blocked',
    title: 'Who You Blame for Being Blocked',
    icon: TargetIcon,
    type: 'text',
    instructions: 'The person I blame for being blocked is ... Again, use your pages to mull on this.',
    placeholder: 'Write about who you blame for being blocked...',
  },
  {
    id: 'payoff-staying-blocked',
    title: 'Payoff for Staying Blocked',
    icon: KeyIcon,
    type: 'text',
    instructions: 'My payoff for staying blocked is ... This you may want to explore in your morning pages.',
    placeholder: 'Explore your payoff for staying blocked...',
  },
];

// ─── Week 6: Abundance ───────────────────────────────────────────────

// Week 6 unique icons
const CoinIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
  </svg>
);
const LeafIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.7c.68.21 1.36.34 2.09.34C13 20 17 15 17 8zM6.73 17.64C8.21 14.89 10.6 12 17 10c0 4-3 8-8.27 8-.37 0-.73-.03-1.08-.1l.08-.26z"/>
  </svg>
);
const BroomIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.36 2.72l1.42 1.42-5.72 5.71c1.07 1.54 1.22 3.39.32 4.59L9.06 8.12c1.2-.9 3.05-.75 4.59.32l5.71-5.72zM5.93 17.57c-2.01-2.01-3.24-4.41-3.58-6.65l4.88-2.09 7.44 7.44-2.09 4.88c-2.24-.34-4.64-1.57-6.65-3.58z"/>
  </svg>
);
export const week6Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'luxury-list',
    title: 'Luxury List',
    icon: StarIcon,
    type: 'numbered-list',
    instructions: 'List ten items that feel luxurious to you. These do not have to be expensive. A fresh raspberry, a teacup from Chinatown, an hour with no agenda. Circle two that you could afford or acquire this week.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'counting-exercise',
    title: 'Counting Exercise',
    icon: CoinIcon,
    type: 'text',
    instructions: 'For the next week, carry a small notepad and write down every single thing you spend money on. Every nickel. Every cab ride, every coffee, every loan to a friend. Be meticulous, thorough, and nonjudgmental. This is self-observation, not self-flagellation. What patterns do you notice? Where does your money actually go versus where you say you value?',
    placeholder: 'Track your spending and reflect on what you discover...',
  },
  {
    id: 'money-madness',
    title: 'Money Madness Survey',
    icon: TextIcon,
    type: 'text',
    instructions: 'Complete these phrases as fast as you can. Don\'t think, just write:\n\nPeople with money are ___.\nMoney makes people ___.\nI\'d have more money if ___.\nMy dad thought money was ___.\nMy mom always thought money would ___.\nIn my family, money caused ___.\nMoney equals ___.\nIf I had money, I\'d ___.\nIf I could afford it, I\'d ___.\nI\'m afraid that if I had money I would ___.\nMoney is ___.\nHaving money is not ___.\nIn order to have more money, I\'d need to ___.\nWhen I have money, I usually ___.\nIf I weren\'t so cheap I\'d ___.\nBeing broke tells me ___.',
    placeholder: 'Write your money mythology...',
  },
  {
    id: 'time-money-inventory',
    title: 'Time & Money Inventory',
    icon: HourglassIcon,
    type: 'text',
    instructions: 'Where does your money actually go? Where does your time actually go? Is there a discrepancy between what you say you value and how you spend? Are you fritting away cash on things you don\'t cherish and denying yourself what you do?',
    placeholder: 'Reflect on where your time and money go...',
  },
  {
    id: 'natural-abundance',
    title: 'Natural Abundance',
    icon: LeafIcon,
    type: 'checklist',
    instructions: 'Go outside and collect five pretty or interesting rocks. Then pick five flowers or leaves. Rocks can be carried in pockets, fingered in meetings\u2014small, constant reminders of your creative consciousness. Press the flowers between wax paper and save them in a book. If you did this in kindergarten, good. Some of the best creative play happens there.',
    checkItems: ['Found 5 interesting rocks', 'Picked 5 flowers or leaves', 'Pressed or saved the flowers'],
  },
  {
    id: 'clearing',
    title: 'Clearing',
    icon: BroomIcon,
    type: 'checklist',
    instructions: 'Throw out or give away five ratty pieces of clothing. Then look at your home environment\u2014any new changes you can make? Clearing physical space clears creative space.',
    checkItems: ['Removed 5 ratty clothing items', 'Made a change in my home environment'],
  },
];

// ─── Week 7: Connection ──────────────────────────────────────────────
export const week7Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'jealousy-map',
    title: 'Jealousy Map',
    icon: ListIcon,
    type: 'list',
    instructions: 'Jealousy is a map. Each person you\'re jealous of holds a clue to what you want. List people you\'re jealous of and what specifically triggers the jealousy.',
    listCount: 5,
    listLabels: ['Person & what I envy', 'Person & what I envy', 'Person & what I envy', 'Person & what I envy', 'Person & what I envy'],
  },
  {
    id: 'perfectionism-inventory',
    title: 'Perfectionism Inventory',
    icon: TextIcon,
    type: 'text',
    instructions: 'Where does perfectionism block you? Perfectionism is not about high standards. It\'s a refusal to let yourself move ahead. Where do you stall because you\'re afraid it won\'t be perfect?',
    placeholder: 'Describe where perfectionism blocks you...',
  },
  {
    id: 'risk-taking',
    title: 'Risk-taking',
    icon: ListIcon,
    type: 'list',
    instructions: 'List five creative risks you\'d love to take. Circle one and do it this week. Risk-taking is a skill that can be built gradually.',
    listCount: 5,
    listLabels: ['Risk 1', 'Risk 2', 'Risk 3', 'Risk 4', 'Risk 5'],
  },
  {
    id: 'artists-altar',
    title: 'Artist\'s Altar',
    icon: TextIcon,
    type: 'text',
    instructions: 'Create a small artist\'s altar — a collection of objects that make you feel creative and inspired. Describe it or describe what you would put on it.',
    placeholder: 'Describe your artist\'s altar...',
  },
];

// ─── Week 8: Strength ────────────────────────────────────────────────
export const week8Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'survival-goals',
    title: 'Survival Goals',
    icon: ListIcon,
    type: 'list',
    instructions: 'List five things that give you a sense of strength and survival. What resources have gotten you through hard times?',
    listCount: 5,
    listLabels: ['Strength 1', 'Strength 2', 'Strength 3', 'Strength 4', 'Strength 5'],
  },
  {
    id: 'creative-gifts',
    title: 'Creative Gifts Inventory',
    icon: StarIcon,
    type: 'numbered-list',
    instructions: 'List ten creative gifts you possess. They can be large or small: a knack for color, a way with words, good timing.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'nurturing-creativity',
    title: 'Nurturing Creativity',
    icon: TextIcon,
    type: 'text',
    instructions: 'How do you nurture your creativity? What could you do better? What do you need to feel artistically safe?',
    placeholder: 'Reflect on nurturing your creativity...',
  },
  {
    id: 'goal-setting',
    title: 'Goal-Setting',
    icon: ListIcon,
    type: 'list',
    instructions: 'Set five concrete creative goals for yourself. Make them specific and achievable. Include at least one that scares you a little.',
    listCount: 5,
    listLabels: ['Goal 1', 'Goal 2', 'Goal 3', 'Goal 4', 'Goal 5'],
  },
];

// ─── Week 9: Compassion ──────────────────────────────────────────────
export const week9Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'fear-inventory',
    title: 'Fear Inventory',
    icon: ListIcon,
    type: 'list',
    instructions: 'List five fears that block your creativity. Which fears are real? Which are imagined? Naming fears diminishes their power.',
    listCount: 5,
    listLabels: ['Fear 1', 'Fear 2', 'Fear 3', 'Fear 4', 'Fear 5'],
  },
  {
    id: 'enthusiasm-traps',
    title: 'Enthusiasm Traps',
    icon: TextIcon,
    type: 'text',
    instructions: 'Describe situations where your enthusiasm was met with dampening responses. Who rains on your parade? How do you handle it?',
    placeholder: 'Describe enthusiasm traps...',
  },
  {
    id: 'gain-disgust',
    title: 'Gain Disgust',
    icon: TextIcon,
    type: 'text',
    instructions: 'When things go well, do you feel uneasy? Some of us have an allergy to success. Describe times when good news made you uncomfortable.',
    placeholder: 'Reflect on your relationship with success...',
  },
  {
    id: 'enabling',
    title: 'Enabling',
    icon: TextIcon,
    type: 'text',
    instructions: 'Do you enable others at the expense of your own creativity? Do you give time, energy, and creative ideas to others while starving your own artist?',
    placeholder: 'Reflect on enabling patterns...',
  },
];

// ─── Week 10: Self-Protection ────────────────────────────────────────
export const week10Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'workaholism-inventory',
    title: 'Workaholism Inventory',
    icon: CheckIcon,
    type: 'checklist',
    instructions: 'Workaholism is one of the most common creative blocks. Check the items that apply to you.',
    checkItems: [
      'I regularly work past the time I intended to stop',
      'I cancel personal plans to work more',
      'I feel guilty when I\'m not working',
      'I use work to avoid feelings',
      'I haven\'t taken a real vacation in years',
      'I feel anxious when I have unstructured time',
    ],
  },
  {
    id: 'creativity-contract',
    title: 'Creativity Contract',
    icon: TextIcon,
    type: 'text',
    instructions: 'Write a contract with yourself committing to your creative recovery. What will you do? What will you stop doing? Sign it.',
    placeholder: 'Write your creativity contract...',
  },
  {
    id: 'fame-fears',
    title: 'Fame Fears',
    icon: ListIcon,
    type: 'list',
    instructions: 'What would happen if you became creatively successful? List five fears about fame, visibility, or success.',
    listCount: 5,
    listLabels: ['Fear 1', 'Fear 2', 'Fear 3', 'Fear 4', 'Fear 5'],
  },
  {
    id: 'early-patterns',
    title: 'Early Patterns',
    icon: TextIcon,
    type: 'text',
    instructions: 'What creative patterns did you establish early in life? Were you praised for creativity or punished for it? How do those patterns show up now?',
    placeholder: 'Reflect on early creative patterns...',
  },
];

// ─── Week 11: Autonomy ───────────────────────────────────────────────
export const week11Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'daily-details',
    title: 'Daily Details',
    icon: TextIcon,
    type: 'text',
    instructions: 'Describe your ideal day in full sensory detail. What would you see, hear, taste, touch, smell? Where would you be? Who would be with you?',
    placeholder: 'Describe your ideal day...',
  },
  {
    id: 'nurturing-map',
    title: 'Nurturing Map',
    icon: ListIcon,
    type: 'list',
    instructions: 'List five people who nurture your creativity and five activities that nurture it. How often do you access these resources?',
    listCount: 10,
    listLabels: [
      'Nurturing person 1', 'Nurturing person 2', 'Nurturing person 3', 'Nurturing person 4', 'Nurturing person 5',
      'Nurturing activity 1', 'Nurturing activity 2', 'Nurturing activity 3', 'Nurturing activity 4', 'Nurturing activity 5',
    ],
  },
  {
    id: 'creativity-monster',
    title: 'Creativity Monster',
    icon: TextIcon,
    type: 'text',
    instructions: 'Draw or describe the monster that guards the gate to your creativity. What does it say? What does it look like? How can you get past it?',
    placeholder: 'Describe your creativity monster...',
  },
  {
    id: 'independence-survey',
    title: 'Independence Survey',
    icon: TextIcon,
    type: 'text',
    instructions: 'How autonomous are you in your creative life? Do you need permission? Approval? How can you build more independence?',
    placeholder: 'Reflect on your creative independence...',
  },
];

// ─── Week 12: Faith ──────────────────────────────────────────────────
export const week12Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'mystery-practices',
    title: 'Mystery Practices',
    icon: TextIcon,
    type: 'text',
    instructions: 'What mystery practices resonate with you? Prayer, meditation, nature walks, ritual — what connects you to something larger?',
    placeholder: 'Describe your mystery practices...',
  },
  {
    id: 'creative-visualization',
    title: 'Creative Visualization',
    icon: TextIcon,
    type: 'text',
    instructions: 'Close your eyes and visualize yourself five years from now, living your most creative life. What do you see? Where are you? What have you created?',
    placeholder: 'Describe your creative visualization...',
  },
  {
    id: 'open-letter',
    title: 'Open Letter',
    icon: TextIcon,
    type: 'text',
    instructions: 'Write an open letter to yourself from your creative self. What does your artist want to tell you? What does it need? What does it promise?',
    placeholder: 'Dear artist...',
  },
  {
    id: 'artists-prayer',
    title: 'Artist\'s Prayer',
    icon: TextIcon,
    type: 'text',
    instructions: 'Write your own artist\'s prayer or creative manifesto. What do you believe about creativity? What do you commit to? This is your personal creative creed.',
    placeholder: 'Write your artist\'s prayer...',
  },
];

// ─── Week 13: Epilogue ───────────────────────────────────────────────
export const week13Sections: JournalSection[] = [
  {
    id: 'final-entry',
    title: 'Final Journey Entry',
    icon: TextIcon,
    type: 'text',
    instructions: 'This is your epilogue. Reflect on the entire journey. What has changed? What have you recovered? What will you carry forward? This is not an ending — it is a beginning.',
    placeholder: 'Write your final journey reflection...',
  },
];

/**
 * Map of week number to section definitions.
 * Weeks 1 and 2 remain in AccordionJournalCard.tsx for backward compatibility.
 */
export const weekSectionsMap: Record<number, JournalSection[]> = {
  0: week0Sections,
  3: week3Sections,
  4: week4Sections,
  5: week5Sections,
  6: week6Sections,
  7: week7Sections,
  8: week8Sections,
  9: week9Sections,
  10: week10Sections,
  11: week11Sections,
  12: week12Sections,
  13: week13Sections,
};
