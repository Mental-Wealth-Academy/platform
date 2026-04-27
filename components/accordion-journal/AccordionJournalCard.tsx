'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import styles from './AccordionJournalCard.module.css';
import { weekSectionsMap } from './weekSections';
import { useSound } from '@/hooks/useSound';
import LetterModal from './LetterModal';

const WEEK_COLORS: Record<number, string> = {
  0: '#FF6B6B',   // Intro - Red
  1: '#FF6B6B',   // Red
  2: '#FF8E53',   // Orange
  3: '#FFB347',   // Amber
  4: '#FFD93D',   // Yellow
  5: '#6BCB77',   // Green
  6: '#4ECDC4',   // Teal
  7: '#45B7D1',   // Cyan
  8: '#5168FF',   // Blue
  9: '#7C3AED',   // Violet
  10: '#A855F7',  // Purple
  11: '#D946EF',  // Magenta
  12: '#EC4899',  // Pink
  13: '#EC4899',  // End - Pink
};

interface BlurtEntry {
  id: string;
  blurt: string;
  affirmation: string;
}

interface SealAttestation {
  weekNumber: number;
  contentHash: string;
  completedActivities: string[];
  totalActivities: number;
  timestamp: number;
  attester: 'blue';
}

export interface JournalSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  type: 'text' | 'list' | 'blurts' | 'lives' | 'checklist' | 'time-map' | 'enjoy-list' | 'life-pie' | 'numbered-list' | 'affirmations';
  instructions: string;
  placeholder?: string;
  listCount?: number;
  listLabels?: string[];
  checkItems?: string[];
  startNumber?: number;
}

// Week 1 Sections
export const week1Sections: JournalSection[] = [
  {
    id: 'blurts-affirmations',
    title: 'Blurts → Affirmations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16M4 6h16M4 18h16" />
      </svg>
    ),
    type: 'blurts',
    instructions: 'This week, work with your affirmations of choice and your blurts at the end of each day\'s morning pages. Convert all negative blurts into positive affirmations. Example: "I\'m stupid" → "I\'m always learning"'
  },
  {
    id: 'artist-date',
    title: 'Artist Date',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    type: 'text',
    instructions: 'Take yourself on an artist date this week. A sample: take five dollars and go to your local five-and-dime. Buy silly things like gold stick-em stars, tiny dinosaurs, postcards, sparkly sequins, glue, kid\'s scissors, crayons. You might give yourself a gold star on your envelope each day you write. Just for fun.',
    placeholder: 'Describe your artist date plans or experience...'
  },
  {
    id: 'time-travel-enemies',
    title: 'Time Travel: Monsters',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    type: 'list',
    instructions: 'List three old enemies of your creative self-worth. Be specific. Your historic monsters are building blocks of your core negative beliefs. Then select one and write out its horror story—the room you were in, how people looked at you, what was said. It\'s cathartic to draw or trash your monster.',
    listCount: 4,
    listLabels: ['Enemy 1', 'Enemy 2', 'Enemy 3', 'Horror Story']
  },
  {
    id: 'time-travel-champions',
    title: 'Time Travel: Champions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    type: 'list',
    instructions: 'List three old champions of your creative self-worth. Be specific. Every encouraging word counts. Even if you disbelieve a compliment, record it—it may well be true. Post your favorites near where you do your morning pages.',
    listCount: 3,
    listLabels: ['Champion 1', 'Champion 2', 'Champion 3']
  },
  {
    id: 'letters',
    title: 'Letters to Self',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    type: 'list',
    instructions: 'Write two letters: (1) A letter to the editor in your defense—mail it to yourself. It\'s fun to write in the voice of your wounded artist child! (2) A thank-you letter to a long-lost mentor or to yourself.',
    listCount: 2,
    listLabels: ['Letter to the Editor (in your defense)', 'Thank You / Encouragement Letter']
  },
  {
    id: 'imaginary-lives',
    title: 'Five Imaginary Lives',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    type: 'lives',
    instructions: 'If you had five other lives to lead, what would you do? Pilot, cowhand, physicist, monk, scuba diver, belly dancer, painter... Don\'t overthink—the point is to have fun! Pick one and do something related this week.'
  },
  {
    id: 'artist-walk',
    title: 'Artist Walk',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="3" />
        <path d="M12 8v8M9 21l3-6 3 6M6 14h12" />
      </svg>
    ),
    type: 'checklist',
    instructions: 'Take your artist for a walk, the two of you. A brisk twenty-minute walk can dramatically alter consciousness.',
    checkItems: [
      'Completed 20-minute walk',
      'Walked mindfully (no phone)',
      'Noticed something new or inspiring'
    ]
  }
];

// Week 2 Sections
export const week2Sections: JournalSection[] = [
  {
    id: 'time-map',
    title: 'Time Map',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    type: 'time-map',
    instructions: 'Where does your time go? List your five major activities this week. How much time did you give to each one? Which were what you wanted to do and which were shoulds? How much of your time is spent helping others and ignoring your own desires? Create a safety map: inside the circle, place topics you need to protect and supportive people. Outside, place names of those you must be self-protective around.'
  },
  {
    id: 'enjoy-list',
    title: 'List 20 Things You Enjoy',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    type: 'enjoy-list',
    instructions: 'List twenty things you enjoy doing (rock climbing, roller-skating, baking pies, making soup, reading poetry, riding a bike, etc.). When was the last time you let yourself do these things? Next to each entry, place a date. Don\'t be surprised if it\'s been years for some of your favorites. This list is an excellent resource for artist dates.'
  },
  {
    id: 'do-two-things',
    title: 'Do Two of Your 20 Things',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    type: 'list',
    instructions: 'From your 20 things you enjoy, write down two favorite things that you\'ve avoided that could be this week\'s goals. These goals can be small: buy one roll of film and shoot it. Remember, we are trying to win you some autonomy with your time. Look for windows of time just for you, and use them in small creative acts.',
    listCount: 2,
    listLabels: ['Favorite thing 1 (what I\'ll do this week)', 'Favorite thing 2 (what I\'ll do this week)']
  },
  {
    id: 'daily-affirmations',
    title: 'Daily Affirmations',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    type: 'affirmations',
    instructions: 'Dip back into Week One and read the affirmations. Note which ones cause the most reaction. Often the one that sounds the most ridiculous is the most significant. Write three chosen affirmations five times each day in your morning pages; be sure to include the affirmations you made yourself from your blurts.'
  },
  {
    id: 'more-imaginary-lives',
    title: 'Five More Imaginary Lives',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    type: 'lives',
    instructions: 'Return to the list of imaginary lives from last week. Add five more lives. Check to see if you could be doing bits and pieces of these lives in the one you are living now. If you have listed a dancer\'s life, do you let yourself go dancing? If you have listed a monk\'s life, are you ever allowed to go on a retreat?',
    startNumber: 6
  },
  {
    id: 'life-pie',
    title: 'Draw a Life Pie',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
    type: 'life-pie',
    instructions: 'Draw a circle divided into six pieces: Spirituality, Exercise, Play, Work, Friends, and Romance/Adventure. Place a dot in each slice at the degree to which you are fulfilled (outer rim = great; inner circle = not so great). Connect the dots. This shows where you are lopsided. Even the slightest attention to impoverished areas can nurture them.'
  },
  {
    id: 'ten-tiny-changes',
    title: 'Ten Tiny Changes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
    type: 'numbered-list',
    instructions: 'List ten changes you\'d like to make for yourself, from the significant to the small ("get new sheets so I have another set, go to China, paint my kitchen, dump my bitchy friend Alice"). As the morning pages nudge us into the present, a small shift like a newly painted bathroom can yield a luxuriously large sense of self-care.',
    listCount: 10,
    listLabels: Array.from({ length: 10 }, (_, i) => `${i + 1}. I would like to`)
  },
  {
    id: 'weekly-goal',
    title: 'Make & Do a Goal',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    type: 'list',
    instructions: 'Select one small item from your Ten Tiny Changes and make it a goal for this week. Then do it!',
    listCount: 2,
    listLabels: ['My goal for this week', 'How I completed it (or my progress)']
  }
];

interface AccordionJournalCardProps {
  weekNumber?: number;
  weekTitle?: string;
  sections?: JournalSection[];
  initialIsSealed?: boolean;
  initialSealTxHash?: string | null;
  onSealComplete?: (weekNumber: number, txHash: string) => void;
  enablePersistence?: boolean;
  isLocked?: boolean;
  weekEndsAt?: string | null;
}

function useCountdown(targetDate: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!targetDate) { setTimeLeft(''); return; }
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Unlocking...'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export default function AccordionJournalCard({
  weekNumber = 1,
  weekTitle = 'Recovering a Sense of Safety',
  sections,
  initialIsSealed,
  initialSealTxHash,
  onSealComplete,
  enablePersistence = false,
  isLocked = false,
  weekEndsAt,
}: AccordionJournalCardProps) {
  // Use provided sections, weekSectionsMap, or defaults for weeks 1/2
  const journalSections = sections || weekSectionsMap[weekNumber] || (weekNumber === 2 ? week2Sections : week1Sections);

  const { play } = useSound();
  const { getAccessToken } = usePrivy();
  const [isExpanded, setIsExpanded] = useState(false);
  const [letterModal, setLetterModal] = useState<{ title: string; content: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [sectionData, setSectionData] = useState<Record<string, unknown>>({});
  const [blurtEntries, setBlurtEntries] = useState<BlurtEntry[]>([
    { id: '1', blurt: '', affirmation: '' },
    { id: '2', blurt: '', affirmation: '' },
    { id: '3', blurt: '', affirmation: '' }
  ]);
  const [checklistStates, setChecklistStates] = useState<Record<string, boolean[]>>({});
  const [enjoyListEntries, setEnjoyListEntries] = useState<{ activity: string; lastDate: string }[]>(
    Array.from({ length: 20 }, () => ({ activity: '', lastDate: '' }))
  );
  const [timeMapActivities, setTimeMapActivities] = useState<{ activity: string; time: string; wantOrShould: string; forWhom: string }[]>(
    Array.from({ length: 5 }, () => ({ activity: '', time: '', wantOrShould: '', forWhom: '' }))
  );
  const [lifePieValues, setLifePieValues] = useState<Record<string, number>>({
    spirituality: 50,
    exercise: 50,
    play: 50,
    work: 50,
    friends: 50,
    romance: 50
  });

  // Seal/Attestation state
  const [isSealed, setIsSealed] = useState(initialIsSealed ?? false);
  const [isSealing, setIsSealing] = useState(false);
  const [sealStep, setSealStep] = useState<'confirm' | 'verifying' | 'signing' | 'complete'>('confirm');
  const [showSealModal, setShowSealModal] = useState(false);
  const [sealAttestation, setSealAttestation] = useState<SealAttestation | null>(null);
  const [sealTxHash, setSealTxHash] = useState<string | null>(initialSealTxHash ?? null);

  // Save indicator state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  // Sync initialIsSealed / initialSealTxHash when props change
  useEffect(() => {
    if (initialIsSealed !== undefined) setIsSealed(initialIsSealed);
    if (initialSealTxHash !== undefined) setSealTxHash(initialSealTxHash ?? null);
  }, [initialIsSealed, initialSealTxHash]);

  // Collect all state into a single progress blob for persistence
  const collectProgressData = useCallback(() => {
    return {
      sectionData,
      blurtEntries,
      checklistStates,
      enjoyListEntries,
      timeMapActivities,
      lifePieValues,
      completedSections: Array.from(completedSections),
    };
  }, [sectionData, blurtEntries, checklistStates, enjoyListEntries, timeMapActivities, lifePieValues, completedSections]);

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  // Load progress on mount (only if authenticated)
  useEffect(() => {
    if (hasLoadedRef.current || !enablePersistence) return;
    hasLoadedRef.current = true;

    (async () => {
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch(`/api/ethereal-progress?week=${weekNumber}`, {
          credentials: 'include',
          headers: authHeaders,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.progressData || Object.keys(data.progressData).length === 0) return;

        const pd = data.progressData;
        if (pd.sectionData) setSectionData(pd.sectionData);
        if (pd.blurtEntries) setBlurtEntries(pd.blurtEntries);
        if (pd.checklistStates) setChecklistStates(pd.checklistStates);
        if (pd.enjoyListEntries) setEnjoyListEntries(pd.enjoyListEntries);
        if (pd.timeMapActivities) setTimeMapActivities(pd.timeMapActivities);
        if (pd.lifePieValues) setLifePieValues(pd.lifePieValues);
        if (pd.completedSections) setCompletedSections(new Set(pd.completedSections));
        if (data.isSealed) setIsSealed(true);
        if (data.sealTxHash) setSealTxHash(data.sealTxHash);
      } catch {
        // Server error — silent fail
      }
    })();
  }, [weekNumber, enablePersistence, getAuthHeaders]);

  // Debounced auto-save (1.5s)
  useEffect(() => {
    if (!hasLoadedRef.current || isSealed || !enablePersistence) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const authHeaders = await getAuthHeaders();
        const res = await fetch('/api/ethereal-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          credentials: 'include',
          body: JSON.stringify({
            weekNumber,
            progressData: collectProgressData(),
          }),
        });
        if (res.ok) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('idle');
        }
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sectionData, blurtEntries, checklistStates, enjoyListEntries, timeMapActivities, lifePieValues, completedSections, weekNumber, isSealed, enablePersistence, collectProgressData, getAuthHeaders]);

  // Initialize checklist states (only if not loaded from DB)
  useEffect(() => {
    setChecklistStates(prev => {
      // Don't overwrite if we already have data from DB load
      if (Object.keys(prev).length > 0) return prev;
      const initialStates: Record<string, boolean[]> = {};
      journalSections.forEach(section => {
        if (section.type === 'checklist' && section.checkItems) {
          initialStates[section.id] = new Array(section.checkItems.length).fill(false);
        }
      });
      return initialStates;
    });
  }, [journalSections]);

  const completedCount = completedSections.size;
  const totalSections = journalSections.length;
  const progressPercent = (completedCount / totalSections) * 100;

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const markComplete = (sectionId: string) => {
    setCompletedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Generate a hash of journal content (privacy-preserving)
  const generateContentHash = async (): Promise<string> => {
    const contentToHash = {
      weekNumber,
      sectionData,
      blurtEntries: blurtEntries.filter(e => e.blurt || e.affirmation),
      checklistStates,
      enjoyListEntries: enjoyListEntries.filter(e => e.activity),
      timeMapActivities: timeMapActivities.filter(a => a.activity),
      lifePieValues,
      completedSections: Array.from(completedSections),
      timestamp: Date.now()
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(contentToHash));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // Check if ready to seal (at least 50% complete)
  const canSeal = completedCount >= Math.ceil(totalSections / 2) && !isSealed;

  // Handle seal process — real API call
  const handleSealWeek = async () => {
    if (!canSeal || isSealing) return;

    setIsSealing(true);
    setSealStep('verifying');

    try {
      // Step 1: Generate content hash (for attestation display)
      const contentHash = await generateContentHash();

      await new Promise(resolve => setTimeout(resolve, 800));
      setSealStep('signing');

      // Step 2: Call API to seal (server handles on-chain tx)
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/ethereal-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          weekNumber,
          progressData: collectProgressData(),
          seal: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Seal failed');
      }

      // Step 3: Update local state
      const attestation: SealAttestation = {
        weekNumber,
        contentHash,
        completedActivities: Array.from(completedSections),
        totalActivities: totalSections,
        timestamp: Date.now(),
        attester: 'blue'
      };

      setSealAttestation(attestation);
      setSealTxHash(data.txHash);
      setSealStep('complete');
      setIsSealed(true);
      setIsExpanded(false);

      // Notify parent
      if (onSealComplete && data.txHash) {
        onSealComplete(weekNumber, data.txHash);
      }

      // Haptic feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([50, 30, 50, 30, 100]);
      }
    } catch (error) {
      console.error('Seal failed:', error);
      setSealStep('confirm');
    } finally {
      setIsSealing(false);
    }
  };

  const handleTextChange = (sectionId: string, index: number | null, value: string) => {
    setSectionData(prev => {
      if (index !== null) {
        const key = `${sectionId}-${index}`;
        return { ...prev, [key]: value };
      }
      return { ...prev, [sectionId]: value };
    });
  };

  const handleBlurtChange = (entryId: string, field: 'blurt' | 'affirmation', value: string) => {
    setBlurtEntries(prev =>
      prev.map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    );
  };

  const addBlurtEntry = () => {
    const newId = String(Date.now());
    setBlurtEntries(prev => [...prev, { id: newId, blurt: '', affirmation: '' }]);
  };

  const handleChecklistToggle = (sectionId: string, itemIndex: number) => {
    setChecklistStates(prev => {
      const current = prev[sectionId] || [];
      const updated = [...current];
      updated[itemIndex] = !updated[itemIndex];
      return { ...prev, [sectionId]: updated };
    });
  };

  const handleEnjoyListChange = (index: number, field: 'activity' | 'lastDate', value: string) => {
    setEnjoyListEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleTimeMapChange = (index: number, field: keyof typeof timeMapActivities[0], value: string) => {
    setTimeMapActivities(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleLifePieChange = (area: string, value: number) => {
    setLifePieValues(prev => ({ ...prev, [area]: value }));
  };

  const renderSectionContent = (section: JournalSection) => {
    const disabled = isSealed;

    switch (section.type) {
      case 'text':
        return (
          <textarea
            className={styles.textarea}
            placeholder={section.placeholder}
            value={(sectionData[section.id] as string) || ''}
            onChange={(e) => handleTextChange(section.id, null, e.target.value)}
            rows={4}
            disabled={disabled}
          />
        );

      case 'list':
      case 'numbered-list':
        return (
          <div className={styles.listInputs}>
            {Array.from({ length: section.listCount || 3 }).map((_, idx) => (
              <div key={idx} className={styles.listItem}>
                <label className={styles.listLabel}>
                  {section.listLabels?.[idx] || `Item ${idx + 1}`}
                </label>
                {section.listLabels?.[idx]?.includes('Horror Story') ||
                 section.listLabels?.[idx]?.includes('Letter') ||
                 section.listLabels?.[idx]?.includes('How I completed') ? (
                  <textarea
                    className={styles.textarea}
                    placeholder={`Write here...`}
                    value={(sectionData[`${section.id}-${idx}`] as string) || ''}
                    onChange={(e) => handleTextChange(section.id, idx, e.target.value)}
                    rows={4}
                    disabled={disabled}
                  />
                ) : (
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={section.type === 'numbered-list' ? '' : `Enter here...`}
                    value={(sectionData[`${section.id}-${idx}`] as string) || ''}
                    onChange={(e) => handleTextChange(section.id, idx, e.target.value)}
                    disabled={disabled}
                  />
                )}
              </div>
            ))}
          </div>
        );

      case 'blurts':
        return (
          <div className={styles.blurtsContainer}>
            <div className={styles.blurtsHeader}>
              <span className={styles.blurtColumnHeader}>Negative Blurt</span>
              <span className={styles.blurtColumnHeader}>Positive Affirmation</span>
            </div>
            {blurtEntries.map((entry) => (
              <div key={entry.id} className={styles.blurtRow}>
                <input
                  type="text"
                  className={styles.blurtInput}
                  placeholder="I'm stupid..."
                  value={entry.blurt}
                  onChange={(e) => handleBlurtChange(entry.id, 'blurt', e.target.value)}
                  disabled={disabled}
                />
                <span className={styles.blurtArrow}>→</span>
                <input
                  type="text"
                  className={styles.affirmationInput}
                  placeholder="I'm always learning"
                  value={entry.affirmation}
                  onChange={(e) => handleBlurtChange(entry.id, 'affirmation', e.target.value)}
                  disabled={disabled}
                />
              </div>
            ))}
            <button
              type="button"
              className={styles.addBlurtButton}
              onClick={addBlurtEntry}
              disabled={disabled}
            >
              + Add another blurt
            </button>
          </div>
        );

      case 'lives':
        const startNum = section.startNumber || 1;
        return (
          <div className={styles.livesContainer}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className={styles.lifeItem}>
                <span className={styles.lifeNumber}>{startNum + idx}</span>
                <input
                  type="text"
                  className={styles.lifeInput}
                  placeholder={`If I could be anything, I'd be a...`}
                  value={(sectionData[`${section.id}-${idx}`] as string) || ''}
                  onChange={(e) => handleTextChange(section.id, idx, e.target.value)}
                  disabled={disabled}
                />
              </div>
            ))}
            <div className={styles.lifeAction}>
              <label className={styles.listLabel}>This week I will try:</label>
              <textarea
                className={styles.textarea}
                placeholder="Pick one life and describe what you'll do to explore it this week..."
                value={(sectionData[`${section.id}-action`] as string) || ''}
                onChange={(e) => setSectionData(prev => ({ ...prev, [`${section.id}-action`]: e.target.value }))}
                rows={3}
                disabled={disabled}
              />
            </div>
          </div>
        );

      case 'checklist':
        return (
          <div className={styles.checklistContainer}>
            {section.checkItems?.map((item, idx) => (
              <label key={idx} className={styles.checklistItem}>
                <input
                  type="checkbox"
                  checked={checklistStates[section.id]?.[idx] || false}
                  onChange={() => handleChecklistToggle(section.id, idx)}
                  className={styles.checkbox}
                  disabled={disabled}
                />
                <span className={styles.checklistText}>{item}</span>
              </label>
            ))}
          </div>
        );

      case 'time-map':
        return (
          <div className={styles.timeMapContainer}>
            <div className={styles.timeMapTable}>
              <div className={styles.timeMapHeader}>
                <span>Activity</span>
                <span>Time</span>
                <span>Want/Should</span>
                <span>For Me/Others</span>
              </div>
              {timeMapActivities.map((activity, idx) => (
                <div key={idx} className={styles.timeMapRow}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder={`Activity ${idx + 1}`}
                    value={activity.activity}
                    onChange={(e) => handleTimeMapChange(idx, 'activity', e.target.value)}
                    disabled={disabled}
                  />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Hours"
                    value={activity.time}
                    onChange={(e) => handleTimeMapChange(idx, 'time', e.target.value)}
                    disabled={disabled}
                  />
                  <select
                    className={styles.select}
                    value={activity.wantOrShould}
                    onChange={(e) => handleTimeMapChange(idx, 'wantOrShould', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select</option>
                    <option value="want">Want to</option>
                    <option value="should">Should</option>
                  </select>
                  <select
                    className={styles.select}
                    value={activity.forWhom}
                    onChange={(e) => handleTimeMapChange(idx, 'forWhom', e.target.value)}
                    disabled={disabled}
                  >
                    <option value="">Select</option>
                    <option value="me">For me</option>
                    <option value="others">For others</option>
                  </select>
                </div>
              ))}
            </div>

            <div className={styles.safetyMapSection}>
              <h4 className={styles.subSectionTitle}>Safety Map</h4>
              <div className={styles.safetyMapInputs}>
                <div className={styles.safetyMapColumn}>
                  <label className={styles.listLabel}>Topics & People to Protect (Inside Circle)</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="Topics I need to protect, supportive people..."
                    value={(sectionData['time-map-protect'] as string) || ''}
                    onChange={(e) => setSectionData(prev => ({ ...prev, 'time-map-protect': e.target.value }))}
                    rows={3}
                    disabled={disabled}
                  />
                </div>
                <div className={styles.safetyMapColumn}>
                  <label className={styles.listLabel}>People to Be Self-Protective Around (Outside Circle)</label>
                  <textarea
                    className={styles.textarea}
                    placeholder="People I need to be cautious around right now..."
                    value={(sectionData['time-map-cautious'] as string) || ''}
                    onChange={(e) => setSectionData(prev => ({ ...prev, 'time-map-cautious': e.target.value }))}
                    rows={3}
                    disabled={disabled}
                  />
                </div>
              </div>
              <div className={styles.listItem}>
                <label className={styles.listLabel}>Doubts that were triggered this week</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Have any of your blocked friends triggered doubts in you?"
                  value={(sectionData['time-map-doubts'] as string) || ''}
                  onChange={(e) => setSectionData(prev => ({ ...prev, 'time-map-doubts': e.target.value }))}
                  rows={2}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        );

      case 'enjoy-list':
        return (
          <div className={styles.enjoyListContainer}>
            <div className={styles.enjoyListHeader}>
              <span>Thing I Enjoy</span>
              <span>Last Time I Did It</span>
            </div>
            {enjoyListEntries.map((entry, idx) => (
              <div key={idx} className={styles.enjoyListRow}>
                <span className={styles.enjoyListNumber}>{idx + 1}</span>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Something I enjoy..."
                  value={entry.activity}
                  onChange={(e) => handleEnjoyListChange(idx, 'activity', e.target.value)}
                  disabled={disabled}
                />
                <input
                  type="text"
                  className={styles.dateInput}
                  placeholder="Date"
                  value={entry.lastDate}
                  onChange={(e) => handleEnjoyListChange(idx, 'lastDate', e.target.value)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        );

      case 'affirmations':
        return (
          <div className={styles.affirmationsContainer}>
            <div className={styles.listInputs}>
              {[1, 2, 3].map((num) => (
                <div key={num} className={styles.listItem}>
                  <label className={styles.listLabel}>Chosen Affirmation {num}</label>
                  <input
                    type="text"
                    className={styles.affirmationInputGreen}
                    placeholder="I am creative and my ideas have value..."
                    value={(sectionData[`affirmation-${num}`] as string) || ''}
                    onChange={(e) => setSectionData(prev => ({ ...prev, [`affirmation-${num}`]: e.target.value }))}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
            <div className={styles.affirmationReminder}>
              <p>Write each affirmation 5 times daily in your morning pages</p>
            </div>
          </div>
        );

      case 'life-pie':
        const pieAreas = [
          { key: 'spirituality', label: 'Spirituality' },
          { key: 'exercise', label: 'Exercise' },
          { key: 'play', label: 'Play' },
          { key: 'work', label: 'Work' },
          { key: 'friends', label: 'Friends' },
          { key: 'romance', label: 'Romance/Adventure' }
        ];
        return (
          <div className={styles.lifePieContainer}>
            <p className={styles.lifePieInstructions}>
              Rate each area from 0 (inner circle, not fulfilled) to 100 (outer rim, very fulfilled):
            </p>
            <div className={styles.lifePieSliders}>
              {pieAreas.map(({ key, label }) => (
                <div key={key} className={styles.lifePieSlider}>
                  <label className={styles.lifePieLabel}>
                    <span>{label}</span>
                    <span className={styles.lifePieValue}>{lifePieValues[key]}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lifePieValues[key]}
                    onChange={(e) => handleLifePieChange(key, parseInt(e.target.value))}
                    className={styles.slider}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>
            <div className={styles.listItem}>
              <label className={styles.listLabel}>Reflection: Which areas need attention?</label>
              <textarea
                className={styles.textarea}
                placeholder="What small actions could nurture your impoverished areas?"
                value={(sectionData['life-pie-reflection'] as string) || ''}
                onChange={(e) => setSectionData(prev => ({ ...prev, 'life-pie-reflection': e.target.value }))}
                rows={3}
                disabled={disabled}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const countdown = useCountdown(weekEndsAt);

  return (
    <div
      className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''} ${isSealed ? styles.cardSealed : ''} ${isLocked ? styles.cardLocked : ''}`}
      style={{ '--week-color': WEEK_COLORS[weekNumber] || '#5168FF' } as React.CSSProperties}
    >
      {/* Card Face - Always Visible */}
      <button
        type="button"
        className={styles.cardFace}
        onClick={() => { if (isSealed || isLocked) return; play(isExpanded ? 'toggle-off' : 'toggle-on'); setIsExpanded(!isExpanded); }}
        onMouseEnter={() => play('hover')}
        aria-expanded={isExpanded}
        disabled={isSealed || isLocked}
      >
        <div className={styles.cardFaceLeft}>
          <div className={styles.cardBadgeRow}>
            <div className={`${styles.weekBadge} ${isSealed ? styles.weekBadgeSealed : ''} ${isLocked ? styles.weekBadgeLocked : ''}`}>
              {isSealed ? (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{marginRight: 4, verticalAlign: -1}}><path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor"/><path d="M3 17L12 22L21 17" fill="currentColor" fillOpacity="0.6"/><path d="M3 12L12 17L21 12" fill="currentColor" fillOpacity="0.8"/></svg>Sealed</>) : isLocked ? (<><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4, verticalAlign: -1}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Locked</>) : weekNumber === 0 ? 'Intro' : weekNumber === 13 ? 'End' : `Week ${weekNumber}`}
            </div>
            <h3 className={styles.cardTitle}>{weekTitle}</h3>
            {saveStatus !== 'idle' && !isSealed && !isLocked && (
              <span className={styles.saveIndicator}>
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            )}
            {countdown && !isSealed && !isLocked && (
              <span className={styles.countdownBadge}>{countdown}</span>
            )}
          </div>
          <div className={styles.cardTitleGroup}>
            <p className={styles.cardSubtitle}>
              {isLocked
                ? 'This week hasn\u2019t started yet'
                : isSealed
                ? 'Verified by Blue and sealed on Base'
                : ''
              }
            </p>
          </div>
        </div>

        <div className={styles.cardFaceRight}>
          {!isSealed && !isLocked && (
            <span className={styles.shardBadge} title="Earn 700 shards for sealing this week">
              <Image src="/icons/ui-shard.svg" alt="shard" width={14} height={14} />
              +700
            </span>
          )}
          {/* Progress Ring */}
          <div className={`${styles.progressRing} ${isSealed ? styles.progressRingSealed : ''}`}>
            <svg className={styles.progressSvg} viewBox="0 0 36 36">
              <path
                className={styles.progressBg}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`${styles.progressFill} ${isSealed ? styles.progressFillSealed : ''}`}
                strokeDasharray={`${isSealed ? 100 : progressPercent}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            {isSealed ? (
              <img src="/icons/ui-seal.svg" className={styles.sealedIcon} width="16" height="16" alt="shield" />
            ) : (
              <span className={styles.progressText}>{completedCount}/{totalSections}</span>
            )}
          </div>

          {/* Expand Arrow */}
          <svg
            className={`${styles.expandArrow} ${isExpanded ? styles.expandArrowRotated : ''}`}
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable Sections */}
      <div className={`${styles.sectionsContainer} ${isExpanded ? styles.sectionsVisible : ''}`}>

        <div className={styles.sectionsList}>
          {journalSections.map((section) => (
            <div
              key={section.id}
              className={`${styles.section} ${completedSections.has(section.id) ? styles.sectionCompleted : ''}`}
            >
              <button
                type="button"
                className={styles.sectionHeader}
                onClick={() => { play(expandedSections.has(section.id) ? 'toggle-off' : 'toggle-on'); toggleSection(section.id); }}
                onMouseEnter={() => play('hover')}
                aria-expanded={expandedSections.has(section.id)}
              >
                <div className={styles.sectionHeaderLeft}>
                  <div className={`${styles.sectionIcon} ${completedSections.has(section.id) ? styles.sectionIconCompleted : ''}`}>
                    {completedSections.has(section.id) ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : section.icon}
                  </div>
                  <span className={styles.sectionTitle}>{section.title}</span>
                </div>
                <svg
                  className={`${styles.sectionChevron} ${expandedSections.has(section.id) ? styles.sectionChevronRotated : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className={`${styles.sectionContent} ${expandedSections.has(section.id) ? styles.sectionContentVisible : ''}`}>
                {section.instructions && (
                  <button
                    type="button"
                    className={styles.readLetterButton}
                    onClick={() => { play('click'); setLetterModal({ title: section.title, content: section.instructions }); }}
                    onMouseEnter={() => play('hover')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Read the Letter
                  </button>
                )}

                {renderSectionContent(section)}

                <button
                  type="button"
                  className={`${styles.completeButton} ${completedSections.has(section.id) ? styles.completeButtonActive : ''}`}
                  onClick={() => { play('success'); markComplete(section.id); }}
                  onMouseEnter={() => play('hover')}
                  disabled={isSealed}
                >
                  {completedSections.has(section.id) ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
            </div>
          ))}

        </div>

        {/* Seal the Week Section */}
        <div className={styles.sealSection}>
          {isSealed ? (
            <div className={styles.sealedInfo}>
              <div className={styles.sealedBadge}>
                <img src="/icons/ui-seal.svg" width="20" height="20" alt="shield" />
                <span>Week Sealed on Base</span>
              </div>
              <p className={styles.sealedDetails}>
                Verified by Blue • {sealAttestation?.completedActivities.length}/{sealAttestation?.totalActivities} activities
              </p>
              {sealTxHash && (
                <a
                  href={`https://basescan.org/tx/${sealTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txLink}
                >
                  View attestation on Base
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          ) : (
            <>
              <div className={styles.sealPrompt}>
                <div className={styles.sealBlueIcon}>
                  <Image
                    src="https://i.imgur.com/3Y3KrnJ.png"
                    alt="Blue"
                    width={32}
                    height={32}
                    className={styles.blueImg}
                    unoptimized
                  />
                </div>
                <div className={styles.sealPromptText}>
                  <p className={styles.sealPromptTitle}>
                    {canSeal
                      ? 'Ready to seal your progress?'
                      : `Complete at least ${Math.ceil(totalSections / 2)} activities to seal`
                    }
                  </p>
                  <p className={styles.sealPromptDesc}>
                    Blue will verify and create an on-chain attestation. Earn Shard rewards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={`${styles.sealButton} ${canSeal ? styles.sealButtonActive : ''}`}
                onClick={() => { play('click'); setShowSealModal(true); }}
                onMouseEnter={() => play('hover')}
                disabled={!canSeal}
              >
                <img src="/icons/ui-seal.svg" width="18" height="18" alt="shield" />
                Seal the Week
              </button>
            </>
          )}
        </div>
      </div>

      {/* Seal Modal */}
      {showSealModal && typeof window !== 'undefined' && createPortal(
        <div className={styles.sealModalOverlay}>
          <div className={styles.sealModalBackdrop} onClick={() => !isSealing && setShowSealModal(false)} />
          <div className={styles.sealModal}>
            <div className={styles.sealModalHeader}>
              <div className={styles.sealModalBlue}>
                <Image
                  src="https://i.imgur.com/3Y3KrnJ.png"
                  alt="Blue"
                  width={48}
                  height={48}
                  className={styles.blueImgLarge}
                  unoptimized
                />
              </div>
              <h3 className={styles.sealModalTitle}>
                {sealStep === 'confirm' && 'Seal Week ' + weekNumber}
                {sealStep === 'verifying' && 'Blue is Verifying...'}
                {sealStep === 'signing' && 'Creating Attestation...'}
                {sealStep === 'complete' && 'Week Sealed!'}
              </h3>
            </div>

            <div className={styles.sealModalBody}>
              {sealStep === 'confirm' && (
                <>
                  <p className={styles.sealModalText}>
                    Blue will verify your journal entries and create an EAS attestation on Base.
                    This proves your creative work without revealing its contents.
                  </p>
                  <div className={styles.sealSummary}>
                    <div className={styles.sealSummaryItem}>
                      <span className={styles.sealSummaryLabel}>Activities Completed</span>
                      <span className={styles.sealSummaryValue}>{completedCount}/{totalSections}</span>
                    </div>
                    <div className={styles.sealSummaryItem}>
                      <span className={styles.sealSummaryLabel}>Week</span>
                      <span className={styles.sealSummaryValue}>{weekNumber}</span>
                    </div>
                    <div className={styles.sealSummaryItem}>
                      <span className={styles.sealSummaryLabel}>Reward</span>
                      <span className={styles.sealSummaryValue}>+700 Shards</span>
                    </div>
                  </div>
                </>
              )}

              {(sealStep === 'verifying' || sealStep === 'signing') && (
                <div className={styles.sealProgress}>
                  <div className={styles.sealSpinner} />
                  <div className={styles.sealSteps}>
                    <div className={`${styles.sealStepItem} ${styles.sealStepActive}`}>
                      <div className={styles.sealStepDot} />
                      <span>Hashing journal content</span>
                    </div>
                    <div className={`${styles.sealStepItem} ${sealStep === 'signing' ? styles.sealStepActive : ''}`}>
                      <div className={styles.sealStepDot} />
                      <span>Blue verification</span>
                    </div>
                    <div className={styles.sealStepItem}>
                      <div className={styles.sealStepDot} />
                      <span>Creating on-chain attestation</span>
                    </div>
                  </div>
                </div>
              )}

              {sealStep === 'complete' && (
                <div className={styles.sealComplete}>
                  <div className={styles.sealCompleteIcon}>
                    <img src="/icons/ui-seal.svg" width="48" height="48" alt="shield" />
                  </div>
                  <p className={styles.sealCompleteText}>
                    Your creative journey for Week {weekNumber} is now permanently attested on Base.
                  </p>
                  <div className={styles.sealReward}>
                    <span>+700 Shards earned</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.sealModalFooter}>
              {sealStep === 'confirm' && (
                <>
                  <button
                    type="button"
                    className={styles.sealModalCancel}
                    onClick={() => { play('click'); setShowSealModal(false); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.sealModalConfirm}
                    onClick={() => { play('celebration'); handleSealWeek(); }}
                  >
                    <img src="/icons/ui-seal.svg" width="16" height="16" alt="shield" />
                    Seal with Blue
                  </button>
                </>
              )}

              {sealStep === 'complete' && (
                <button
                  type="button"
                  className={styles.sealModalDone}
                  onClick={() => { play('success'); setShowSealModal(false); }}
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      <LetterModal
        isOpen={letterModal !== null}
        onClose={() => setLetterModal(null)}
        title={letterModal?.title ?? ''}
        content={letterModal?.content ?? ''}
      />
    </div>
  );
}
