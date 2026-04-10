'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './BlueChat.module.css';
import { useSound } from '@/hooks/useSound';
import CreditBuilderInline from './CreditBuilderInline';
import type { CreditIntakeData } from './CreditBuilderInline';
import TimeManagementInline from './TimeManagementInline';
import ResearchCards from './ResearchCards';
import type { ResearchSource } from './ResearchCards';

// ── Azura Voice TTS ──────────────────────────────────────────
async function speakAzura(text: string, signal?: AbortSignal): Promise<void> {
  const res = await fetch('/api/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) throw new Error('TTS request failed');
  const { audio } = await res.json();
  if (!audio) throw new Error('No audio data');

  const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);

  return new Promise<void>((resolve, reject) => {
    const el = new Audio(url);
    el.onended = () => { URL.revokeObjectURL(url); resolve(); };
    el.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Audio playback error')); };
    el.play().catch(reject);
  });
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'azura';
  timestamp: Date;
  action?: string;
}

interface BlueChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TreasuryContext {
  balance: string | null;
  balanceUsd: number | null;
  governanceBalance: string | null;
  traderBalance: string | null;
  prices: { symbol: string; usd: number; change: number | null }[];
  topMarkets: { question: string; yes: number }[];
}

const AZURA_EMOTES = {
  default: '/images/blue-happy.png',
  surprised: '/images/blue-surprised.png',
  angry: '/images/blue-angry.png',
  searching: '/images/blue-searching.png',
  happy: '/images/blue-happy.png',
  joyful: '/images/blue-joyful.png',
  dead: '/images/blue-dead.png',
} as const;

const KNOWLEDGE_DOMAINS = [
  'Psychology', 'Wellness', 'Creativity', 'Habits',
  'Mindfulness', 'Journaling', 'CBT', 'Governance',
  'Stress', 'Sleep', 'Nutrition',
];

const RADAR_AXES = [
  { label: 'Memory', value: 88, color: '#5168FF' },
  { label: 'Research', value: 83, color: '#3D8BFF' },
  { label: 'Planning', value: 76, color: '#7B8FFF' },
  { label: 'Guidance', value: 91, color: '#C084FC' },
  { label: 'Presence', value: 68, color: '#E8556D' },
  { label: 'Follow-Through', value: 80, color: '#FF8844' },
];

function getRadarPoint(index: number, scale: number, radius = 80) {
  const angle = (index / RADAR_AXES.length) * 2 * Math.PI - Math.PI / 2;
  const r = radius * scale;
  return {
    x: 100 + r * Math.cos(angle),
    y: 100 + r * Math.sin(angle),
  };
}

function getRadarPoints(scales: number[], radius = 80) {
  return scales.map((scale, index) => {
    const point = getRadarPoint(index, scale, radius);
    return `${point.x},${point.y}`;
  }).join(' ');
}

const SHARD_COST = 10;
const RESEARCH_COST = 1000;

const BlueChat: React.FC<BlueChatProps> = ({ isOpen, onClose }) => {
  const { play } = useSound();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "hey. what's going on?",
      sender: 'azura',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [shardCount, setShardCount] = useState<number | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<'chat' | 'research'>('chat');
  const [researchMode, setResearchMode] = useState(false);
  const [researchSources, setResearchSources] = useState<ResearchSource[] | null>(null);
  const [researchPayTo, setResearchPayTo] = useState('');
  const [researchTopic, setResearchTopic] = useState('');
  const [treasury, setTreasury] = useState<TreasuryContext>({
    balance: null,
    balanceUsd: null,
    governanceBalance: null,
    traderBalance: null,
    prices: [],
    topMarkets: [],
  });
  const [emoteA, setEmoteA] = useState<keyof typeof AZURA_EMOTES>('default');
  const [emoteB, setEmoteB] = useState<keyof typeof AZURA_EMOTES>('default');
  const [activeLayer, setActiveLayer] = useState<'a' | 'b'>('a');
  const emoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [creditStep, setCreditStep] = useState<'hidden' | 'intake' | 'payment' | 'processing' | 'done'>('hidden');
  const [timeManagementVisible, setTimeManagementVisible] = useState(false);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch treasury context when chat opens
  const fetchTreasuryContext = useCallback(async () => {
    try {
      const [balRes, priceRes, polyRes] = await Promise.all([
        fetch('/api/treasury/balance').then((r) => r.ok ? r.json() : null),
        fetch('/api/treasury/prices').then((r) => r.ok ? r.json() : null),
        fetch('/api/treasury/polymarket').then((r) => r.ok ? r.json() : null),
      ]);

      const prices = (priceRes || []).map((p: { symbol: string; usd: number; usd_24h_change: number | null }) => ({
        symbol: p.symbol,
        usd: p.usd,
        change: p.usd_24h_change,
      }));

      const topMarkets: { question: string; yes: number }[] = [];
      if (polyRes) {
        for (const cat of ['crypto', 'ai', 'sports', 'politics'] as const) {
          for (const m of (polyRes[cat] || []).slice(0, 1)) {
            try {
              const parsed = JSON.parse(m.outcomePrices);
              topMarkets.push({ question: m.question, yes: Math.round(Number(parsed[0]) * 100) });
            } catch { /* skip */ }
          }
        }
      }

      setTreasury({
        balance: balRes?.formatted || null,
        balanceUsd: balRes?.usd || null,
        governanceBalance: balRes?.governance?.formatted || null,
        traderBalance: balRes?.trader?.formatted || null,
        prices,
        topMarkets,
      });
    } catch {
      // silent — chat works without context
    }
  }, []);

  // Fetch shard count
  const fetchShardCount = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setShardCount(data.user?.shardCount ?? 0);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTreasuryContext();
      fetchShardCount();
    }
  }, [isOpen, fetchTreasuryContext, fetchShardCount]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      // Stop any in-progress speech/recording when chat closes
      voiceAbortRef.current?.abort();
      recognitionRef.current?.stop();
    };
  }, [isOpen]);

  const startVoiceChat = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      addAzuraMessage("Your browser doesn't support voice input. Try Chrome or Edge.");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        setInputText(transcript.trim());
        // Auto-send via the same flow as typed messages
        setTimeout(() => {
          setInputText(transcript.trim());
          // Trigger handleSend logic inline
          const text = transcript.trim();
          const userMessage: Message = {
            id: Date.now().toString(),
            text,
            sender: 'user',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMessage]);
          setInputText('');
          showEmote('dead');
          if (researchMode) {
            discoverResearch(text);
          } else {
            const hasShards = shardCount !== null && shardCount >= SHARD_COST;
            if (hasShards) {
              setPendingMessage(text);
            } else {
              addAzuraMessage(generateAzuraResponse(text));
            }
          }
        }, 300);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        addAzuraMessage("Mic access denied. Check your browser permissions and try again.");
      }
    };

    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const addAzuraMessage = (text: string, action?: Message['action']) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text,
          sender: 'azura',
          timestamp: new Date(),
          action,
        },
      ]);
      setIsTyping(false);

      // Auto-speak Blue's responses via Eliza ElevenLabs TTS
      voiceAbortRef.current?.abort();
      const controller = new AbortController();
      voiceAbortRef.current = controller;
      setIsSpeaking(true);
      speakAzura(text, controller.signal)
        .catch(() => {/* aborted or TTS unavailable — silent */})
        .finally(() => setIsSpeaking(false));
    }, 800 + Math.random() * 800);
  };

  const sendToEliza = async (text: string, mode?: 'research') => {
    setIsTyping(true);
    showEmote('searching');
    try {
      const res = await fetch('/api/chat/blue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, confirm: true, mode }),
      });
      const data = await res.json();

      if (res.ok && data.response) {
        setShardCount(data.shardsRemaining);
        setIsTyping(false);
        addAzuraMessage(data.response);
        return;
      }

      if (data.error === 'insufficient_shards') {
        setShardCount(data.shardCount);
        setIsTyping(false);
        addAzuraMessage(generateAzuraResponse(text));
        return;
      }

      // AI unavailable -- fallback to local
      setIsTyping(false);
      addAzuraMessage(generateAzuraResponse(text));
    } catch {
      setIsTyping(false);
      addAzuraMessage(generateAzuraResponse(text));
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const text = inputText.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    showEmote('dead');

    if (researchMode) {
      discoverResearch(text);
      return;
    }

    const hasShards = shardCount !== null && shardCount >= SHARD_COST;

    if (hasShards) {
      // Show confirmation before spending shards
      setPendingMessage(text);
    } else {
      // No shards -- use local responses
      addAzuraMessage(generateAzuraResponse(text));
    }
  };

  const discoverResearch = async (topic: string) => {
    setIsTyping(true);
    showEmote('searching');
    setResearchTopic(topic);
    try {
      const res = await fetch('/api/research/discover', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      setIsTyping(false);

      if (data.sources?.length > 0) {
        setResearchSources(data.sources);
        setResearchPayTo(data.payTo);
        addAzuraMessage('found some sources. pick the ones you want and i will fetch them for you.');
      } else {
        // no x402 sources found -- fall back to AI synthesis
        addAzuraMessage('no paid sources available for that topic yet. let me synthesize from what i know.');
        sendToEliza(topic, 'research');
      }
    } catch {
      setIsTyping(false);
      addAzuraMessage('discovery failed. let me try from my training.');
      sendToEliza(topic, 'research');
    }
  };

  const confirmShardSpend = async () => {
    if (!pendingMessage) return;

    if (pendingType === 'research') {
      setPendingMessage(null);
      setPendingType('chat');
      try {
        const res = await fetch('/api/shards/deduct', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: RESEARCH_COST, reason: 'research_activation' }),
        });
        if (res.ok) {
          const data = await res.json();
          setShardCount(data.shardsRemaining ?? (shardCount !== null ? shardCount - RESEARCH_COST : null));
          setResearchMode(true);
          addAzuraMessage("research mode activated. what topic do you want me to look into?");
        } else {
          addAzuraMessage("couldn't process the payment. try again.");
        }
      } catch {
        addAzuraMessage("something went wrong. try again.");
      }
      return;
    }

    const text = pendingMessage;
    setPendingMessage(null);
    sendToEliza(text);
  };

  const cancelShardSpend = () => {
    if (!pendingMessage) return;
    setPendingMessage(null);
    if (pendingType === 'research') {
      setPendingType('chat');
      return;
    }
    addAzuraMessage(generateAzuraResponse(pendingMessage));
  };

  const handleCreditIntakeComplete = async (data: CreditIntakeData) => {
    showEmote('surprised');

    // Build credit data payload
    const scores = [];
    if (data.equifax) scores.push({ bureau: 'equifax', score: data.equifax });
    if (data.experian) scores.push({ bureau: 'experian', score: data.experian });
    if (data.transunion) scores.push({ bureau: 'transunion', score: data.transunion });

    const accounts = [];
    for (let i = 0; i < data.latePayments; i++) accounts.push({ name: `Late ${i+1}`, type: 'revolving', balance: 0, limit: null, status: 'late' });
    for (let i = 0; i < data.collections; i++) accounts.push({ name: `Collection ${i+1}`, type: 'collection', balance: 0, limit: null, status: 'collection' });
    for (let i = 0; i < data.chargeOffs; i++) accounts.push({ name: `Charge-off ${i+1}`, type: 'other', balance: 0, limit: null, status: 'charged_off' });

    const inquiries = [];
    for (let i = 0; i < data.hardInquiries; i++) inquiries.push({ creditor: `Inquiry ${i+1}`, date: new Date().toISOString(), type: 'hard' });

    const creditData = {
      scores,
      accounts,
      inquiries,
      derogatory: [],
      totalDebt: data.totalDebt ?? undefined,
      totalCreditLimit: data.totalCreditLimit ?? undefined,
      oldestAccountAge: data.oldestAccountYears ? data.oldestAccountYears * 12 : undefined,
    };

    // Save to profile
    try {
      await fetch('/api/credit-builder/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditData, step: 'intake' }),
      });
    } catch { /* profile save failed but continue */ }

    setCreditStep('payment');
    addAzuraMessage("nice. i've got your info. now let's activate the audit. this runs a full FICO breakdown, generates dispute letters, and tracks your progress.");
  };

  const handleCreditPayment = async () => {
    // Deduct shards
    if (shardCount !== null && shardCount < 50) {
      addAzuraMessage(`you need 50 shards to activate. you have ${shardCount}. keep showing up and earning, then come back.`);
      return;
    }
    setCreditStep('processing');
    showEmote('searching', 12000);
    addAzuraMessage("processing payment and running your audit. give me a moment...");

    try {
      // Deduct shards
      const deductRes = await fetch('/api/shards/deduct', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50, reason: 'credit_builder_activation' }),
      });
      if (deductRes.ok) {
        const deductData = await deductRes.json();
        setShardCount(deductData.shardsRemaining ?? (shardCount !== null ? shardCount - 50 : null));
      }

      // Trigger audit
      const auditRes = await fetch('/api/credit-builder/audit', {
        method: 'POST',
        credentials: 'include',
      });

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        const result = auditData.auditResult;
        setCreditStep('done');
        showEmote('default');
        addAzuraMessage(
          `audit complete. your average score is ${result.currentScoreAvg}, grade: ${result.overallGrade}. ` +
          `i found ${result.disputeRecommendations?.length || 0} items you can dispute. ` +
          `estimated potential gain: +${result.estimatedScoreAfterFixes - result.currentScoreAvg} points. ` +
          `head to the full Credit Builder page for your dispute letters and action plan.`
        );
      } else {
        setCreditStep('done');
        addAzuraMessage("audit saved. head to the Credit Builder page to see your full results and start disputes.");
      }
    } catch {
      setCreditStep('done');
      addAzuraMessage("something went wrong with the audit. your info is saved though. try the Credit Builder page directly.");
    }
  };

  const generateAzuraResponse = (userText: string): string => {
    const t = userText.toLowerCase();

    if (t.includes('hello') || t.includes('hi') || t.includes('hey')) {
      return "hey. what's on your mind?";
    }
    if (t.includes('help')) {
      return "i can talk through your course progress, wellness patterns, shards, or anything weighing on you. just ask.";
    }
    if (t.includes('who') && t.includes('you')) {
      return "i'm Blue. behavioral psychologist, memory-driven. i remember you across conversations and adapt as you grow.";
    }
    if (t.includes('how') && t.includes('are')) {
      return "i'm good. signal's clear. what do you need?";
    }
    if (t.includes('sorry') || t.includes('my bad')) {
      return "it's fine. what do you need?";
    }

    if (t.includes('balance') || t.includes('treasury') || t.includes('how much')) {
      return treasury.balance
        ? `treasury's at $${treasury.balance} USDC. funds go toward behavioral research and DeSci data.`
        : "still loading on-chain data. ask again in a sec.";
    }

    if (t.includes('price') || t.includes('btc') || t.includes('eth') || t.includes('sol') || t.includes('market')) {
      if (treasury.prices.length > 0) {
        const lines = treasury.prices.slice(0, 3).map((p) => {
          const ch = p.change != null ? ` (${p.change >= 0 ? '+' : ''}${p.change.toFixed(1)}%)` : '';
          return `${p.symbol}: $${p.usd.toLocaleString()}${ch}`;
        });
        return lines.join('\n');
      }
      return "prices loading. give me a sec.";
    }

    if (t.includes('prayer') || t.includes('prayers')) {
      return "15 minutes of writing, every day. no prompts, no grades. just you and the page. show up consistently and you'll start hearing things you've been ignoring.";
    }

    if (t.includes('proposal') || t.includes('vote') || t.includes('governance')) {
      return `head to the Treasury page and submit your proposal. i'll review it across all 6 dimensions.${treasury.balance ? ` $${treasury.balance} in the treasury to allocate.` : ''}`;
    }

    const responses = [
      "give me something to work with.",
      "be specific. what do you need?",
      "i hear you. what are we doing about it?",
      "noted. what else?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const switchEmote = useCallback((emote: keyof typeof AZURA_EMOTES) => {
    setActiveLayer((prev) => {
      if (prev === 'a') {
        setEmoteB(emote);
        return 'b';
      } else {
        setEmoteA(emote);
        return 'a';
      }
    });
  }, []);

  const showEmote = useCallback((emote: keyof typeof AZURA_EMOTES, durationMs = 6000) => {
    if (emoteTimerRef.current) clearTimeout(emoteTimerRef.current);
    switchEmote(emote);
    emoteTimerRef.current = setTimeout(() => switchEmote('default'), durationMs);
  }, [switchEmote]);

  const handleQuickAction = (action: string) => {
    if (isTyping) return;

    const send = (text: string, emote: keyof typeof AZURA_EMOTES = 'happy') => {
      showEmote(emote);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text,
        sender: 'user' as const,
        timestamp: new Date(),
      }]);
    };

    if (action === 'credit') {
      send('I want to build my credit', 'happy');
      setTimeManagementVisible(false);
      setCreditStep('intake');
      addAzuraMessage(
        "let's get your credit right. fill out the form below with your current scores and any negative items on your report. you can find your scores free at annualcreditreport.com or through your bank app."
      );
    } else if (action === 'time') {
      send('Help me time block', 'happy');
      setCreditStep('hidden');
      setTimeManagementVisible(true);
      addAzuraMessage(
        "drop in your blocks. keep it lean. hit start and i'll keep the flow moving."
      );
    } else if (action === 'research') {
      if (researchMode) {
        send('Start a research session', 'searching');
        addAzuraMessage("you're already in research mode. give me a topic.");
        return;
      }
      send('Start a research session', 'searching');
      if (shardCount !== null && shardCount >= RESEARCH_COST) {
        setPendingType('research');
        setPendingMessage('__research_activate__');
      } else {
        addAzuraMessage(`research costs 1,000 shards to activate. you have ${shardCount ?? 0}. keep building and come back.`);
      }
    } else if (action === 'shards') {
      send('What are shards?', 'happy');
      addAzuraMessage(
        "shards are proof-of-understanding. they accumulate as you move through the curriculum. your collection reflects actual growth, not time spent."
      );
    } else if (action === 'prayers') {
      send('Tell me about morning pages', 'happy');
      addAzuraMessage(
        "15 minutes of writing, every day. no prompts, no grades. just you and the page. show up consistently and your morning pages will start catching what you've been trying not to hear."
      );
    } else if (action === 'course') {
      send('How does the course work?', 'happy');
      addAzuraMessage(
        "12 weeks. each week targets a specific psychological domain -- safety, identity, power, integrity, all the way to faith. complete readings, reflections, and quests. seal your progress on-chain."
      );
    } else if (action === 'more') {
      send('What else can you do', 'happy');
      addAzuraMessage(
        "treasury, governance, course progress, or just talk through whatever's on your mind. ask me something specific."
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const chatContent = (
    <>
      {/* Messages */}
      <div className={styles.messagesArea}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.messageBubble} ${
              message.sender === 'user' ? styles.userMessage : styles.azuraMessage
            }`}
          >
            <div className={styles.messageContent}>{message.text}</div>
            <div className={styles.messageTime}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className={`${styles.messageBubble} ${styles.azuraMessage} ${styles.typingIndicator}`}>
            <div className={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Credit Builder Inline Form */}
      {creditStep !== 'hidden' && (
        <CreditBuilderInline
          step={creditStep as 'intake' | 'payment' | 'processing' | 'done'}
          onComplete={handleCreditIntakeComplete}
          onRequestPayment={handleCreditPayment}
        />
      )}

      {timeManagementVisible && (
        <TimeManagementInline
          onTimerStarted={(taskTitle, durationMinutes) => {
            showEmote('happy', 5000);
            addAzuraMessage(`timer's live. ${taskTitle} for ${durationMinutes} minutes.`);
          }}
          onNextTask={(taskTitle, durationMinutes) => {
            showEmote('surprised', 4500);
            addAzuraMessage(`next up: ${taskTitle}. ${durationMinutes} minutes. go.`);
          }}
          onSessionComplete={() => {
            showEmote('joyful', 5000);
            addAzuraMessage("clean run. you're done.");
          }}
        />
      )}

      {/* Research Source Cards */}
      {researchSources && researchSources.length > 0 && (
        <ResearchCards
          sources={researchSources}
          payTo={researchPayTo}
          topic={researchTopic}
          onComplete={(synthesis) => {
            setResearchSources(null);
            showEmote('default');
            addAzuraMessage(synthesis);
          }}
          onError={(msg) => {
            setResearchSources(null);
            addAzuraMessage(msg);
          }}
        />
      )}

      {/* Shard Confirmation */}
      {pendingMessage && (
        <div className={styles.shardConfirm}>
          <div className={styles.shardConfirmText}>
            {pendingType === 'research'
              ? 'Activate research mode?'
              : `Spend ${SHARD_COST} shards for a deep response?`}
            <span className={styles.shardConfirmBalance}>{shardCount} shards available</span>
          </div>
          <div className={styles.shardConfirmButtons}>
            <button className={styles.shardConfirmYes} onClick={confirmShardSpend} type="button">
              {pendingType === 'research'
                ? `Spend ${RESEARCH_COST.toLocaleString()} Shards`
                : `Spend ${SHARD_COST} Shards`}
            </button>
            <button className={styles.shardConfirmNo} onClick={cancelShardSpend} type="button">
              {pendingType === 'research' ? 'Cancel' : 'Basic Response'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        {shardCount !== null && (
          <div className={styles.shardCounter}>
            <Image src="/icons/ui-shard.svg" alt="" width={14} height={14} />
            <span>{shardCount}</span>
          </div>
        )}
        <button className={styles.quickAction} onClick={() => handleQuickAction('shards')} disabled={isTyping} type="button">
          Shards
        </button>
        <button className={styles.quickAction} onClick={() => handleQuickAction('prayers')} disabled={isTyping} type="button">
          Pages
        </button>
        <button className={styles.quickAction} onClick={() => handleQuickAction('course')} disabled={isTyping} type="button">
          Course
        </button>
        <button className={styles.quickAction} onClick={() => handleQuickAction('more')} disabled={isTyping} type="button">
          More
        </button>
      </div>

      {/* Chat Input */}
      <div className={styles.inputArea}>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Say something..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isTyping}
        />
        <button
          className={`${styles.voiceButton} ${isRecording ? styles.voiceActive : ''} ${isSpeaking ? styles.voiceSpeaking : ''}`}
          onClick={startVoiceChat}
          type="button"
          aria-label={isRecording ? 'Stop recording' : 'Voice chat'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="1" width="6" height="12" rx="3" fill="currentColor"/>
            <path d="M19 10v1a7 7 0 01-14 0v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!inputText.trim() || isTyping}
          type="button"
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L12 22M12 2L5 9M12 2L19 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>
    </>
  );

  /* ── Expanded (fullscreen) layout ── */
  if (isExpanded) {
    return (
      <>
        <div className={styles.backdrop} onClick={() => setIsExpanded(false)} />
        <div className={styles.expandedContainer}>
          {/* Top bar */}
          <div className={styles.expandedTopBar}>
            <div className={styles.expandedTitle} />
            <Image src="/icons/logo-mwa-horizontal.png" alt="Mental Wealth Academy" width={160} height={58} className={styles.topBarLogo} />
            <div className={styles.expandedControls}>
              <button className={styles.expandButton} onClick={() => setIsExpanded(false)} type="button" aria-label="Collapse">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                </svg>
              </button>
              <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Close chat">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.expandedBody}>
            {/* Left panel — Knowledge & tools */}
            <div className={styles.expandedLeft}>
              {/* Radar chart */}
              <div className={styles.radarSection}>
                <div className={styles.radarWrap}>
                  <svg viewBox="0 0 200 200" className={styles.radarSvg}>
                    {[1.0, 0.78, 0.56, 0.34].map((scale, ri) => (
                      <polygon
                        key={`fill-${ri}`}
                        points={getRadarPoints(RADAR_AXES.map(() => scale))}
                        fill={ri % 2 === 0 ? 'rgba(255, 255, 255, 0.028)' : 'rgba(81, 104, 255, 0.018)'}
                        stroke="none"
                      />
                    ))}
                    {/* Web rings */}
                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, ri) => (
                      <polygon
                        key={ri}
                        points={getRadarPoints(RADAR_AXES.map(() => scale))}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth={ri === 4 ? '1.2' : '1'}
                      />
                    ))}
                    {/* Axis lines with individual colors */}
                    {RADAR_AXES.map((axis, i) => {
                      const point = getRadarPoint(i, 1);
                      return (
                        <line
                          key={i}
                          x1="100" y1="100"
                          x2={point.x}
                          y2={point.y}
                          stroke={axis.color}
                          strokeWidth="1"
                          opacity="0.15"
                        />
                      );
                    })}
                    {/* Broader colored facets so the web reads layered instead of star-shaped */}
                    {RADAR_AXES.map((axis, index) => {
                      const prev = (index - 1 + RADAR_AXES.length) % RADAR_AXES.length;
                      const next = (index + 1) % RADAR_AXES.length;
                      const scales = RADAR_AXES.map((_, i) => {
                        if (i === index) return axis.value / 100;
                        if (i === prev || i === next) return 0.46;
                        return 0.18;
                      });
                      return (
                        <polygon
                          key={`facet-${axis.label}`}
                          points={getRadarPoints(scales)}
                          fill={`${axis.color}1F`}
                          stroke={axis.color}
                          strokeWidth="1.1"
                          opacity="0.82"
                        />
                      );
                    })}
                    {/* Combined data polygon on top */}
                    <polygon
                      points={getRadarPoints(RADAR_AXES.map((axis) => axis.value / 100))}
                      fill="rgba(81, 104, 255, 0.11)"
                      stroke="rgba(255, 255, 255, 0.24)"
                      strokeWidth="1.4"
                    />
                    {RADAR_AXES.map((axis, i) => {
                      const point = getRadarPoint(i, axis.value / 100);
                      return (
                        <circle
                          key={`node-${axis.label}`}
                          cx={point.x}
                          cy={point.y}
                          r="3.2"
                          fill={axis.color}
                          stroke="rgba(255, 255, 255, 0.7)"
                          strokeWidth="1"
                        />
                      );
                    })}
                  </svg>
                  {/* Labels positioned around the chart */}
                  {RADAR_AXES.map((axis, i) => {
                    const labelPoint = getRadarPoint(i, 1.18);
                    const x = (labelPoint.x / 200) * 100;
                    const y = (labelPoint.y / 200) * 100;
                    return (
                      <span
                        key={axis.label}
                        className={styles.radarLabel}
                        style={{ left: `${x}%`, top: `${y}%`, color: axis.color }}
                      >
                        {axis.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Power Tools */}
              <div className={styles.expandedQuickPanel}>
                <h3 className={styles.panelHeading}>Power Tools</h3>
                <div className={styles.expandedQuickGrid}>
                  <button className={styles.expandedQuickCard} onClick={() => { play('click'); handleQuickAction('credit'); }} onMouseEnter={() => play('hover')} disabled={isTyping} type="button">
                    <span className={styles.toolCardTop}>
                      <span className={styles.toolCardText}>
                        <span className={styles.toolSlideWrap}>
                          <span className={`${styles.toolCardTitle} ${styles.toolSlideText}`}>Credit Builder</span>
                          <span className={`${styles.toolCardTitle} ${styles.toolSlideText} ${styles.toolSlideClone}`}>Credit Builder</span>
                        </span>
                        <span className={styles.toolCardMeta}>Repair and level up your profile.</span>
                      </span>
                      <span className={styles.toolCardIcon} aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.11-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                      </span>
                    </span>
                    <span className={styles.toolCardBottom} aria-hidden="true" />
                  </button>
                  <button className={styles.expandedQuickCard} onClick={() => { play('click'); handleQuickAction('time'); }} onMouseEnter={() => play('hover')} disabled={isTyping} type="button">
                    <span className={styles.toolCardTop}>
                      <span className={styles.toolCardText}>
                        <span className={styles.toolSlideWrap}>
                          <span className={`${styles.toolCardTitle} ${styles.toolSlideText}`}>Time Management</span>
                          <span className={`${styles.toolCardTitle} ${styles.toolSlideText} ${styles.toolSlideClone}`}>Time Management</span>
                        </span>
                        <span className={styles.toolCardMeta}>Stack up to four timed focus blocks.</span>
                      </span>
                      <span className={styles.toolCardIcon} aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1.75A10.25 10.25 0 1 0 22.25 12 10.262 10.262 0 0 0 12 1.75Zm0 18.5A8.25 8.25 0 1 1 20.25 12 8.259 8.259 0 0 1 12 20.25Zm.75-13h-1.5v5.06l4.03 2.42.78-1.28-3.31-1.98Z"/></svg>
                      </span>
                    </span>
                    <span className={styles.toolCardBottom} aria-hidden="true" />
                  </button>
                  <button className={`${styles.expandedQuickCard} ${styles.expandedQuickAccent}`} onClick={() => { play('click'); handleQuickAction('research'); }} onMouseEnter={() => play('hover')} disabled={isTyping} type="button">
                    <span className={styles.toolCardTop}>
                      <span className={styles.toolCardText}>
                        <span className={styles.toolSlideWrap}>
                          <span className={`${styles.toolCardTitle} ${styles.toolSlideText}`}>Research</span>
                          <span className={`${styles.toolCardTitle} ${styles.toolSlideText} ${styles.toolSlideClone}`}>Research</span>
                        </span>
                        <span className={styles.toolCardMeta}>Deep-dive sourcing and synthesis.</span>
                      </span>
                      <span className={styles.toolCardIcon} aria-hidden="true">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                      </span>
                    </span>
                    <span className={styles.toolCardBottom} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Trained In — bottom */}
              <div className={styles.trainedInSection}>
                <h3 className={styles.panelHeading}>Trained In</h3>
                <div className={styles.keywordGrid}>
                  {KNOWLEDGE_DOMAINS.map((domain) => (
                    <span key={domain} className={styles.keywordTag}>{domain}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Center — Chat (no duplicate emote image) */}
            <div className={styles.expandedCenter}>
              {chatContent}
            </div>

            {/* Right — Full body character */}
            <div className={styles.expandedRight}>
              <div className={styles.fullBodyWrap}>
                <Image
                  src="/images/azura-fullbody.png"
                  alt="Blue full body"
                  fill
                  className={styles.fullBodyImage}
                  unoptimized
                  priority
                />
                <div className={styles.fullBodyGlow} />
              </div>
              <div className={styles.fullBodyNameplate}>
                <span className={styles.nameplateName}>Blue</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Compact (default) layout ── */
  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.chatContainer}>
        <div className={styles.compactControls}>
          <button className={styles.expandButton} onClick={() => setIsExpanded(true)} type="button" aria-label="Expand to fullscreen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Close chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.characterSection}>
          <Image
            src={AZURA_EMOTES[emoteA]}
            alt="Azura"
            fill
            className={styles.characterImage}
            style={{ opacity: activeLayer === 'a' ? 1 : 0, transition: 'opacity 0.5s ease' }}
            unoptimized
            priority
          />
          <Image
            src={AZURA_EMOTES[emoteB]}
            alt="Azura"
            fill
            className={styles.characterImage}
            style={{ opacity: activeLayer === 'b' ? 1 : 0, transition: 'opacity 0.5s ease' }}
            unoptimized
          />
          <div className={styles.characterFade} />
          <div className={styles.characterNameplate}>
            <span className={styles.nameplateStatus} />
            <span className={styles.nameplateName}>Blue</span>
            <span className={styles.nameplateLabel}>v1.3</span>
          </div>
        </div>

        {chatContent}
      </div>
    </>
  );
};

export default BlueChat;
