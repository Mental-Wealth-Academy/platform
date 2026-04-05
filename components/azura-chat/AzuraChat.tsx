'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './AzuraChat.module.css';
import CreditBuilderInline from './CreditBuilderInline';
import type { CreditIntakeData } from './CreditBuilderInline';

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

interface AzuraChatProps {
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
  default: 'https://i.imgur.com/ExJZFiA.png',
  thinking: 'https://i.imgur.com/4FsFcDO.png',
  scheming: 'https://i.imgur.com/3FMUm8a.png',
  thinkingLeft: 'https://i.imgur.com/AjRHt7m.png',
  thinkingRight: 'https://i.imgur.com/fRfcLdH.png',
  searching: 'https://i.imgur.com/7RUM8I2.png',
  blankStare: 'https://i.imgur.com/igYuj37.png',
} as const;

const KNOWLEDGE_DOMAINS = [
  { label: 'Behavioral', value: 92, color: '#5168FF' },
  { label: 'DeSci', value: 84, color: '#00D4FF' },
  { label: 'Wellness', value: 88, color: '#74C465' },
  { label: 'On-Chain', value: 90, color: '#FF8800' },
  { label: 'Neuro', value: 76, color: '#C084FC' },
];

const SHARD_COST = 10;

const AzuraChat: React.FC<AzuraChatProps> = ({ isOpen, onClose }) => {
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
          showEmote('blankStare');
          const hasShards = shardCount !== null && shardCount >= SHARD_COST;
          if (hasShards) {
            setPendingMessage(text);
          } else {
            addAzuraMessage(generateAzuraResponse(text));
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

  const sendToEliza = async (text: string) => {
    setIsTyping(true);
    showEmote('searching');
    try {
      const res = await fetch('/api/chat/blue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: text, confirm: true }),
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
    showEmote('blankStare');

    const hasShards = shardCount !== null && shardCount >= SHARD_COST;

    if (hasShards) {
      // Show confirmation before spending shards
      setPendingMessage(text);
    } else {
      // No shards -- use local responses
      addAzuraMessage(generateAzuraResponse(text));
    }
  };

  const confirmShardSpend = () => {
    if (!pendingMessage) return;
    const text = pendingMessage;
    setPendingMessage(null);
    sendToEliza(text);
  };

  const cancelShardSpend = () => {
    if (!pendingMessage) return;
    const text = pendingMessage;
    setPendingMessage(null);
    addAzuraMessage(generateAzuraResponse(text));
  };

  const handleCreditIntakeComplete = async (data: CreditIntakeData) => {
    showEmote('scheming');

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

    const send = (text: string, emote: keyof typeof AZURA_EMOTES = 'thinking') => {
      showEmote(emote);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        text,
        sender: 'user' as const,
        timestamp: new Date(),
      }]);
    };

    if (action === 'credit') {
      send('I want to build my credit', 'thinking');
      setCreditStep('intake');
      addAzuraMessage(
        "let's get your credit right. fill out the form below with your current scores and any negative items on your report. you can find your scores free at annualcreditreport.com or through your bank app."
      );
    } else if (action === 'shards') {
      send('What are shards', 'thinkingRight');
      addAzuraMessage(
        "shards are proof-of-understanding. they accumulate as you move through the curriculum. your collection reflects actual growth, not time spent."
      );
    } else if (action === 'x402') {
      send('Tell me about x402 sessions', 'scheming');
      addAzuraMessage(
        "you put up a fee, i unlock paid tasks -- premium data, gated APIs, deep research. funding a micro-mission."
      );
    } else if (action === 'research') {
      send('Start a research session', 'searching');
      addAzuraMessage(
        "give me a topic. i'll pull from DeSci papers, behavioral studies, on-chain data. what do you want me to look into?"
      );
    } else if (action === 'more') {
      send('What else can you do', 'thinkingLeft');
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

      {/* Shard Confirmation */}
      {pendingMessage && (
        <div className={styles.shardConfirm}>
          <div className={styles.shardConfirmText}>
            Spend {SHARD_COST} shards for a deep response?
            <span className={styles.shardConfirmBalance}>{shardCount} shards available</span>
          </div>
          <div className={styles.shardConfirmButtons}>
            <button className={styles.shardConfirmYes} onClick={confirmShardSpend} type="button">
              Spend {SHARD_COST} Shards
            </button>
            <button className={styles.shardConfirmNo} onClick={cancelShardSpend} type="button">
              Basic Response
            </button>
          </div>
        </div>
      )}

      {/* Shard Counter */}
      {shardCount !== null && (
        <div className={styles.shardCounter}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span>{shardCount} shards</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button className={styles.quickAction} onClick={() => handleQuickAction('credit')} disabled={isTyping} type="button">
          Credit Builder
        </button>
        <button className={styles.quickAction} onClick={() => handleQuickAction('shards')} disabled={isTyping} type="button">
          Shards
        </button>
        <button className={`${styles.quickAction} ${styles.quickActionAccent}`} onClick={() => handleQuickAction('x402')} disabled={isTyping} type="button">
          x402
        </button>
        <button className={`${styles.quickAction} ${styles.quickActionAccent}`} onClick={() => handleQuickAction('research')} disabled={isTyping} type="button">
          Research
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
            <div className={styles.expandedTitle}>
              <span className={styles.nameplateStatus} />
              <span className={styles.nameplateName}>Blue</span>
              <span className={styles.nameplateLabel}>v1.3</span>
            </div>
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
            {/* Left panel — Knowledge & actions */}
            <div className={styles.expandedLeft}>
              <div className={styles.knowledgePanel}>
                <h3 className={styles.panelHeading}>Knowledge Domains</h3>
                <div className={styles.knowledgeBars}>
                  {KNOWLEDGE_DOMAINS.map((domain, i) => (
                    <div key={domain.label} className={styles.knowledgeRow}>
                      <span className={styles.knowledgeLabel}>{domain.label}</span>
                      <div className={styles.knowledgeTrack}>
                        <div
                          className={styles.knowledgeFill}
                          style={{
                            width: `${domain.value}%`,
                            ['--bar-color' as string]: domain.color,
                            animationDelay: `${i * 0.12}s`,
                          }}
                        />
                      </div>
                      <span className={styles.knowledgeValue}>{domain.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.expandedQuickPanel}>
                <h3 className={styles.panelHeading}>Quick Actions</h3>
                <div className={styles.expandedQuickGrid}>
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('credit')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.11-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                    <span>Credit Builder</span>
                  </button>
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('shards')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                    <span>Shards</span>
                  </button>
                  <button className={`${styles.expandedQuickCard} ${styles.expandedQuickAccent}`} onClick={() => handleQuickAction('x402')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                    <span>x402</span>
                  </button>
                  <button className={`${styles.expandedQuickCard} ${styles.expandedQuickAccent}`} onClick={() => handleQuickAction('research')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    <span>Research</span>
                  </button>
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('more')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/></svg>
                    <span>More</span>
                  </button>
                </div>
              </div>

              {/* Session status — at bottom */}
              <div className={styles.sessionPanel}>
                <div className={styles.sessionRow}>
                  <span className={styles.sessionLabel}>Model</span>
                  <span className={styles.sessionValue}>BlueOS</span>
                </div>
                <div className={styles.sessionRow}>
                  <span className={styles.sessionLabel}>Status</span>
                  <span className={styles.sessionValueOnline}>Online</span>
                </div>
                {shardCount !== null && (
                  <div className={styles.sessionRow}>
                    <span className={styles.sessionLabel}>Shards</span>
                    <span className={styles.sessionValue}>{shardCount}</span>
                  </div>
                )}
                <div className={styles.sessionRow}>
                  <span className={styles.sessionLabel}>Cost</span>
                  <span className={styles.sessionValue}>{SHARD_COST}/msg</span>
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
                  alt="Azura full body"
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

export default AzuraChat;
