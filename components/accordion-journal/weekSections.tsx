import React from 'react';
import type { JournalSection } from './AccordionJournalCard';

// Shared icons
const PenIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M3 12h18" />
  </svg>
);
const ClockIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);
const WalkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3" /><path d="M12 8v8M9 21l3-6 3 6M6 14h12" />
  </svg>
);
const ListIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h16M4 6h16M4 18h16" />
  </svg>
);
const TextIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const HeartIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const CheckIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const StarIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
    icon: ListIcon,
    type: 'list',
    instructions: 'The reason I can\'t really believe in a supportive God is ... List five grievances. (God can take it.)',
    listCount: 5,
    listLabels: ['Grievance 1', 'Grievance 2', 'Grievance 3', 'Grievance 4', 'Grievance 5'],
  },
  {
    id: 'desires',
    title: 'List 5 Desires',
    icon: ListIcon,
    type: 'list',
    instructions: 'If I had either faith or money I would try ... List five desires. For the next week, be alert for images of these desires. When you spot them, clip them, buy them, photograph them, draw them, collect them somehow. With these images, begin a file of dreams that speak to you. Add to it continually for the duration of the course.',
    listCount: 5,
    listLabels: ['Desire 1', 'Desire 2', 'Desire 3', 'Desire 4', 'Desire 5'],
  },
  {
    id: 'imaginary-lives',
    title: 'List 5 Imaginary Lives',
    icon: ListIcon,
    type: 'list',
    instructions: 'One more time, list five imaginary lives. Have they changed? Are you doing more parts of them? You may want to add images of these lives to your image file.',
    listCount: 5,
    listLabels: ['Life 1', 'Life 2', 'Life 3', 'Life 4', 'Life 5'],
  },
  {
    id: 'adventures',
    title: 'List 5 Adventures',
    icon: ListIcon,
    type: 'list',
    instructions: 'If I were twenty and had money ... List five adventures. Again, add images of these to your visual image file.',
    listCount: 5,
    listLabels: ['Adventure 1', 'Adventure 2', 'Adventure 3', 'Adventure 4', 'Adventure 5'],
  },
  {
    id: 'postponed-pleasures',
    title: 'List 5 Postponed Pleasures',
    icon: ListIcon,
    type: 'list',
    instructions: 'If I were sixty-five and had money ... List five postponed pleasures. And again, collect these images. This is a very potent tool.',
    listCount: 5,
    listLabels: ['Pleasure 1', 'Pleasure 2', 'Pleasure 3', 'Pleasure 4', 'Pleasure 5'],
  },
  {
    id: 'mean-to-yourself',
    title: 'List 10 Ways You Are Mean to Yourself',
    icon: ListIcon,
    type: 'numbered-list',
    instructions: 'Ten ways I am mean to myself are ... Just as making the positive explicit helps allow it into our lives, making the negative explicit helps us to exorcise it.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'items-to-own',
    title: 'List 10 Items You Want to Own',
    icon: StarIcon,
    type: 'numbered-list',
    instructions: 'Ten items I would like to own that I don\'t are ... And again, you may want to collect these images. In order to boost sales, experts in sales motivation often teach rookie salesmen to post images of what they would like to own. It works.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'favorite-creative-block',
    title: 'Favorite Creative Block',
    icon: TextIcon,
    type: 'text',
    instructions: 'Honestly, my favorite creative block is ... TV, over-reading, friends, work, rescuing others, overexercise. You name it. Whether you can draw or not, please cartoon yourself indulging in it.',
    placeholder: 'Describe your favorite creative block...',
  },
  {
    id: 'blame-for-blocked',
    title: 'Who You Blame for Being Blocked',
    icon: TextIcon,
    type: 'text',
    instructions: 'The person I blame for being blocked is ... Again, use your pages to mull on this.',
    placeholder: 'Write about who you blame for being blocked...',
  },
  {
    id: 'payoff-staying-blocked',
    title: 'Payoff for Staying Blocked',
    icon: TextIcon,
    type: 'text',
    instructions: 'My payoff for staying blocked is ... This you may want to explore in your morning pages.',
    placeholder: 'Explore your payoff for staying blocked...',
  },
];

// ─── Week 6: Abundance ───────────────────────────────────────────────
export const week6Sections: JournalSection[] = [
  artistDate(),
  artistWalk(),
  {
    id: 'luxury-list',
    title: 'Luxury List',
    icon: StarIcon,
    type: 'numbered-list',
    instructions: 'List ten items that feel luxurious to you. Circle two that you could afford or acquire this week. Luxury doesn\'t have to be expensive.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}.`),
  },
  {
    id: 'counting-exercise',
    title: 'Counting Exercise',
    icon: TextIcon,
    type: 'text',
    instructions: 'How much do you spend on creative supplies? Time? Energy? Count what you invest in creativity versus what you spend avoiding it.',
    placeholder: 'Reflect on your creative investment...',
  },
  {
    id: 'money-madness',
    title: 'Money Madness Survey',
    icon: TextIcon,
    type: 'text',
    instructions: 'What did your family believe about money? "Money is..." "Rich people are..." "Artists are..." "I could never afford..." Write your money mythology.',
    placeholder: 'Write your money beliefs...',
  },
  {
    id: 'time-money-inventory',
    title: 'Time & Money Inventory',
    icon: TextIcon,
    type: 'text',
    instructions: 'Where does your money actually go? Where does your time actually go? Is there a discrepancy between what you say you value and how you spend?',
    placeholder: 'Reflect on where your time and money go...',
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
