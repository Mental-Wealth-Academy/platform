'use client';

import React, { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useDevOnboarding } from '@/components/useDevMode';
import { Plus, TreeStructure, Star } from '@phosphor-icons/react';
import BlueDialogue, { type BlueEmotion } from '@/components/blue-dialogue/BlueDialogue';
import { scriptForWeek, WEEKLY_SEEN_KEY } from '@/components/daily-read/weeklyScripts';
import CourseFolderCard from '@/components/home/CourseFolderCard';
import type { FolderMotif } from '@/components/home/folderMotifs';
import FolderCardWrapper from '@/components/home/FolderCardWrapper';
import MeditationPlayerModal, { type MeditationTrackKey } from '@/components/meditation-player/MeditationPlayerModal';
import ProfileDashboard from '@/components/home/ProfileDashboard';
import HomeTopCard from '@/components/home/HomeTopCard';
import DailyNotes from '@/components/daily-notes/DailyNotes';
import FieldNotesSheet from '@/components/home/FieldNotesSheet';
import HomeLeaderboard from '@/components/home/HomeLeaderboard';
import KnowledgeCoverageCard from '@/components/home/KnowledgeCoverageCard';
import GuideGallery, { GuideFilterSidebar, type GuideFilterState } from '@/components/home/GuideGallery';
import FeatureTour from '@/components/feature-tour/FeatureTour';
import CtaButton from '@/components/shared/CtaButton';
import ProfessionalGuidanceModal from '@/components/guidance/ProfessionalGuidanceModal';

import type { CourseData } from '@/lib/personal-course';
import { onPersonalCourseUpdated, personalCourseUrl } from '@/lib/personal-course-sync';
import type { CourseRecord } from '@/lib/course-content-db';
import type { GuideRecord, FrontierGuide } from '@/lib/guides-db';
import { useSound } from '@/hooks/useSound';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import { getBookmarkedSlugs, onBookmarksUpdated } from '@/lib/bookmarks';
import { dailySceneBackgroundUrl } from '@/lib/scene-background';
import styles from './page.module.css';

// Same daily scene the quest board and Blue's stage show.
const sceneUrl = dailySceneBackgroundUrl();

const COURSES_INTRO_SEEN_KEY = 'mwa-courses-intro-seen';
const COURSES_DIALOGUE_DATE_KEY = 'mwa-courses-dialogue-date';

interface CourseDialogue {
  emotion: 'neutral' | 'happy' | 'confused' | 'surprised' | 'calm';
  lines: string[];
}

const FIRST_COURSES_DIALOGUE: CourseDialogue = {
  emotion: 'neutral',
  lines: [
    'I keep the Academy learning records. This page is where courses and field notes meet.',
    'Continue a course or record an observation. I remember what you finish.',
    'Completing lessons earns credits. Your progress stays with you.',
  ],
};

const DAILY_COURSES_DIALOGUES: CourseDialogue[] = [
  {
    emotion: 'calm',
    lines: [
      'One completed lesson teaches me more than five open tabs.',
      'Choose one task. Finish it, then return for the next session.',
    ],
  },
  {
    emotion: 'neutral',
    lines: [
      'Retrieval strengthens memory.',
      'Read one guide, close it, then explain the idea without looking.',
    ],
  },
  {
    emotion: 'confused',
    lines: [
      'I found several unfinished threads in the learning record.',
      'Pick one lesson small enough to complete today. Give me a clean result.',
    ],
  },
  {
    emotion: 'surprised',
    lines: [
      'A field note can turn a passing thought into evidence.',
      'Capture one pattern or anomaly before memory rewrites it.',
    ],
  },
  {
    emotion: 'calm',
    lines: [
      'A course holds a sequence of useful practice.',
      'Finish one session before opening the next thread.',
    ],
  },
  {
    emotion: 'happy',
    lines: [
      'A course is a hypothesis with a schedule.',
      'Build one when you can name what should change by the final week.',
    ],
  },
  {
    emotion: 'neutral',
    lines: [
      'Questions improve when you return to them.',
      'Choose one topic you can test, revise, and study from another angle.',
    ],
  },
];

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dialogueIndexForDate(dateKey: string): number {
  let hash = 0;
  for (const character of dateKey) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % DAILY_COURSES_DIALOGUES.length;
}



const ASK_BLUE_DIALOGUES: CourseDialogue[] = [
  {
    emotion: 'happy',
    lines: [
      'Hey! What would you like to investigate today?',
      'Ask me anything about your courses, guides, field notes, or credits.',
    ],
  },
  {
    emotion: 'neutral',
    lines: [
      'I keep the Academy learning records and guide paths.',
      'Tell me what topic you want to master next, or ask me for advice on your studies.',
    ],
  },
  {
    emotion: 'calm',
    lines: [
      'Taking a pause to reflect is where real insights happen.',
      'What question has been on your mind today?',
    ],
  },
  {
    emotion: 'confused',
    lines: [
      'Curiosity is how we build new paths through the guide map.',
      'Have you run into a concept that feels contradictory or unclear? Let’s examine it.',
    ],
  },
  {
    emotion: 'surprised',
    lines: [
      'Every honest question leaves a quiet footprint in your field notes.',
      'What are you looking to uncover?',
    ],
  },
];

interface ConnectChoice {
  label: string;
  nextNodeKey?: string;
  action?: 'chat' | 'restart';
}

interface ConnectNode {
  emotion: BlueEmotion;
  lines: string[];
  choices: [ConnectChoice, ConnectChoice];
}

const CONNECT_NODES: Record<string, ConnectNode> = {
  root: {
    emotion: 'happy',
    lines: [
      'I know everyone in the Academy! Tell me what you are navigating right now so I can introduce you to the right person. Where does your focus or energy feel drawn today?',
    ],
    choices: [
      { label: 'Navigating Stress', nextNodeKey: 'navigatingStress' },
      { label: 'Building Momentum', nextNodeKey: 'buildingMomentum' },
    ],
  },

  // Branch A: Navigating Stress
  navigatingStress: {
    emotion: 'calm',
    lines: [
      'I hear you. When things get loud or heavy inside, having the right presence makes all the difference. What kind of support feels safest right now?',
    ],
    choices: [
      { label: 'A Quiet Listener', nextNodeKey: 'quietListener' },
      { label: 'An Experienced Guide', nextNodeKey: 'experiencedGuide' },
    ],
  },
  quietListener: {
    emotion: 'calm',
    lines: [
      'Let me understand what is weighing on you. Are you carrying burnout from pressure and overwork, or feeling isolated in your personal life?',
    ],
    choices: [
      { label: 'Burnout and Pressure', nextNodeKey: 'peerBurnoutMatch' },
      { label: 'Isolation and Quiet', nextNodeKey: 'peerCompassionMatch' },
    ],
  },
  experiencedGuide: {
    emotion: 'calm',
    lines: [
      'Walking through the maze with someone who has traveled it already. What area needs the most clarity right now?',
    ],
    choices: [
      { label: 'Shadow Work and Patterns', nextNodeKey: 'shadowMentorMatch' },
      { label: 'Major Life Transition', nextNodeKey: 'transitionMentorMatch' },
    ],
  },

  // Branch B: Building Momentum
  buildingMomentum: {
    emotion: 'happy',
    lines: [
      'Ooh, momentum is wonderful! Connecting with someone on the same frequency accelerates your growth so fast. What is your main focus today?',
    ],
    choices: [
      { label: 'Daily Discipline', nextNodeKey: 'dailyDiscipline' },
      { label: 'Deep Study and Ideas', nextNodeKey: 'deepStudy' },
    ],
  },
  dailyDiscipline: {
    emotion: 'neutral',
    lines: [
      'Discipline flourishes with mutual accountability. How do you prefer to keep pace?',
    ],
    choices: [
      { label: 'Daily Habit Check-in', nextNodeKey: 'streakPartnerMatch' },
      { label: 'Structured Weekly Goals', nextNodeKey: 'accountabilityPartnerMatch' },
    ],
  },
  deepStudy: {
    emotion: 'surprised',
    lines: [
      'Deep inquiry! Do you want someone to explore concepts and philosophy with, or a co-working sprint partner?',
    ],
    choices: [
      { label: 'Ideas and Philosophy', nextNodeKey: 'intellectualPeerMatch' },
      { label: 'Silent Focus Sprints', nextNodeKey: 'focusSprintMatch' },
    ],
  },

  // Outcomes
  peerBurnoutMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Nervous System Recovery Peer Circle. I will connect you with peers who practice gentle pacing and understand sensory overload without unsolicited advice.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  peerCompassionMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Empathetic Peer Companion. An understanding fellow in the Academy who values authentic presence, mutual care, and zero judgment.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  shadowMentorMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Senior Shadow Work Guide. A fellow student who completed the 12-week integration curriculum and can hold space for your blind spots.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  transitionMentorMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Pathway and Transition Mentor. An experienced builder who navigated career pivots, boundary setting, and identity restructuring.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  streakPartnerMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Daily Cadence Partner. Someone active every single day who shares quick field notes and keeps the streak flame burning bright.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  accountabilityPartnerMatch: {
    emotion: 'happy',
    lines: [
      'Match found: High-Integrity Accountability Partner. A dedicated member committed to weekly check-ins, habit contracts, and honest retrospectives.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  intellectualPeerMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Philosophy and Systems Thinker. A curious researcher who loves exploring mental wealth frameworks, archetypes, and deep questions.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
  focusSprintMatch: {
    emotion: 'happy',
    lines: [
      'Match found: Deep Work Sprint Partner. A focused builder who pairs for 90-minute quiet study blocks with zero distraction.',
    ],
    choices: [
      { label: 'Say Hello in Chat', action: 'chat' },
      { label: 'Start Over', action: 'restart' },
    ],
  },
};

export default function HomePage() {
  const router = useRouter();
  const learnOnly = usePathname() === '/learn';
  const { ready, authenticated, getAccessToken, login } = usePrivy();
  const [personalCourse, setPersonalCourse] = useState<CourseData | null>(null);
  const [academyCourses, setAcademyCourses] = useState<CourseRecord[]>([]);
  const [guides, setGuides] = useState<GuideRecord[]>([]);
  const [guideFilters, setGuideFilters] = useState<GuideFilterState>({ educationLevels: [], goals: [] });
  const [myGuides, setMyGuides] = useState<GuideRecord[]>([]);
  const [guideProgress, setGuideProgress] = useState<{
    totalGuides: number;
    completedGuides: number;
    totalDiamondsEarned: number;
    subjects: Array<{ subject: string; total: number; completed: number }>;
    lastCompletedAt: string | null;
  } | null>(null);
  const [authorStats, setAuthorStats] = useState<{
    totalAuthored: number;
    publishedCount: number;
    totalLearnerCompletions: number;
    totalUpvotes: number;
    totalDownvotes: number;
  } | null>(null);
  const [frontierGuides, setFrontierGuides] = useState<FrontierGuide[] | null>(null);

  const [isVip, setIsVip] = useState(false);
  const [hasAngel, setHasAngel] = useState(false);
  const [fieldNotesOpen, setFieldNotesOpen] = useState(false);
  const [guidanceModalOpen, setGuidanceModalOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [notebookEntriesUnlocked, setNotebookEntriesUnlocked] = useState(false);
  // True only once the account exists AND onboarding has been finished (a
  // placeholder user_* name means the profile step is still open). Every
  // post-signup moment — Blue's daily/weekly pop-up, the first-run guide, the
  // daily-note nudge — waits on this so nothing lands mid-signup.
  const [profileComplete, setProfileComplete] = useState(false);
  const devOnboarding = useDevOnboarding();
  // Dev onboarding drives the flow without a Privy session, so it stands in for
  // a finished profile when rehearsing the post-signup moments.
  const postSignupReady = profileComplete || devOnboarding;
  const [bookmarkedCount, setBookmarkedCount] = useState(0);
  const [activeInsightSlide, setActiveInsightSlide] = useState<0 | 1>(0);
  const [meditationModalOpen, setMeditationModalOpen] = useState(false);
  const [meditationTrackKey, setMeditationTrackKey] = useState<MeditationTrackKey>('twenty-minute-reset');

  const handleOpenMeditation = useCallback((trackKey: MeditationTrackKey = 'twenty-minute-reset') => {
    setMeditationTrackKey(trackKey);
    setMeditationModalOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    setBookmarkedCount(getBookmarkedSlugs().length);
    return onBookmarksUpdated(() => {
      setBookmarkedCount(getBookmarkedSlugs().length);
    });
  }, []);
  const [introOpen, setIntroOpen] = useState(false);
  const [askBlueOpen, setAskBlueOpen] = useState(false);
  const [connectNodeKey, setConnectNodeKey] = useState('root');
  const [courseDialogue, setCourseDialogue] = useState<CourseDialogue>(
    FIRST_COURSES_DIALOGUE,
  );
  const [weeklyWeek, setWeeklyWeek] = useState(0);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [weeklyLines, setWeeklyLines] = useState<string[] | null>(null);
  const { play } = useSound();

  const currentConnectNode = CONNECT_NODES[connectNodeKey] ?? CONNECT_NODES.root;

  const connectChoices = useMemo(() => {
    return currentConnectNode.choices.map((c) => ({
      label: c.label,
      onSelect: () => {
        play('click');
        if (c.action === 'chat') {
          setAskBlueOpen(false);
          router.push('/chat');
        } else if (c.action === 'restart' || c.nextNodeKey === 'root') {
          setConnectNodeKey('root');
        } else if (c.nextNodeKey) {
          setConnectNodeKey(c.nextNodeKey);
        }
      },
    }));
  }, [currentConnectNode, play, router]);

  // One Blue moment per day, by priority: first-run intro, then the season
  // week's intro/check-in (once per week, centered pop-up), then the daily
  // line. The weekly check-in lives here because field notes do.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!postSignupReady) return;

    const today = localDateKey();
    if (getStorageItem(COURSES_DIALOGUE_DATE_KEY) === today) return;

    const hasSeenIntro = getStorageItem(COURSES_INTRO_SEEN_KEY) === 'true';
    let cancelled = false;
    let timer: number | undefined;

    const openDaily = () => {
      const dialogue = hasSeenIntro
        ? DAILY_COURSES_DIALOGUES[dialogueIndexForDate(today)]
        : FIRST_COURSES_DIALOGUE;

      setCourseDialogue(dialogue);
      setStorageItem(COURSES_DIALOGUE_DATE_KEY, today);
      if (!hasSeenIntro) setStorageItem(COURSES_INTRO_SEEN_KEY, 'true');
      timer = window.setTimeout(() => setIntroOpen(true), 500);
    };

    // A brand-new member gets the first-run intro; the weekly check-in waits
    // for a later visit so two big moments never land at once.
    if (!hasSeenIntro) {
      const introPending = getStorageItem('mwa-home-intro-pending') === '1';
      if (!introPending) {
        openDaily();
      } else {
        setStorageItem(COURSES_INTRO_SEEN_KEY, 'true');
        setStorageItem(COURSES_DIALOGUE_DATE_KEY, today);
      }
      return () => {
        if (timer) window.clearTimeout(timer);
      };
    }

    fetch('/api/season', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const week = Number(data?.currentWeek ?? 0);
        const weeklyDue =
          Number.isFinite(week) &&
          week > 0 &&
          getStorageItem(WEEKLY_SEEN_KEY) !== String(week);
        if (weeklyDue) {
          setWeeklyWeek(week);
          setStorageItem(COURSES_DIALOGUE_DATE_KEY, today);
          // Mark daily spotlight so the user is not double-prompted after the weekly check-in
          setStorageItem(`mwa-daily-spotlight-shown-${today}`, '1');
          // Ask Blue for lines personalized from her memory of this learner,
          // but never hold the moment hostage: after 3.5s the canonical
          // script opens as-is.
          const personalized = fetch(`/api/blue/dialogue?week=${week}`, { cache: 'no-store', credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((d) => (Array.isArray(d?.lines) && d.lines.length >= 2 ? (d.lines as string[]) : null))
            .catch(() => null);
          const deadline = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 3500));
          Promise.race([personalized, deadline]).then((lines) => {
            if (cancelled) return;
            if (lines) setWeeklyLines(lines);
            timer = window.setTimeout(() => setWeeklyOpen(true), 500);
          });
        } else {
          // Normal daily visit: FeatureTour's minimalist Field Notes card handles the daily check-in
          setStorageItem(COURSES_DIALOGUE_DATE_KEY, today);
        }
      })
      .catch(() => {
        if (!cancelled) setStorageItem(COURSES_DIALOGUE_DATE_KEY, today);
      });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [postSignupReady]);

  const handleIntroClose = () => {
    setIntroOpen(false);
  };

  const handleWeeklyClose = () => {
    setStorageItem(WEEKLY_SEEN_KEY, String(weeklyWeek));
    setWeeklyOpen(false);
  };

  const weeklyScript = weeklyWeek > 0 ? scriptForWeek(weeklyWeek) : null;

  useEffect(() => {
    fetch('/api/course-content')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.courses) setAcademyCourses(d.courses);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!learnOnly) return;
    fetch('/api/guides?status=published')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.guides) setGuides(d.guides);
      })
      .catch(() => {});
  }, [learnOnly]);

  // Fetched in both views: the learn view's header counts and the dashboard's
  // knowledge coverage chart read the same stats.
  useEffect(() => {
    if (!ready || !authenticated) return;
    (async () => {
      try {
        const token = await getAccessToken();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/guides/progress/stats', { cache: 'no-store', headers });
        if (res.ok) setGuideProgress(await res.json());
      } catch {}
    })();
  }, [ready, authenticated, getAccessToken]);

  // Fetched in both views: the learn view's "Next unlocks" row and the
  // dashboard's Blue recommends card share this frontier.
  useEffect(() => {
    if (!ready || !authenticated) return;
    (async () => {
      try {
        const token = await getAccessToken();
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/guides/frontier', { cache: 'no-store', headers });
        if (res.ok) {
          const d = await res.json();
          setFrontierGuides(d.guides ?? []);
        }
      } catch {}
    })();
  }, [ready, authenticated, getAccessToken]);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const loadMe = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/me', { cache: 'no-store', credentials: 'include', headers });
      if (!res.ok) return;
      const data = await res.json();
      setNotebookEntriesUnlocked((data?.user?.shardCount ?? 0) >= 3_000);
      const name: string | null = data?.user?.username ?? null;
      setUserName(name && !name.startsWith('user_') ? name : null);
      setProfileComplete(!!name && !name.startsWith('user_'));
    } catch {
      setNotebookEntriesUnlocked(false);
      setUserName(null);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!ready || !authenticated) {
      setNotebookEntriesUnlocked(false);
      setProfileComplete(false);
      return;
    }
    loadMe();
  }, [ready, authenticated, loadMe]);

  // Onboarding finishing is what flips profileComplete, and it fires this event.
  useEffect(() => {
    const onProfileUpdated = () => { loadMe(); };
    window.addEventListener('profileUpdated', onProfileUpdated);
    return () => window.removeEventListener('profileUpdated', onProfileUpdated);
  }, [loadMe]);

  const loadPersonalCourse = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(personalCourseUrl(), { cache: 'no-store', headers });
      const data = await res.json().catch(() => ({}));
      const record = data?.course;
      if (record?.status === 'ready' && record?.courseData?.weeks?.length) {
        setPersonalCourse(record.courseData as CourseData);
      } else {
        setPersonalCourse(null);
      }
    } catch {
      setPersonalCourse(null);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!ready) return;
    loadPersonalCourse();
  }, [ready, loadPersonalCourse]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    fetch('/api/account/status')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        setIsVip(d?.hasVipMembershipCard ?? false);
        setHasAngel(d?.hasAcademicAngel ?? false);
      })
      .catch(() => {
        setIsVip(false);
        setHasAngel(false);
      });

  }, [ready, authenticated]);

  const loadMyGuides = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const [guidesRes, statsRes] = await Promise.all([
        fetch('/api/guides?mine=1', { cache: 'no-store', headers }),
        fetch('/api/guides/author-stats', { cache: 'no-store', headers }),
      ]);
      if (guidesRes.ok) {
        const data = await guidesRes.json();
        setMyGuides(data.guides ?? []);
      }
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setAuthorStats({
          totalAuthored: stats.totalAuthored,
          publishedCount: stats.publishedCount,
          totalLearnerCompletions: stats.totalLearnerCompletions,
          totalUpvotes: stats.totalUpvotes,
          totalDownvotes: stats.totalDownvotes,
        });
      }
    } catch { /* ignore */ }
  }, [authHeaders]);

  useEffect(() => {
    if (!learnOnly || !ready || !authenticated) return;
    loadMyGuides();
  }, [learnOnly, ready, authenticated, loadMyGuides]);

  useEffect(() => onPersonalCourseUpdated(loadPersonalCourse), [loadPersonalCourse]);

  // Blue's pick: the frontier guide unlocked most recently, so the
  // recommendation follows the learner's own momentum. Primitives (no
  // prereqs) come last as fresh entry points.
  const recommendedGuide = useMemo(() => {
    if (!frontierGuides || frontierGuides.length === 0) return null;
    return [...frontierGuides].sort((a, b) => {
      const ta = a.lastUnlockAt ? Date.parse(a.lastUnlockAt) : 0;
      const tb = b.lastUnlockAt ? Date.parse(b.lastUnlockAt) : 0;
      if (tb !== ta) return tb - ta;
      if (b.prereqCount !== a.prereqCount) return b.prereqCount - a.prereqCount;
      return a.topicTitle.localeCompare(b.topicTitle);
    })[0];
  }, [frontierGuides]);

  const recommendRunnersUp = useMemo(() => {
    if (!frontierGuides || !recommendedGuide) return [];
    return frontierGuides.filter((g) => g.id !== recommendedGuide.id).slice(0, 2);
  }, [frontierGuides, recommendedGuide]);

  // The visible reason is derived from real completions only — never invented.
  const recommendReason = (() => {
    if (!recommendedGuide) return '';
    const done = recommendedGuide.unlockedBy;
    if (done.length === 0) return 'No prerequisites. A clean place to begin.';
    if (done.length === 1) return `You finished ${done[0]}. That unlocked this.`;
    if (done.length === 2) return `You finished ${done[0]} and ${done[1]}. Together they unlocked this.`;
    return `You finished ${done[0]} and ${done.length - 1} others. Together they unlocked this.`;
  })();

  const activeCourse = useMemo(() => {
    if (personalCourse) {
      return {
        title: personalCourse.title,
        href: '/course/personal',
        kicker: `Personal track · ${personalCourse.focus}`,
        desc: `A personal 4-week track built around ${personalCourse.focus.toLowerCase()} — weekly reading and reflection tuned to your goal.`,
      };
    }
    if (recommendedGuide) {
      return {
        title: recommendedGuide.topicTitle,
        href: `/learn/guides/${recommendedGuide.slug}`,
        kicker: `${recommendedGuide.estimatedMinutes ?? 5} min · Recommended guide`,
        desc: recommendedGuide.summary || 'Continue your knowledge path with the next unlocked guide curated by Blue.',
      };
    }
    return {
      title: "Blue's Quest",
      href: '/shadow-work',
      kicker: '12 sessions · Shadow Work',
      desc: 'Explore the 12-week path through self-knowledge, shadows, and reflection with Blue.',
    };
  }, [personalCourse, recommendedGuide]);

  return (
    <div
      className={`${styles.layout} ${learnOnly ? styles.learnLayout : ''}`}
      style={{ '--page-scene': `url(${sceneUrl})` } as CSSProperties}
    >
      <div className={styles.scene} aria-hidden="true" />
      <main className={styles.pageColumns}>
      {learnOnly && (
        <section className={styles.learnOverview}>
          <h1 className={styles.learnOverviewTitle}>Library</h1>
          <div className={styles.learnOverviewMetrics}>
            <span className={styles.learnOverviewStars} aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} weight="fill" />)}
            </span>
            <span>{guideProgress?.completedGuides ?? 0} guides complete</span>
            <span className={styles.learnOverviewCredits}>
              <Image src="/icons/ui-diamond.svg" alt="" width={16} height={16} />
              {guideProgress?.totalDiamondsEarned ?? 0} credits
            </span>
            <CtaButton href="#learn-reviews" variant="secondary" size="sm" className={styles.learnReviewsButton}>
              See reviews
            </CtaButton>
          </div>
          <div id="learn-reviews" className={styles.learnOverviewRating}>
            <span>5 out of 5 stars based on 2,421 reviews by</span>
            <Image src="/blue/blue-home.png" alt="Blue" width={18} height={18} className={styles.learnOverviewBlue} />
            <span>Blue</span>
          </div>
          <div className={styles.learnOverviewBody}>
            <p className={styles.learnOverviewCopy}>
              Browse or filter through the guides below to find one you want to use. See for yourself why academics choose Mental Wealth Academy.
            </p>
            {!authenticated && (
              <aside className={styles.learnAccountCard}>
                <TreeStructure size={88} weight="thin" className={styles.learnAccountMark} aria-hidden="true" />
                <p className={styles.learnAccountTitle}>Easily Become a Master</p>
                <p className={styles.learnAccountCopy}>Read short, fun guides by amazing humans.</p>
                <CtaButton variant="secondary" size="sm" block className={styles.learnAccountCta} onClick={() => login()}>
                  Get Started
                </CtaButton>
              </aside>
            )}
          </div>
        </section>
      )}
      <div className={styles.globalPanel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitleJa}>知識</span>
        <span className={styles.panelTitle}>{learnOnly ? 'Learn anything' : 'Academy'}</span>
      </div>
      {!learnOnly && (
      <section className={styles.dashboardHeader}>
        <div data-tour="home-profile" className={styles.topCardWrapper}>
          <HomeTopCard />
          <CtaButton
            variant="ghost"
            block
            size="md"
            className={styles.askBlueBtn}
            onClick={() => {
              play('click');
              setConnectNodeKey('root');
              setAskBlueOpen(true);
            }}
            aria-label="Blue Intelligence"
          >
            <span className={styles.askBlueContent}>
              <span className={styles.askBlueLeft}>
                <Image
                  src="/images/blue-guide-sprites/breathing-idle.gif"
                  alt="Blue daemon"
                  width={24}
                  height={24}
                  className={styles.askBlueGif}
                  unoptimized
                />
                <span className={styles.askBlueLabel}>Blue Intelligence</span>
              </span>
            </span>
          </CtaButton>

          <button
            type="button"
            className={styles.guidanceCard}
            onClick={() => {
              play('click');
              setGuidanceModalOpen(true);
            }}
            aria-label="Professional Guidance"
          >
            <div className={styles.guidanceBannerWrap} aria-hidden="true">
              <Image
                src="/images/blue-cards/therapy-chat.jpg"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 500px"
                className={styles.guidanceBannerImg}
                priority
              />
              <div className={styles.guidanceBannerScrim} />
            </div>
            <div className={styles.guidanceCardContent}>
              <div className={styles.guidanceBadgeRow}>
                <span className={styles.guidanceBadge}>
                  <Image
                    src="/icons/professional-guidance.png"
                    alt=""
                    width={16}
                    height={16}
                    className={styles.guidanceBadgeIcon}
                  />
                  <span>Advisory</span>
                </span>
              </div>
              <h3 className={styles.guidanceCardTitle}>Professional Guidance</h3>
              <p className={styles.guidanceCardDesc}>
                1-on-1 private advisory with licensed practitioners.
              </p>
              <div className={styles.guidanceCtaRow}>
                <span className={styles.guidanceCtaPill}>
                  <span>Book Consultation</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        </div>
        <div className={styles.desktopLeaderboard}>
          <HomeLeaderboard />
        </div>
        <div className={styles.dailyNotes}>
          <DailyNotes enablePersistence={authenticated && ready} compact compactLabel="Field Notes" />
        </div>
      </section>
      )}
      {!learnOnly && (
        <div className={styles.folderSection} data-tour="home-courses">
        <FolderCardWrapper
          tabs={[
            {
              label: 'My Tools',
              content: (
                <section className={styles.folderRow} aria-label="Tool folders">
                  <CourseFolderCard
                    title="Blue's Quest"
                    href="/shadow-work"
                    avatarSrc="/archetypes/sage.png"
                    centerLabel="Creativity"
                    ctaLabel="Continue Course"
                    color="violet"
                    motif="orbit"
                  />
                  <CourseFolderCard
                    title="Wellness Meditation Track"
                    avatarSrc="/meditation/wellness-track.jpg"
                    centerLabel="Wellness Meditation"
                    ctaLabel="Start Meditation"
                    onOpen={() => handleOpenMeditation('twenty-minute-reset')}
                    color="blue"
                    motif="waveform"
                  />
                  <CourseFolderCard
                    title="Somatic Reset"
                    href="/learn/guides/attention-basics"
                    avatarSrc="/archetypes/anchor.png"
                    centerLabel="Somatic Reset"
                    ctaLabel="Begin Practice"
                    color="teal"
                    motif="lattice"
                  />
                </section>
              ),
            },
            {
              label: 'Meditate',
              content: (
                <section className={styles.folderRow} aria-label="Meditation folders">
                  <CourseFolderCard
                    title="20-Minute Reset"
                    centerLabel="20-Minute Reset"
                    ctaLabel="Play Meditation"
                    avatarSrc="/meditation/wellness-track.jpg"
                    onOpen={() => handleOpenMeditation('twenty-minute-reset')}
                    color="violet"
                    motif="waveform"
                  />
                  <CourseFolderCard
                    title="Ocean 432Hz Soundscape"
                    centerLabel="Ocean 432Hz"
                    ctaLabel="Play Soundscape"
                    avatarSrc="/archetypes/blue_daemon.png"
                    onOpen={() => handleOpenMeditation('meditation-ocean-432hz')}
                    color="blue"
                    motif="beam"
                  />
                  <CourseFolderCard
                    title="Serene Mind"
                    centerLabel="Serene Mind"
                    ctaLabel="Start Meditation"
                    avatarSrc="/meditation/serene-mind.jpg"
                    onOpen={() => handleOpenMeditation('twenty-minute-reset')}
                    color="teal"
                    motif="spiral"
                  />
                </section>
              ),
            },
            {
              label: 'Yoga',
              content: (
                <section className={styles.folderRow} aria-label="Yoga flow folders">
                  <CourseFolderCard
                    title="Morning Flow"
                    centerLabel="Morning Flow"
                    ctaLabel="Start Flow"
                    avatarSrc="/images/yoga/blue-morning-flow.png"
                    href="/learn/guides/morning-flow"
                    color="violet"
                    motif="lattice"
                  />
                  <CourseFolderCard
                    title="Somatic Release"
                    centerLabel="Somatic Release"
                    ctaLabel="Begin Practice"
                    avatarSrc="/images/yoga/blue-somatic-release.png"
                    href="/learn/guides/somatic-release"
                    color="blue"
                    motif="bloom"
                  />
                  <CourseFolderCard
                    title="Breath & Posture"
                    centerLabel="Breath & Posture"
                    ctaLabel="View Guide"
                    avatarSrc="/images/yoga/blue-breath-posture.png"
                    href="/learn/guides/breath-and-posture"
                    color="teal"
                    motif="bars"
                  />
                </section>
              ),
            },
          ]}
        />
        </div>
      )}
      {!learnOnly && academyCourses.length > 0 && (
        <div className={styles.main}>

        {academyCourses.length > 0 && (
          <section className={styles.authoredSection}>
            <h2 className={styles.authoredHeading}>Academy courses</h2>
            <div className={styles.authoredList}>
              {academyCourses.map((c) => (
                <Link key={c.id} href={`/course/${c.slug}`} className={`${styles.authoredCard} ${styles.courseLink}`}>
                  <div className={styles.authoredBody}>
                    <span className={styles.authoredTitle}>{c.title}</span>
                    {c.tokenGate && (
                      <span className={styles.angelTag}>Academic Angels</span>
                    )}
                    {c.estimatedWeeks && (
                      <span className={styles.authoredSlug}>{c.estimatedWeeks} weeks</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        </div>
      )}

        {learnOnly && (guides.length > 0 || (authenticated && (isVip || myGuides.length > 0))) && (
          <div className={styles.main}>
            <div className={styles.guideSectionContent}>
              <GuideGallery guides={guides} filters={guideFilters} />

              {authenticated && frontierGuides && frontierGuides.length > 0 && (
                <div className={styles.guideSubjectGroup}>
                  <span className={styles.guideSubjectLabel}>
                    {(guideProgress?.completedGuides ?? 0) === 0 ? 'Start here' : 'Next unlocks'}
                  </span>
                  <div className={styles.guideCardList}>
                    {frontierGuides.slice(0, 6).map((g) => (
                      <Link
                        key={`frontier-${g.id}`}
                        href={`/learn/guides/${g.slug}`}
                        className={styles.guideCard}
                        onMouseEnter={() => play('soft-hover')}
                      >
                        <div className={styles.guideCardBody}>
                          <span className={styles.guideCardTitle}>{g.topicTitle}</span>
                        </div>
                        <span className={styles.guideCardChevron} aria-hidden="true">›</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {authenticated &&
                frontierGuides &&
                frontierGuides.length === 0 &&
                guideProgress &&
                guideProgress.totalGuides > 0 &&
                guideProgress.completedGuides >= guideProgress.totalGuides && (
                  <p className={styles.guideAllDoneLine}>
                    You&apos;ve completed every guide here. Nice work.
                  </p>
                )}

              {authenticated && isVip && (
                <div className={styles.guideAuthorRow}>
                  <div className={styles.guideAuthorCopy}>
                    <span className={styles.guideAuthorTitle}>Author a guide</span>
                    <span className={styles.guideAuthorHint}>
                      Write the definitive guide for a topic, then submit it for verification.
                    </span>
                  </div>
                  <Link
                    href="/course-studio/guide/new"
                    className={styles.guideAuthorBtn}
                    onMouseEnter={() => play('soft-hover')}
                  >
                    <Plus size={14} weight="bold" /> New guide
                  </Link>
                </div>
              )}

              {myGuides.length > 0 && (
                <div className={styles.guideSubjectGroup}>
                  <span className={styles.guideSubjectLabel}>Your guides in progress</span>
                  <div className={styles.guideDraftGroup}>
                    {myGuides.map((g) => (
                      <div key={`mine-${g.id}`} className={styles.guideDraftCard}>
                        <span
                          className={`${styles.guideDraftStatus} ${g.status === 'pending_verification' ? styles.guideDraftStatusPending : ''}`}
                        >
                          {g.status === 'pending_verification' ? 'In review' : 'Draft'}
                        </span>
                        <Link
                          href={`/course-studio/guide/${g.slug}`}
                          className={styles.guideCard}
                          style={{ flex: 1 }}
                          onMouseEnter={() => play('soft-hover')}
                        >
                          <div className={styles.guideCardBody}>
                            <span className={styles.guideCardTitle}>{g.topicTitle}</span>
                          </div>
                          <span className={styles.guideCardChevron} aria-hidden="true">›</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {authorStats && authorStats.totalAuthored > 0 && (
                <div className={styles.guideSubjectGroup}>
                  <span className={styles.guideSubjectLabel}>Author impact</span>
                  <div className={styles.authorStatsRow}>
                    <span className={styles.authorStat}>
                      <span className={styles.authorStatNum}>{authorStats.totalAuthored}</span>
                      <span className={styles.authorStatLabel}>authored</span>
                    </span>
                    <span className={styles.authorStatDivider} />
                    <span className={styles.authorStat}>
                      <span className={styles.authorStatNum}>{authorStats.publishedCount}</span>
                      <span className={styles.authorStatLabel}>published</span>
                    </span>
                    <span className={styles.authorStatDivider} />
                    <span className={styles.authorStat}>
                      <span className={styles.authorStatNum}>{authorStats.totalLearnerCompletions}</span>
                      <span className={styles.authorStatLabel}>learner completions</span>
                    </span>
                    {authorStats.totalUpvotes + authorStats.totalDownvotes > 0 && (
                      <>
                        <span className={styles.authorStatDivider} />
                        <span className={styles.authorStat}>
                          <span className={styles.authorStatNum}>{authorStats.totalUpvotes}</span>
                          <span className={styles.authorStatLabel}>upvotes</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.guideSectionFooter}>guides & references</div>
          </div>
        )}

      {!learnOnly && (
        <section className={styles.dashboardInsights} aria-label="Learning insights">
          <div className={styles.insightsSlideHeader}>
            <div className={styles.insightsTabs} role="tablist" aria-label="Insights tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeInsightSlide === 0}
                className={`${styles.insightTabBtn} ${activeInsightSlide === 0 ? styles.insightTabActive : ''}`}
                onClick={() => { play('click'); setActiveInsightSlide(0); }}
              >
                Recommended Guide
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeInsightSlide === 1}
                className={`${styles.insightTabBtn} ${activeInsightSlide === 1 ? styles.insightTabActive : ''}`}
                onClick={() => { play('click'); setActiveInsightSlide(1); }}
              >
                Your Progress
              </button>
            </div>
          </div>

          <div className={styles.insightsSlideContainer}>
            {activeInsightSlide === 0 ? (
              <article className={`${styles.insightCard} ${styles.recommendInsightCard}`}>
                {recommendedGuide ? (
                  <>
                    <div className={styles.recommendBannerWrap} aria-hidden="true">
                      <Image
                        src="/images/blue-cards/guide-recommendation.jpg"
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 600px"
                        className={styles.recommendBannerImg}
                        priority
                      />
                      <div className={styles.recommendBannerScrim} />
                    </div>
                    <Link
                      href={`/learn/guides/${recommendedGuide.slug}`}
                      className={styles.recommendMain}
                      onMouseEnter={() => play('soft-hover')}
                      onClick={() => play('click')}
                    >
                      <div className={styles.recommendBadgeRow}>
                        <span className={styles.recommendBadge}>
                          <Star size={13} weight="fill" className={styles.recommendBadgeIcon} />
                          <span>Recommended Guide</span>
                        </span>
                      </div>
                      <span className={styles.recommendGuideTitle}>{recommendedGuide.topicTitle}</span>
                      {recommendedGuide.summary && (
                        <span className={styles.recommendSummary}>{recommendedGuide.summary}</span>
                      )}
                      <div className={styles.recommendCtaRow}>
                        <span className={styles.recommendCtaPill}>
                          <span>
                            {recommendedGuide.estimatedMinutes
                              ? `Start this guide · ${recommendedGuide.estimatedMinutes} min`
                              : 'Start this guide'}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </Link>
                    {recommendReason && (
                      <div className={styles.recommendReason}>
                        <Image
                          src="/blue/blue-home.png"
                          alt="Blue"
                          width={30}
                          height={30}
                          className={styles.recommendAvatar}
                        />
                        <p className={styles.recommendReasonText}>{recommendReason}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className={styles.recommendEmpty}>
                    {authenticated
                      ? 'Nothing to unlock right now. Blue will chart your next step when a new guide opens.'
                      : 'Sign in and finish a guide. Blue will chart your next step here.'}
                  </p>
                )}
              </article>
            ) : (
              <KnowledgeCoverageCard
                className={`${styles.insightCard} ${styles.coverageInsightCard}`}
                titleClassName={styles.insightTitle}
                authenticated={authenticated}
                stats={guideProgress}
              />
            )}
          </div>
        </section>
      )}
      </div>
      {learnOnly && (
        <aside className={styles.learnFiltersPanel}>
          <GuideFilterSidebar filters={guideFilters} onChange={setGuideFilters} />
        </aside>
      )}
      </main>

      {!learnOnly && fieldNotesOpen && <FieldNotesSheet onClose={() => setFieldNotesOpen(false)} />}

      {!learnOnly && postSignupReady && <FeatureTour suppressed={weeklyOpen || introOpen} />}

      {!learnOnly && askBlueOpen && (
        <BlueDialogue
          open={askBlueOpen}
          placement="center"
          title="Blue Intelligence"
          lines={currentConnectNode.lines}
          emotion={currentConnectNode.emotion}
          choices={connectChoices}
          disableAutoClose
          onClose={() => setAskBlueOpen(false)}
        />
      )}

      {!learnOnly && (weeklyScript ? (
        <BlueDialogue
          open={weeklyOpen}
          placement="center"
          title={weeklyScript.title}
          subtitle={weeklyScript.subtitle}
          lines={weeklyLines ?? weeklyScript.lines}
          emotion={weeklyScript.emotion}
          onClose={handleWeeklyClose}
        />
      ) : (
        <BlueDialogue
          open={introOpen}
          lines={courseDialogue.lines}
          emotion={courseDialogue.emotion}
          onClose={handleIntroClose}
        />
      ))}

      {!learnOnly && (
        <ProfessionalGuidanceModal
          isOpen={guidanceModalOpen}
          onClose={() => setGuidanceModalOpen(false)}
          defaultName={userName}
        />
      )}

      <MeditationPlayerModal
        isOpen={meditationModalOpen}
        onClose={() => setMeditationModalOpen(false)}
        initialTrack={meditationTrackKey}
      />

    </div>
  );
}
