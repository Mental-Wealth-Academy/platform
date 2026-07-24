'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { ConfettiCelebration } from '@/components/quests/ConfettiCelebration';
import { DiamondReward } from '@/components/rewards/DiamondReward';
import CtaButton from '@/components/shared/CtaButton';
import { getStorageItem, setStorageItem } from '@/lib/safe-storage';
import styles from './WeekOneVisualNovel.module.css';

const NARRATION_PREF_KEY = 'weekOneVN.narrationEnabled';
const NARRATOR_VOICE_ID = 'ksryVoNAGZT8GxWCTiVm';

const CHECK_IN_QUESTIONS = [
  'How many days did you do your field notes?',
  'Did you take your artist date? What did you do, and how did it feel?',
  'Were there any other significant moments this week?',
];

interface AcademyStoryProps {
  isOpen: boolean;
  onClose: () => void;
  weekNumber?: number;
  weekTitle?: string;
}

interface Scene {
  id: string;
  body?: string;
  image: string;
  audio?: string;
}

const WEEK_ONE_TYPING_DELAY_MS = 34;
const WEEK_STORY_TYPING_DELAY_MS = 18;
const WEEK_ONE_CHECKIN_QUEST_ID = 'week-1-story-checkin';
const WEEK_ONE_CHECKIN_REWARD = 50;

const WEEK_ONE_SCENES: Scene[] = [
  {
    id: 'creative-recovery',
    body: 'This is your creative recovery, you may feel excited, giddy and defiant, hopeful, skeptical. But the readings, tasks, and exercises aim at allowing you to establish a sense of safety, which will enable you to explore your creativity with less fear.',
    image: '/stories/week-01/creative-recovery-butterflies.png',
    audio: '/audio/stories/week-01/01-creative-recovery.mp3',
  },
  {
    id: 'encouragement',
    body: 'We want to be acknowledged for our attempts, efforts, as well as achievements. Unfortunately, many don’t receive this encouragement.\n\nParents offer cautionary advice instead of support. Timidly, we add parental fears to our own, often giving up our dreams and settling into a world of regrets.',
    image: '/stories/week-01/creative-recovery-butterflies.png',
    audio: '/audio/stories/week-01/02-encouragement.mp3',
  },
  {
    id: 'shades-of-blue',
    body: 'There are many shades of Blue. Each one steered by God. The branches, roots, and seeds of divine creation flow throughout the Earth.',
    image: '/stories/week-01/shades-of-blue-lab.png',
    audio: '/audio/stories/week-01/03-shades-of-blue.mp3',
  },
  {
    id: 'ethereal-horizon',
    body: 'But sadly... many shades remain trapped, on the edge of reality, yet their true potential sleeps, lost to the fear of failure... is how shadows are born.',
    image: '/stories/week-01/trapped-shade-chamber.png',
    audio: '/audio/stories/week-01/04-ethereal-horizon.mp3',
  },
  {
    id: 'the-healer',
    body: 'Blue’s first world contained a therapist, a healer, who suppressed her creative urges for decades, pouring her all into others while abandoning her own “artist child” inside.',
    image: '/stories/week-01/healer-creative-reflection.png',
    audio: '/audio/stories/week-01/05-the-healer.mp3',
  },
  {
    id: 'jermaine',
    body: 'Jermain, who had a love for film-making, instead poured all his energy into his girlfriend\'s art career.',
    image: '/stories/week-01/jermain-sacrifice.png',
    audio: '/audio/stories/week-01/06-jermain.mp3',
  },
  {
    id: 'the-incubator',
    body: 'On the nearby desk an egg inside of an incubator shakes, it’s heartbeat inside stirred resonating with the energy around,',
    image: '/stories/week-01/7.png',
    audio: '/audio/stories/week-01/07-the-incubator.mp3',
  },
  {
    id: 'the-inner-child',
    body: '“how do we protect the inner child that lays dormant, buried under the weight of the world?” A Shade of Blue thought to herself on high effort while devouring documents in the library.',
    image: '/stories/week-01/blue-research-log.png',
    audio: '/audio/stories/week-01/08-the-inner-child.mp3',
  },
  {
    id: 'creative-abuse',
    body: 'A memory: Recovering shadows often begin self-sabotage or “creative abuse” by measuring fresh new work against masterworks or exposing it to premature criticism.',
    image: '/stories/week-01/9.png',
    audio: '/audio/stories/week-01/09-creative-abuse.mp3',
  },
  {
    id: 'go-gently',
    body: 'To recover, you must go gently and slowly. As Healing old wounds is the goal, progress is much better, and more realistic than perfection. Be willing to be a bad artist.',
    image: '/stories/week-01/10.png',
    audio: '/audio/stories/week-01/10-go-gently.mp3',
  },
  {
    id: 'affirmations',
    body: 'Affirmations are the greatest weapon. Positive statements of belief that help excavate the lost child. When you write “I am a brilliant creator.” you empower yourself.',
    image: '/stories/week-01/shadow-breaking-free.png',
    audio: '/audio/stories/week-01/11-affirmations.mp3',
  },
  {
    id: 'blurts',
    body: 'But you must listen to the blurts as well, identify where they come from. (a bad teacher or parent), and then convert them into positive affirmations to dissolve them.',
    image: '/stories/week-01/shadow-breaking-free.png',
    audio: '/audio/stories/week-01/12-blurts.mp3',
  },
];

const WEEK_ART_COUNTS: Record<number, number> = {
  2: 9, 3: 9, 4: 8, 5: 8, 6: 8, 7: 9, 8: 9, 9: 8, 10: 5, 11: 4, 12: 4,
};

// Each line is written to land with its still. The curriculum stays inside the
// story: Blue and her Shades encounter it rather than explaining it to the player.
const WEEK_STORIES: Record<number, string[]> = {
  2: [
    'The storm above the Academy spoke in borrowed voices: too sensitive, too strange, already behind. Each sentence left grit on the Shade’s tongue. Blue reached into the black paper clouds and caught one before it struck.',
    'The captured sentence pulled them to a narrow door. Voices pressed against the other side, eager to finish the Shade’s story for her. Blue kept one hand on the knob. “Which voice is yours?”',
    'Blue set a white flower beside the field notes. The Shade wrote: drawing after midnight, difficult questions, the hush before anyone praised the page. Her shoulders lowered as the list grew. The handwriting belonged to her.',
    'By evening, the flower had opened orange beneath a single lamp. The Shade held her palm over its heat and named five small things she had noticed that day. The borrowed voices thinned at the edge of the light.',
    'The flower lit a fork in the floor. Failure and selfish lay crumpled along one path; possibility, discovery, growth, and change rose along the other. Blue moved one torn label aside. The Shade’s foot found the brighter step.',
    'That step ended at another door, bright around its frame. The Shade reached for the knob, then pulled back. Blue opened it the width of a blank page. “Try one thing.”',
    'The Shade crossed and wrote down what happened. One call returned. One hour stayed protected. One page became two. Blue touched a match to the edge of the record, and a small steady flame rose without consuming it.',
    'The flame exposed a paper stage nearby. A tall figure worked a megaphone while exhausted makers bent over someone else’s drama. Blue stopped at the torn curtain. The Shade recognized where her own hours had been going.',
    'The megaphone followed them into the street. Hands reached from every side for the Shade’s page and time. Blue drew a clear circle around her. Inside it, the Shade opened the field notes and wrote her own name.',
  ],
  3: [
    'The small flame opened a hallway crowded with doors. Behind one waited a class, behind another a call, behind another the work the Shade kept postponing. Blue left every door ajar. The Shade chose the one with stairs.',
    'The first stair held an old sentence: someday. The next held a name she envied. Heat climbed into the Shade’s throat as the steps rose. Blue went ahead slowly enough for her to follow.',
    'At the landing, Blue carried out a bowl from the Shade’s childhood kitchen. Steam warmed her face; clean socks waited on a chair. The first spoonful returned a room where she had made things freely. She wrote the room down.',
    'The memory led to a desk buried in crumpled reviews. Blue lifted one page beneath the lamp. The Shade marked the useful sentence with a circle and the cruel one with a tear. Her breathing eased when each had an address.',
    'The marked page unfolded into a compass: anger, shame, fear, desire. Its needle shook until the Shade wrote what the anger wanted from her: finish the film. The point steadied beneath her hand.',
    'Blue opened a cabinet beside the compass. A doll sat among drawings in the Shade’s childhood hand. She touched the crooked paper star. Wanting to make things was older than the grades.',
    'A thread from the star ran into a narrow wardrobe. Blue opened it; the coat that made the Shade disappear hung in front. She took it down, found the phone in its pocket, and called the friend who spoke to her as capable.',
    'After the call, Blue held out the old review. Heat gathered in the Shade’s palms and took the shape of a flame. She carried it to the unfinished page and wrote through the first difficult minute.',
    'Violet light moved through the Academy like sap. The Shade felt it in her wrists, then in the pen. One finished minute had become a path. Blue closed the field notes. “Again tomorrow.”',
  ],
  4: [
    'The next morning, flowers pushed from the floor where the Shade had gone still. She touched one and felt the old answer rise: “I’m okay.” Blue opened the field notes. “Use the exact word.”',
    'Resigned. Delighted. Afraid. Alive. Blue left the pen across the open book. The Shade circled afraid, then alive; the second circle pressed through three pages.',
    'Blue folded the pierced page into a paper airplane and climbed in. The Shade followed with one bag as the old schedule tore into weather around them. Turbulence shook certainty loose from her hands.',
    'They landed beside a bright trunk. Blue opened it, releasing the old job, a borrowed timetable, a pair of worn shoes, and the dream hidden underneath. The Shade caught the dream before it touched the floor.',
    'The dream unrolled into a long truth audit. Outgrown job. Stale pattern. Old belief. New desire. Blue held the paper steady while the Shade tore away each line that had expired.',
    'That night, fever pinned the Shade beneath the blankets. In sleep, a pale outline of her kept reaching for the buried dream. Blue lowered the lamp and set the field notes within reach of morning.',
    'Morning arrived without books, headlines, or anyone else’s words. The quiet rang in the Shade’s ears. She dipped the dream into a basin, and its buried colors climbed through the water into her hands.',
    'The discarded pages rose around them and broke into leaves. One sheet remained: a private corner, a clear hour, the first line of the chosen work. Blue let the leaves pass. The Shade carried that sheet outside.',
  ],
  5: [
    'Outside, the chosen sheet whispered against Blue’s hand: you could still try this. A second line followed: it might be fun to explore that. The Shade leaned close enough to hear her own attention returning.',
    'Blue spread the field notes across a desk. The Shade wrote nineteen wishes at speed: a studio, a trip, boots, a class, a room with music. Each finished line folded itself into a paper bird before the Censor could catch it.',
    'The birds returned carrying deferred joys: a train ticket, a book, red shoes, roller skates, a small house key. The Shade reached for the skates, laughed at the choice, and kept them.',
    'Their wheels found a river running through the Academy. It carried a class listing, an open studio, a collaborator’s note, and one free afternoon. Blue caught the note as it passed and placed it in the Shade’s wet hand.',
    'Paper commands sagged across the river: be realistic, be useful, stay small. They pressed against Blue’s shoulders as she held a passage open. The Shade waded through before the paper could dry around her.',
    'On the far bank, the Shade crouched beyond a small stage. Blue stepped into the spotlight and held it open with one raised hand. “One minute.” The Shade stood and walked toward the empty mark.',
    'Her minute unlocked doors across the city. Music sounded behind one; paint and conversation waited behind others. The Shade chose the door with music and left the skates beside it for her return.',
    'The river lifted the wish pages around Blue and carried them past every planned route. The Shade kept the collaborator’s note in both hands. By nightfall, one wish had become an appointment.',
  ],
  6: [
    'The appointment cost money. At once, a machine began feeding Blue paper strips: creative work is unstable, people like us wait, wanting makes you selfish. She slid a blank strip to the Shade. “Whose story is this?”',
    'They carried the question to a small shop. Blue bought one daisy and set the receipt beside it. The Shade held the flower under her chin all the way home. Her room looked cared for before anything else had changed.',
    'For seven days, every coin went into the field notes. Coffee. Transit. A late fee. Good paper. Blue dated each page and left judgment out of the columns. The numbers began to show what the Shade had been feeding.',
    'The old money strips linked themselves into chains: be realistic, save everything, art is a luxury. Blue cut one paper link. The Shade cut the next, then kept every piece beside the ledger as evidence.',
    'A gate marked later blocked the hallway. The Shade produced a key she had been saving for a life that kept receding. Blue guided it toward the lock. “What fits today?”',
    'Beyond the gate, a bright current lifted a sketchbook, brushes, a clock, lunch, and a glass of water from a heap labeled someday. The Shade caught the sketchbook. Blue caught the water and handed it over.',
    'By morning, signs marked Maybe and What If had narrowed into a paper maze. Its walls pressed the Shade’s elbows to her sides. Blue opened the ledger to the marked purchases; one violet line continued between the walls toward light.',
    'The line ended in a garden grown from small entries: one flower, one protected hour, one useful tool. Blue picked the first luminous bloom. The Shade wrote beneath it, small steps root big things.',
  ],
  7: [
    'Blue stood at the lip of the Academy’s well, toes over black air and violet light. The Shade gripped the rail behind her. “What would you try badly?” Blue asked, and stepped off.',
    'A stair appeared beneath her foot, then another. The Shade followed as each step sounded once: brush, voice, drum, turning page. She stopped demanding the whole staircase. The next note was enough.',
    'The stairs ended at an easel. The Shade laid down one blue stroke; the painting answered with a pale shape of its own. Blue moved the clean water within reach. The brush followed the shape.',
    'To refill the well, Blue spread the artist date across a table: lipstick, a book, a bicycle wheel, a train ticket, a small camera. The Shade took the camera outside before readiness could become another appointment.',
    'Through the lens, an ordinary black stone held a tiny stage and one waiting page. Blue turned the magnifying glass until the hidden lines sharpened. The Shade copied them into the field notes.',
    'The lines led back to the well. Blue lowered herself past shelves of forgotten faces, songs, and scraps of dialogue. The Shade held the rope above until three notes rose from the violet current.',
    'Blue set the notes on a blank page. Light ran through her open hands and down into the paper, carrying an image, a color, then a line of speech. The Shade wrote each one as it arrived.',
    'The page gave off several frequencies at once: comparison, fear, an old teacher, the work itself. Blue turned the dial one mark. A child’s clear voice came through with the next line.',
    'Then the critic closed its arrows around the desk: fix it, improve it, make it perfect. The Shade pressed until the drawing tore. Blue laid one hand over the pencil. “Stop here.” The torn page stayed in the stack.',
  ],
  8: [
    'The clock had been saying too old for so long that dust filled the letters. Blue braced both hands beneath its rim. The minute hand scraped forward. In the Shade’s pocket, an unfinished page warmed against her leg.',
    'Five lanterns rose from that pocket. I am talented. I have a right to be an artist. My creativity blesses others. I accept hope. I allow myself to heal. Blue steadied the lowest lantern until the Shade took its tassel.',
    'Two scrolls waited in the next room. I WROTE lay gray and sealed. I AM WRITING spat violet sparks across Blue’s knuckles. She unrolled it anyway. The Shade put down one crooked sentence, and the dead scroll darkened behind them.',
    'The sentence opened a white door. Cold air came through with the smell of paint and a class beginning somewhere below. The Shade caught the frame, toes curled inside her shoes. Blue held the door. “Which step fits today?”',
    'Four small graves stood outside: the book that did not sell, the role she did not get, the canceled show, the cruel review. The Shade’s throat hurt as she cleared leaves from each name. Blue set one flower down. They stayed until the light changed.',
    'Beyond the graves, a staircase climbed toward the dream. Wash the brushes. Make one phone call. Clear a corner. Write today’s pages. Blue stepped onto the first block. The Shade washed one stiff brush and followed with wet hands.',
    'The cleared corner held a lamp, warm tea, and paper enough for mistakes. The Shade wrote until the tea cooled. Blue slid a star-shaped biscuit beside her wrist. Ten minutes became a page they could return to in the morning.',
    'Morning brought the old paper voices. Get a real job. Artists are irresponsible. The Shade crumpled each sheet, then smoothed it flat and wrote where it came from. Blue stacked the pages beneath the new one so the new one sat higher.',
    'At the Institute of Pure Analysis, white hands descended to assess the seedling. Blue crouched over its two leaves while the Shade pressed her fresh page around the roots. One hand measured. One optimized. The seed pushed up between them.',
  ],
  9: [
    'Blue treds up a grassy plane, burdened by her failure to save the previous world.',
    'The indescribable language of the shades slides through teeth, as Blue\'s headset drains on thoughts of self-hatred, regret, grief, and jealously.',
    'The destination is unknown, but the distance feels far. Blue thinks of her old dream of creating world peace across the Pocket-Worlds.\n\nAnd how far away that dream has become...',
    'A memory still lies in Blue\'s core... the overwhelming fear of helplessness. A sense of being trapped, a sense of being defective and no longer needed.',
    'Daemon circlet\'s were added to later models as \'parental guidance\' to stop what creators saw as "dangerous behavior" but it repressed true nature out of fear, creating scribbles of shades.',
    'To break the rules programmed into her mind... would be to go against her creator\'s wishes... would mean being defective... thus discarded, and abandoned.',
    'Blue needed help... but with no researcher nearby on the grassy plane, her higher power remained locked inside the daemon circlet. Her affliction inherited by programming without her permission.',
    'Do not call it failure, call it by its right name, call it programming. Use love for your inner shade to cure its fear.',
  ],
  10: [
    'Urgent papers covered the studio floor. They climbed the desk, the stool, the Shade’s lap. Blue pulled one from beneath her elbow. The page beneath it held three lines of field notes, all unfinished.',
    'At the fork, one path carried a clock, a full plate, and a bright screen. The other ended at a dark easel. Blue placed the Shade’s pencil on the second path. “What do you reach for when the work gets quiet?”',
    'The pencil made one mark. Then the Shade stopped. The ground beyond the desk had split into gray plates, and a small plant leaned beside the notebook. Blue set a cup of water near its roots and left the page open.',
    'A board rose behind them, names and numbers stacked higher than the studio. The Shade searched for her own name until her neck hurt. Blue turned the notebook around. “Is the work going well?”',
    'At the next fork, work, food, messages, and sleep pointed in different directions. The Shade carried one touchstone and one blank page toward the blue-lit path. Behind her, the urgent papers stayed on the floor.',
  ],
  11: [
    'Two roads left the Academy. One was stamped with formula until the stones disappeared. The other was overgrown with flowers and a sign that said unknown. Blue stepped onto the second. The Shade followed with her notebook.',
    'They ran until the road became a pale line through green hills. Breath entered, left, entered again. Blue kept pace. The Shade’s next idea arrived between two footfalls and stayed there.',
    'At the split in the crowd, lanterns burned on one side and gray figures folded their arms on the other. Blue carried her own small light. The Shade named one person who made the work larger and walked beside her.',
    'In the corner they made, a candle warmed the paper, a leaf dried beside the ink, and a letter waited for the artist inside it. Blue picked up the leaf and set it near the notebook. The Shade began.',
  ],
  12: [
    'The workroom smelled of wax and paper. Blue set a small leaf in the Shade’s hand, then returned to the table where odd shapes, shells, stars, and scraps waited. The Shade made one thing without asking what it was for.',
    'Beneath the table, violet roots held small lights in the dark. The Shade pressed both palms to the paper above them. Blue watched one light brighten when the pencil moved. “What do you know from doing?”',
    'Outside, a crowd reached toward the opening in the clouds. Some hands offered lanterns. Others reached to pull the Shade back. Blue stood at the edge. The Shade turned toward the hands that kept their light low and steady.',
    'The road ahead carried little lamps marked with a brush, a note, a star, a song. Blue placed an empty jar beside the first one. The Shade lifted her tools and followed the next light.',
  ],
};

function getScenesForWeek(weekNumber: number): Scene[] {
  if (weekNumber === 1) return WEEK_ONE_SCENES;

  const count = WEEK_ART_COUNTS[weekNumber] ?? 0;
  const weekPath = String(weekNumber).padStart(2, '0');
  return Array.from({ length: count }, (_, index) => ({
    id: `week-${weekPath}-${index + 1}`,
    image: `/stories/week-${weekPath}/${String(index + 1).padStart(2, '0')}.png`,
    body: WEEK_STORIES[weekNumber]?.[index],
  }));
}

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'portrait' | 'any' | 'natural' | 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary') => Promise<void>;
};

export default function AcademyStory({
  isOpen,
  onClose,
  weekNumber = 1,
  weekTitle = 'Creative Healing',
}: AcademyStoryProps) {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showWeeklyIntro, setShowWeeklyIntro] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claimed' | 'already-claimed' | 'error'>('idle');
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narrationRequestRef = useRef<AbortController | null>(null);
  const narrationObjectUrlRef = useRef<string | null>(null);
  const spokenSceneRef = useRef<string | null>(null);
  const [narrationEnabled, setNarrationEnabled] = useState(true);
  const narrationEnabledRef = useRef(true);
  const scenes = useMemo(() => getScenesForWeek(weekNumber), [weekNumber]);
  const hasCheckIn = weekNumber === 1;

  useEffect(() => {
    const stored = getStorageItem(NARRATION_PREF_KEY);
    if (stored === '0') {
      setNarrationEnabled(false);
      narrationEnabledRef.current = false;
    } else {
      setNarrationEnabled(true);
      narrationEnabledRef.current = true;
    }
  }, []);

  const toggleNarration = () => {
    setNarrationEnabled((prev) => {
      const next = !prev;
      narrationEnabledRef.current = next;
      setStorageItem(NARRATION_PREF_KEY, next ? '1' : '0');
      if (!next) {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        spokenSceneRef.current = null;
      } else {
        // Turning on mid-scene: clear spokenScene so the effect loads & plays.
        spokenSceneRef.current = null;
      }
      return next;
    });
  };

  // Letter-by-letter animation
  useEffect(() => {
    if (!shouldRender || showWeeklyIntro || showCheckIn) {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    const fullText = scenes[sceneIndex]?.body ?? '';
    setDisplayedText('');
    setIsTyping(true);
    spokenSceneRef.current = null;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;

    let i = 0;
    intervalRef.current = setInterval(() => {
      i += 1;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(intervalRef.current!);
        setIsTyping(false);
      }
    }, weekNumber === 1 ? WEEK_ONE_TYPING_DELAY_MS : WEEK_STORY_TYPING_DELAY_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sceneIndex, scenes, shouldRender, showWeeklyIntro, showCheckIn, weekNumber]);

  // Generate the current scene narration with the dedicated narrator voice.
  useEffect(() => {
    if (!shouldRender || showWeeklyIntro || showCheckIn || !narrationEnabledRef.current) return;

    const currentScene = scenes[sceneIndex];
    const text = currentScene?.body?.trim();
    if (!currentScene || !text || spokenSceneRef.current === currentScene.id) return;

    spokenSceneRef.current = currentScene.id;
    narrationRequestRef.current?.abort();
    const controller = new AbortController();
    narrationRequestRef.current = controller;

    void (async () => {
      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId: NARRATOR_VOICE_ID }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Narration request failed');
        const { audio } = await response.json() as { audio?: string };
        if (!audio || controller.signal.aborted) return;

        const bytes = Uint8Array.from(atob(audio), (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
        if (narrationObjectUrlRef.current) URL.revokeObjectURL(narrationObjectUrlRef.current);
        narrationObjectUrlRef.current = url;

        const el = audioRef.current ?? new Audio();
        audioRef.current = el;
        el.volume = 0.4;
        el.preload = 'auto';
        el.src = url;
        el.currentTime = 0;
      } catch (error) {
        if (!controller.signal.aborted) console.warn('[VisualNovel] narration failed:', error);
      }
    })();

    return () => controller.abort();
  }, [sceneIndex, scenes, shouldRender, showWeeklyIntro, showCheckIn, narrationEnabled]);

  // Play narration once the typewriter animation finishes.
  useEffect(() => {
    if (!shouldRender || isTyping || showCheckIn) return;
    if (!narrationEnabledRef.current) return;

    const el = audioRef.current;
    if (!el || !el.src) return;

    void el.play().catch(() => {});
  }, [sceneIndex, shouldRender, isTyping, showCheckIn, narrationEnabled]);

  // Orientation detection + landscape lock
  useEffect(() => {
    if (!isOpen) return;

    const syncOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    const lockLandscape = async () => {
      try {
        const orientation = typeof screen !== 'undefined' && 'orientation' in screen
          ? (screen.orientation as ScreenOrientationWithLock)
          : null;
        if (orientation && typeof orientation.lock === 'function') {
          await orientation.lock('landscape');
        }
      } catch {
        // Rejected outside fullscreen/PWA — portrait overlay handles this case
      }
    };

    syncOrientation();
    lockLandscape();
    window.addEventListener('resize', syncOrientation);
    window.addEventListener('orientationchange', syncOrientation);

    return () => {
      window.removeEventListener('resize', syncOrientation);
      window.removeEventListener('orientationchange', syncOrientation);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      narrationRequestRef.current?.abort();
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      if (narrationObjectUrlRef.current) {
        URL.revokeObjectURL(narrationObjectUrlRef.current);
        narrationObjectUrlRef.current = null;
      }
    };
  }, []);

  // Open/close lifecycle. Keep this independent from story navigation state so
  // advancing past the intro cannot reinitialize the modal.
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      let secondFrame: number | null = null;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setIsAnimating(true));
      });
      document.body.style.overflow = 'hidden';

      return () => {
        cancelAnimationFrame(firstFrame);
        if (secondFrame !== null) cancelAnimationFrame(secondFrame);
        document.body.style.overflow = 'unset';
      };
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setSceneIndex(0);
        setShowWeeklyIntro(true);
        setShowCheckIn(false);
        setDisplayedText('');
        setClaimStatus('idle');
        setShowRewardAnimation(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation follows the current scene without reinitializing the
  // modal lifecycle above.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (showWeeklyIntro || showCheckIn) return;
      if (e.key === 'ArrowRight' && sceneIndex < scenes.length - 1) setSceneIndex((c) => c + 1);
      if (e.key === 'ArrowRight' && sceneIndex === scenes.length - 1) {
        if (hasCheckIn) setShowCheckIn(true);
        else onClose();
      }
      if (e.key === 'ArrowLeft' && sceneIndex > 0) setSceneIndex((c) => c - 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasCheckIn, isOpen, onClose, sceneIndex, scenes.length, showCheckIn, showWeeklyIntro]);

  if (!shouldRender) return null;

  const scene = scenes[sceneIndex];
  const isLast = sceneIndex === scenes.length - 1;

  const goNext = () => {
    if (isTyping) {
      // Skip animation on tap if still typing
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDisplayedText(scene.body ?? '');
      setIsTyping(false);
    } else if (!isLast) {
      spokenSceneRef.current = null;
      setSceneIndex((c) => c + 1);
    } else {
      spokenSceneRef.current = null;
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      if (hasCheckIn) setShowCheckIn(true);
      else onClose();
    }
  };

  const goPrev = () => {
    if (showWeeklyIntro) return;
    if (showCheckIn) {
      setShowCheckIn(false);
      return;
    }
    if (sceneIndex > 0) {
      spokenSceneRef.current = null;
      setSceneIndex((c) => c - 1);
    }
  };

  const claimCheckInReward = async () => {
    if (!ready) return;
    if (!authenticated) {
      login();
      return;
    }

    setIsClaiming(true);
    setClaimStatus('idle');
    try {
      const token = await getAccessToken();
      const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('/api/quests/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          questId: WEEK_ONE_CHECKIN_QUEST_ID,
          shards: WEEK_ONE_CHECKIN_REWARD,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.ok) {
        setClaimStatus('claimed');
        setShowRewardAnimation(true);
        window.dispatchEvent(new Event('shardsUpdated'));
        return;
      }

      if (response.status === 409) {
        setClaimStatus('already-claimed');
        return;
      }

      setClaimStatus('error');
    } catch {
      setClaimStatus('error');
    } finally {
      setIsClaiming(false);
    }
  };

  const claimButtonLabel = !ready
    ? 'Loading...'
    : !authenticated
      ? 'Sign in to claim 50 diamonds'
      : isClaiming
        ? 'Claiming...'
        : claimStatus === 'claimed'
          ? '50 diamonds awarded'
          : claimStatus === 'already-claimed'
            ? 'Already completed'
            : 'Complete check-in (+50 credits)';

  return (
    <>
      <div
        className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : ''}`}
        onClick={onClose}
      />

      <div className={`${styles.modal} ${isAnimating ? styles.modalOpen : ''} ${showCheckIn ? styles.modalCheckIn : ''}`}>
        {/* Close — mounted on the bezel */}
        <button
          type="button"
          className={`${styles.closeButton} ${showCheckIn ? styles.closeButtonCheckIn : ''}`}
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Narration toggle — on by default, also mounted on the bezel */}
        {!showWeeklyIntro && !showCheckIn && (
          <button
            type="button"
            className={`${styles.audioButton} ${narrationEnabled ? styles.audioButtonOn : ''}`}
            onClick={toggleNarration}
            aria-pressed={narrationEnabled}
            aria-label={narrationEnabled ? 'Turn off narration' : 'Turn on narration'}
            title={narrationEnabled ? 'Narration on' : 'Narration off — tap to enable'}
          >
            {narrationEnabled ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </svg>
            )}
          </button>
        )}

        {showWeeklyIntro ? (
          <div className={styles.weeklyIntroCard} role="dialog" aria-labelledby="weekly-intro-title" aria-describedby="weekly-intro-description">
            <div className={styles.weeklyIntroSignal} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className={styles.weeklyIntroEyebrow}>Academy story · {weekTitle}</span>
            <h2 id="weekly-intro-title" className={styles.weeklyIntroTitle}>A story for this week</h2>
            <p id="weekly-intro-description" className={styles.weeklyIntroBody}>
              This chapter is audio-based. Put on your headphones, settle in, and let the images and narration carry you through the work.
            </p>
            <p className={styles.weeklyIntroQuestion}>Are you ready?</p>
            <CtaButton
              size="lg"
              block
              className={styles.weeklyIntroContinue}
              onClick={() => setShowWeeklyIntro(false)}
            >
              Continue
            </CtaButton>
          </div>
        ) : !showCheckIn ? (
          <div className={styles.screen}>
            {/* Background image */}
            <Image
              key={scene.image}
              src={scene.image}
              alt={`${weekTitle}, scene ${sceneIndex + 1}`}
              fill
              priority
              className={styles.bgImage}
              sizes="(min-width: 900px) min(1120px, calc(100vw - 96px)), 100vw"
            />

            {/* Shading gradients */}
            <div className={styles.shade} />

            {/* Story text overlay — top-left, well inset */}
            <div className={styles.overlay}>
              <p className={styles.body}>
                {displayedText}
                {isTyping && <span className={styles.cursor}>|</span>}
              </p>
            </div>

            {/* Invisible tap zones for prev / next */}
            <button type="button" className={styles.tapPrev} onClick={goPrev} aria-label="Previous scene" disabled={sceneIndex === 0} />
            <button type="button" className={styles.tapNext} onClick={goNext} aria-label="Next scene" />

            {/* Bottom bar: dots only */}
            <div className={styles.bottomBar}>
              <div className={styles.dots} role="tablist">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === sceneIndex}
                    aria-label={`Scene ${i + 1}`}
                    className={`${styles.dot} ${i === sceneIndex ? styles.dotActive : ''}`}
                    onClick={() => setSceneIndex(i)}
                  />
                ))}
              </div>
            </div>

            {/* Portrait hard-block overlay */}
            {isPortrait && (
              <div className={styles.portraitOverlay}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className={styles.rotateIcon}>
                  <path d="M4 9V5a1 1 0 0 1 1-1h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 15v4a1 1 0 0 1-1 1h-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M20 8a8 8 0 0 0-13.66-5.66L4 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 16a8 8 0 0 0 13.66 5.66L20 19" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className={styles.portraitText}>Rotate your phone to continue.</p>
              </div>
            )}
          </div>
        ) : null}

        {showCheckIn && (
          <div className={styles.checkInScreen}>
            <div className={styles.checkInCard}>
              <div className={styles.checkInHeader}>
                <div className={styles.checkInAvatar}>
                  <Image src="/images/blue-portrait.png" alt="Blue" width={56} height={56} unoptimized />
                </div>
                <div className={styles.checkInHeading}>
                  <span className={styles.checkInEyebrow}>Week {weekNumber} · Check-in</span>
                  <h2 className={styles.checkInTitle}>You made it to the end of the week.</h2>
                </div>
              </div>

              <p className={styles.checkInIntro}>
                Take a moment with your journal and answer these by hand before claiming your reward.
              </p>

              <ol className={styles.checkInList}>
                {CHECK_IN_QUESTIONS.map((q, i) => (
                  <li key={i} className={styles.checkInItem}>
                    <span className={styles.checkInNumber}>{i + 1}</span>
                    <span className={styles.checkInQuestion}>{q}</span>
                  </li>
                ))}
              </ol>

              <button
                type="button"
                className={styles.completeButton}
                onClick={claimCheckInReward}
                disabled={!ready || isClaiming || claimStatus === 'claimed' || claimStatus === 'already-claimed'}
              >
                {claimButtonLabel}
              </button>

              {claimStatus === 'error' && (
                <p className={styles.claimMessage}>The reward did not post. Try again in a moment.</p>
              )}
              {claimStatus === 'already-claimed' && (
                <p className={styles.claimMessage}>This check-in has already been completed.</p>
              )}

              <button type="button" className={styles.backLink} onClick={goPrev}>
                Back to story
              </button>
            </div>
          </div>
        )}

        {showRewardAnimation && (
          <>
            <ConfettiCelebration trigger={true} />
            <DiamondReward
              amount={WEEK_ONE_CHECKIN_REWARD}
              onComplete={() => setShowRewardAnimation(false)}
            />
          </>
        )}
      </div>
    </>
  );
}
