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
  {
    id: 'mantra',
    title: 'Mantra',
    icon: StarIcon,
    type: 'text',
    instructions: 'Make this phrase a mantra: "Treating myself like a precious object will make me strong." Watercolor, crayon, or calligraph this phrase and post it where you will see it daily. We tend to think being hard on ourselves will make us strong. But it is cherishing ourselves that gives us strength.',
    placeholder: 'Describe what you created, or write the phrase here...',
  },
  {
    id: 'album',
    title: 'Album',
    icon: ClockIcon,
    type: 'text',
    instructions: 'Give yourself time out to listen to one side of an album, just for joy. You may want to doodle as you listen, allowing yourself to draw the shapes, emotions, thoughts you hear in the music. Notice how just twenty minutes can refresh you. Learn to take these mini-artist dates to break stress and allow insight.',
    placeholder: 'What did you listen to? What did you notice?',
  },
  {
    id: 'sacred-space',
    title: 'Sacred Space',
    icon: CompassIcon,
    type: 'text',
    instructions: 'Take yourself into a sacred space—a church, synagogue, library, grove of trees—and allow yourself to savor the silence and healing solitude. Each of us has a personal idea of what sacred space is. For me, a large clock store or a great aquarium store can engender a sense of timeless wonder. Experiment.',
    placeholder: 'Where did you go? What did you feel?',
  },
  {
    id: 'smell',
    title: 'Smell',
    icon: SparkleIcon,
    type: 'text',
    instructions: 'Create one wonderful smell in your house—with soup, incense, fir branches, candles—whatever.',
    placeholder: 'What did you create? How did it feel?',
  },
  {
    id: 'clothes',
    title: 'Clothes',
    icon: HeartIcon,
    type: 'text',
    instructions: 'Wear your favorite item of clothing for no special occasion.',
    placeholder: 'What did you wear? How did it feel to do it just for you?',
  },
  {
    id: 'gift',
    title: 'Gift',
    icon: GemIcon,
    type: 'text',
    instructions: 'Buy yourself one wonderful pair of socks, one wonderful pair of gloves—one wonderfully comforting, self-loving something.',
    placeholder: 'What did you buy for yourself?',
  },
  {
    id: 'collage',
    title: 'Collage',
    icon: TextIcon,
    type: 'text',
    instructions: 'Collect a stack of at least ten magazines and allow yourself to freely dismember them. Setting a twenty-minute time limit, tear through the magazines collecting any images that reflect your life or interests. Think of this collage as a form of pictorial autobiography. Include your past, present, future, and your dreams. Arrange your images in a way that pleases you.',
    placeholder: 'Describe your collage and what you discovered about yourself...',
  },
  {
    id: 'films',
    title: 'Films',
    icon: ListIcon,
    type: 'list',
    instructions: 'Quickly list five favorite films. Do you see any common denominators among them? Are they romances, adventures, period pieces, political dramas, family epics, thrillers? Do you see traces of your cinematic themes in your collage?',
    listCount: 5,
    listLabels: ['Film 1', 'Film 2', 'Film 3', 'Film 4', 'Film 5'],
  },
  {
    id: 'books',
    title: 'Books',
    icon: ListIcon,
    type: 'list',
    instructions: 'Name your favorite topics to read about: comparative religion, movies, ESP, physics, rags-to-riches, betrayal, love triangles, scientific breakthroughs, sports... Are these topics in your collage?',
    listCount: 5,
    listLabels: ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5'],
  },
  {
    id: 'place-of-honor',
    title: 'Place of Honor',
    icon: StarIcon,
    type: 'text',
    instructions: 'Give your collage a place of honor. Even a secret place of honor is all right—in your closet, in a drawer, anywhere that is yours. You may want to do a new one every few months, or collage more thoroughly a dream you are trying to accomplish.',
    placeholder: 'Where did you place your collage? What does having it displayed mean to you?',
  },
];

// ─── Week 8: Strength ────────────────────────────────────────────────
export const week8Sections: JournalSection[] = [
  {
    id: 'goals',
    title: 'Goals',
    icon: CompassIcon,
    type: 'numbered-list',
    instructions: 'Goal Search: Name your dream. Write it down: "In a perfect world, I would secretly love to be a _____." Then name one concrete goal that signals its accomplishment (your emotional true north). Imagine where you want to be in five years. Then work backwards to what you can do this year, this month, this week, today, right now. Select a role model and make a real action plan.',
    listCount: 8,
    listLabels: [
      'In a perfect world, I would secretly love to be a...',
      'One goal that signals my accomplishment:',
      'In a perfect world, in 5 years I would be...',
      'In the current world, I can move closer this year by...',
      'This month I can...',
      'This week I can...',
      'Today I can...',
      'Right now I can...',
    ],
  },
  {
    id: 'childhood',
    title: 'Childhood',
    icon: HeartIcon,
    type: 'text',
    instructions: 'New Childhood: What might you have been if you\'d had perfect nurturing? Write a page of this fantasy childhood. What were you given? Can you reparent yourself in that direction now?',
    placeholder: 'Write your fantasy childhood...',
  },
  {
    id: 'color-schemes',
    title: 'Color Schemes',
    icon: SparkleIcon,
    type: 'text',
    instructions: 'Pick a color and write a quick few sentences describing yourself in the first person. ("I am silver, high-tech and ethereal…" or "I am red. I am passion, sunset, anger…") What is your favorite color? What do you have that is that color? What about an entire room?',
    placeholder: 'I am [color]. I am...',
  },
  {
    id: 'not-allowed',
    title: 'Not Allowed',
    icon: LightningIcon,
    type: 'list',
    instructions: 'List five things you are not allowed to do: kill your boss, scream in church, go outside naked, make a scene, quit your job. Now do that thing on paper. Write it, draw it, paint it, act it out, collage it. Now put some music on and dance it.',
    listCount: 5,
    listLabels: ['1.', '2.', '3.', '4.', '5.'],
  },
  {
    id: 'style',
    title: 'Style',
    icon: ListIcon,
    type: 'numbered-list',
    instructions: 'Style Search: List twenty things you like to do. For each item, note: Does it cost money or is it free? Expensive or cheap? Alone or with somebody? Job related? Physical risk? Fast-paced or slow? Mind, body, or spiritual?',
    listCount: 20,
    listLabels: Array.from({ length: 20 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'ideal-day',
    title: 'Ideal Day',
    icon: ClockIcon,
    type: 'text',
    instructions: 'Ideal Day: Plan a perfect day in your life as it is now constituted, using the information gleaned from your Style list.',
    placeholder: 'Describe your ideal day as your life is right now...',
  },
  {
    id: 'really-perfect-day',
    title: 'Really Perfect Day',
    icon: StarIcon,
    type: 'text',
    instructions: 'Ideal Ideal Day: Plan a perfect day in your life as you wish it were constituted. There are no restrictions. Allow yourself to be and to have whatever your heart desires. Your ideal environment, job, home, circle of friends, intimate relationship, stature in your art form—your wildest dreams.',
    placeholder: 'Describe your perfect day with no restrictions...',
  },
  {
    id: 'do-a-thing',
    title: 'Do a Thing',
    icon: GemIcon,
    type: 'text',
    instructions: 'Choose one festive aspect from your Really Perfect Day. Allow yourself to live it. You may not be able to move to Rome yet, but even in a still grungy apartment you can enjoy a homemade cappuccino and a croissant.',
    placeholder: 'What did you choose? How did you bring it to life today?',
  },
];

// ─── Week 9: Compassion ──────────────────────────────────────────────
export const week9Sections: JournalSection[] = [
  {
    id: 'read-morning-pages',
    title: 'Read Your Morning Pages',
    icon: TextIcon,
    type: 'text',
    instructions: 'Read your morning pages. Use two colored markers—one to highlight insights, another to highlight actions needed. Do not judge your pages or yourself. Take them as information, not an indictment. Who have you consistently been complaining about? What have you procrastinated on? What have you allowed yourself to change or accept? The pages have let you vent, plan, dream, and know your own mind. Give yourself credit.',
    placeholder: 'What did you notice reading back through your pages?',
  },
  {
    id: 'visualizing',
    title: 'Visualizing',
    icon: StarIcon,
    type: 'text',
    instructions: 'Name your goal: "I am ___." In the present tense, describe yourself doing it at the height of your powers. This is your ideal scene. Read it aloud to yourself. Post it above your work area and read it aloud daily. For the next week, collect actual pictures of yourself and combine them with magazine images to collage your ideal scene. Seeing is believing—the visual cue of your real self in your ideal scene makes it far more real.',
    placeholder: 'I am... [describe yourself fully living your goal in the present tense]',
  },
  {
    id: 'priorities',
    title: 'Priorities',
    icon: ListIcon,
    type: 'numbered-list',
    instructions: 'List your creative goals for the year, the month, and the week.',
    listCount: 3,
    listLabels: [
      'My creative goals for the year:',
      'My creative goals for the month:',
      'My creative goals for the week:',
    ],
  },
  {
    id: 'u-turns',
    title: 'U-Turns',
    icon: CompassIcon,
    type: 'text',
    instructions: 'Name one creative U-turn you\'ve taken. Name three more. Name the one that just kills you. Forgive yourself for all failures of nerve, timing, and initiative. Consider whether any aborted or abandoned creative projects can be rescued. Choose one creative U-turn—retrieve it and mend it. What creative dreams are lurching toward possibility? Admit that they frighten you. Choose an artist totem (a doll, stuffed animal, carved figure, wind-up toy) that you feel a protective fondness toward. Give it a place of honor.',
    placeholder: 'Name your U-turns, forgive yourself, and describe your totem...',
  },
];

// ─── Week 10: Self-Protection ────────────────────────────────────────
export const week10Sections: JournalSection[] = [
  {
    id: 'deadlies',
    title: 'Deadlies',
    icon: FlameIcon,
    type: 'text',
    instructions: 'Cut seven strips of paper. Write one word on each: alcohol, drugs, sex, work, money, food, family/friends. Fold them and place in an envelope. Draw one and write five ways it has negatively impacted your life. Return it and draw again—seven times total. You may draw the same one repeatedly. This is significant. Often it is the last impact on the final list of an annoying "Oh no, not again" that breaks through denial into clarity.',
    placeholder: 'Record your seven draws and five impacts each here...',
  },
  {
    id: 'touchstones',
    title: 'Touchstones',
    icon: HeartIcon,
    type: 'text',
    instructions: 'Make a quick list of things you love—happiness touchstones for you. River rocks worn smooth, willow trees, cornflowers, real Italian bread, homemade vegetable soup, the smell of new-mown grass, blue velvet… Post this list where it can console you. You may want to draw one of the items—or acquire it. Play a little.',
    placeholder: 'List the things that make you feel most yourself and most alive...',
  },
  {
    id: 'truth',
    title: 'Truth',
    icon: LightningIcon,
    type: 'numbered-list',
    instructions: 'The Awful Truth: Answer the following questions honestly.',
    listCount: 9,
    listLabels: [
      'What habit do you have that gets in the way of your creativity? Tell the truth.',
      'What do you think might be a problem? It is. What is it?',
      'What do you plan to do about the habit or problem?',
      'What is your payoff in holding on to this block?',
      'Which friends make you doubt yourself? (The self-doubt is yours already, but they trigger it.)',
      'Which friends believe in you and your talent? (The talent is yours, but they make you feel it.)',
      'What is the payoff in keeping your destructive friends?',
      'Which destructive habits do your destructive friends share with your destructive self?',
      'Which constructive habits do your constructive friends share with your constructive self?',
    ],
  },
  {
    id: 'bottom-line',
    title: 'Bottom Line',
    icon: CompassIcon,
    type: 'numbered-list',
    instructions: 'Setting a Bottom Line: Working with your answers above, set a bottom line for yourself. Begin with five of your most painful behaviors. "I will no longer ___." You can always add more later.',
    listCount: 5,
    listLabels: [
      'I will no longer...',
      'I will no longer...',
      'I will no longer...',
      'I will no longer...',
      'I will no longer...',
    ],
  },
  {
    id: 'cherishing',
    title: 'Cherishing',
    icon: StarIcon,
    type: 'numbered-list',
    instructions: 'Cherishing: List five small victories. List three nurturing actions you took for your artist. List three actions you could take to comfort your artist. Make three nice promises to yourself and keep them. Do one lovely thing for yourself each day this week.',
    listCount: 16,
    listLabels: [
      'Victory 1:',
      'Victory 2:',
      'Victory 3:',
      'Victory 4:',
      'Victory 5:',
      'Nurturing action 1:',
      'Nurturing action 2:',
      'Nurturing action 3:',
      'Comfort action 1:',
      'Comfort action 2:',
      'Comfort action 3:',
      'Promise 1:',
      'Promise 2:',
      'Promise 3:',
      'Lovely thing I did for myself today:',
      'Another lovely thing:',
    ],
  },
];

// ─── Week 11: Autonomy ───────────────────────────────────────────────
export const week11Sections: JournalSection[] = [
  {
    id: 'artists-prayer',
    title: "Artist's Prayer",
    icon: StarIcon,
    type: 'text',
    instructions: "Write out, in longhand, your Artist's Prayer from Week Four. Place it in your wallet.",
    placeholder: "Write out your Artist's Prayer here...",
  },
  {
    id: 'notebook',
    title: 'Notebook',
    icon: TextIcon,
    type: 'numbered-list',
    instructions: 'Buy yourself a special creativity notebook. Number pages one through seven. Give one page each to: health, possessions, leisure, relationships, creativity, career, and spirituality. With no thought as to practicality, list ten wishes in each area. Let yourself dream.',
    listCount: 7,
    listLabels: [
      'Health (10 wishes):',
      'Possessions (10 wishes):',
      'Leisure (10 wishes):',
      'Relationships (10 wishes):',
      'Creativity (10 wishes):',
      'Career (10 wishes):',
      'Spirituality (10 wishes):',
    ],
  },
  {
    id: 'honest-changes',
    title: 'Honest Changes',
    icon: CompassIcon,
    type: 'text',
    instructions: 'Working with the Ten Tiny Changes from Week Four, inventory for yourself the ways you have changed since beginning your recovery.',
    placeholder: 'How have you changed since Week 4?',
  },
  {
    id: 'more-change',
    title: 'More Change',
    icon: LightningIcon,
    type: 'numbered-list',
    instructions: 'List five ways you will change as you continue.',
    listCount: 5,
    listLabels: ['1.', '2.', '3.', '4.', '5.'],
  },
  {
    id: 'nourish',
    title: 'Nourish',
    icon: HeartIcon,
    type: 'numbered-list',
    instructions: 'List five ways you plan to nurture yourself in the next six months: courses you will take, supplies you will allow yourself, artist\'s dates, and vacations just for you.',
    listCount: 5,
    listLabels: ['1.', '2.', '3.', '4.', '5.'],
  },
  {
    id: 'nurturing-week',
    title: 'Nurturing Week',
    icon: ClockIcon,
    type: 'numbered-list',
    instructions: 'Plan one week\'s nurturing for yourself. One concrete, loving action every single day for one week—please binge!',
    listCount: 7,
    listLabels: ['Monday:', 'Tuesday:', 'Wednesday:', 'Thursday:', 'Friday:', 'Saturday:', 'Sunday:'],
  },
  {
    id: 'mail',
    title: 'Mail',
    icon: PenIcon,
    type: 'text',
    instructions: 'Write and mail an encouraging letter to your inner artist. This sounds silly and feels very, very good to receive. Remember that your artist is a child and loves praise and encouragement and festive plans.',
    placeholder: 'Dear inner artist...',
  },
  {
    id: 'god',
    title: 'God',
    icon: SparkleIcon,
    type: 'text',
    instructions: 'Once more, reexamine your God concept. Does your belief system limit or support your creative expansion? Are you open minded about altering your concept of God?',
    placeholder: 'Reflect on your God concept and how it shapes your creative life...',
  },
  {
    id: 'synchronicity',
    title: 'Synchronicity',
    icon: GemIcon,
    type: 'numbered-list',
    instructions: 'List ten examples of personal synchronicity that support the possibility of a nurturing creative force.',
    listCount: 10,
    listLabels: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
  },
];

// ─── Week 12: Faith ──────────────────────────────────────────────────
export const week12Sections: JournalSection[] = [
  {
    id: 'fears',
    title: 'Fears',
    icon: FlameIcon,
    type: 'text',
    instructions: 'Write down any resistance, angers, and fears you have about going on from here. We all have them.',
    placeholder: 'Write your fears, resistances, and angers...',
  },
  {
    id: 'god-jar',
    title: 'God Jar',
    icon: GemIcon,
    type: 'text',
    instructions: 'Select a God jar. A jar, a box, a vase, a container. Something to put your fears, your resentments, your hopes, your dreams, your worries into. Describe what you chose.',
    placeholder: 'Describe your God jar...',
  },
  {
    id: 'use-god-jar',
    title: 'Use God Jar',
    icon: SparkleIcon,
    type: 'text',
    instructions: 'Use your God jar. Start with your fear list from above. When worried, remind yourself it\'s in the jar — "God\'s got it." Then take the next action. Write about your experience.',
    placeholder: 'Write about using your God jar...',
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
