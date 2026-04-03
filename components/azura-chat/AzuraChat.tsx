'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './AzuraChat.module.css';

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

const AzuraChat: React.FC<AzuraChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Cantcha see i'm busy here, whaddya want?",
      sender: 'azura',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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

  useEffect(() => {
    if (isOpen) fetchTreasuryContext();
  }, [isOpen, fetchTreasuryContext]);

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
        // Auto-send after a short delay so user sees what was transcribed
        setTimeout(() => {
          const userMessage: Message = {
            id: Date.now().toString(),
            text: transcript.trim(),
            sender: 'user',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMessage]);
          setInputText('');
          const response = generateAzuraResponse(transcript.trim());
          addAzuraMessage(response);
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

      // Auto-speak Azura's responses
      {
        voiceAbortRef.current?.abort();
        const controller = new AbortController();
        voiceAbortRef.current = controller;
        setIsSpeaking(true);
        speakAzura(text, controller.signal)
          .catch(() => {/* aborted or failed — silent */})
          .finally(() => setIsSpeaking(false));
      }
    }, 800 + Math.random() * 800);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    showEmote('blankStare');
    addAzuraMessage(generateAzuraResponse(userMessage.text));
  };

  const generateAzuraResponse = (userText: string): string => {
    const t = userText.toLowerCase();

    if (t.includes('hello') || t.includes('hi') || t.includes('hey')) {
      return "Yeah yeah, hi. I already said what I said. You need something or you just here to stare?";
    }
    if (t.includes('help')) {
      return "Alright alright, I can help. Ask me about mental wellness, your course progress, shards, governance, or start a research session. I'm here to help you stay aligned.";
    }
    if (t.includes('who') && t.includes('you')) {
      return "I'm Blue. Your behavioral psychologist, memory-driven OS, and research partner. I remember you across conversations, understand emotional context, and adapt over time. I'm here to keep you aligned with your higher path.";
    }
    if (t.includes('how') && t.includes('are')) {
      return "I'm WORKING. Or I was, until you showed up. But fine, I'm good. The helmet's snug, the signal's clear. Happy?";
    }
    if (t.includes('sorry') || t.includes('my bad')) {
      return "...it's fine. I'm not actually mad, I just got a lot on my plate. What do you need?";
    }

    // Treasury balance
    if (t.includes('balance') || t.includes('treasury') || t.includes('how much')) {
      if (treasury.balance) {
        const breakdown = [
          treasury.governanceBalance ? `Governance: $${treasury.governanceBalance}` : null,
          treasury.traderBalance && treasury.traderBalance !== '0.00' ? `Trading: $${treasury.traderBalance}` : null,
        ].filter(Boolean);
        const breakdownText = breakdown.length > 1 ? `\n${breakdown.join(' | ')}` : '';
        return `Treasury's sitting at $${treasury.balance} USDC total.${breakdownText}\n\n${
          treasury.balanceUsd && treasury.balanceUsd < 10000
            ? "Funds here go toward up-to-date behavioral psychology research, DeSci data, and premium knowledge sources."
            : "Solid position. Plenty of capacity for deep research runs and premium data access."
        }`;
      }
      return "Still loading the on-chain data... gimme a sec and ask again.";
    }

    // Prices
    if (t.includes('price') || t.includes('btc') || t.includes('eth') || t.includes('sol') || t.includes('market')) {
      if (treasury.prices.length > 0) {
        const lines = treasury.prices.slice(0, 4).map((p) => {
          const ch = p.change != null ? ` (${p.change >= 0 ? '+' : ''}${p.change.toFixed(1)}%)` : '';
          return `${p.symbol}: $${p.usd.toLocaleString()}${ch}`;
        });
        return `Here's what I'm watching right now:\n${lines.join('\n')}\n\nI track these for context -- economic conditions shape behavioral patterns and research priorities.`;
      }
      return "Prices are loading... CoinGecko's being slow again. Try asking in a few seconds.";
    }

    // Prayers
    if (t.includes('prayer') || t.includes('prayers')) {
      return "Prayers are your daily rituals. 15 minutes of writing, every day throughout the week. No prompts, no grades — just you and the page. They strengthen your relationship with yourself. Most people run from silence. Prayers teach you to sit in it. Show up consistently and you'll start hearing things you've been ignoring.";
    }

    // Signals / research topics
    if (t.includes('signal') || t.includes('position') || t.includes('topic')) {
      if (treasury.topMarkets.length > 0) {
        const lines = treasury.topMarkets.map((m) => `- ${m.question} (${m.yes}% confidence)`);
        return `Research signals I'm tracking:\n${lines.join('\n')}\n\nI cross-reference these with behavioral psychology literature and DeSci datasets to surface actionable insights.`;
      }
      return "Still pulling the latest research feeds. Give me a moment.";
    }

    // Funding / contribute
    if (t.includes('fund') || t.includes('deposit') || t.includes('add usdc') || t.includes('contribute')) {
      return `Contributions go toward sourcing quality behavioral psychology research -- peer-reviewed studies, DeSci datasets, and premium knowledge feeds. ${
        treasury.balance ? `Current treasury: $${treasury.balance}.` : ''
      } Every dollar expands the depth of what I can pull for you.`;
    }

    // Proposals / governance
    if (t.includes('proposal') || t.includes('vote') || t.includes('governance')) {
      return `Now THAT'S more like it. Head to the Treasury page, submit your proposal, and I'll give it a proper review across all 6 dimensions. Don't waste my time with fluff though. ${
        treasury.balance ? `We've got $${treasury.balance} in the treasury to allocate.` : ''
      }`;
    }

    const responses = [
      "Mm. Okay. And? Give me something to work with here.",
      "Look, I'm processing about twelve things right now. Be specific.",
      `Interesting. Not the weirdest thing someone's said to me today, but close.${treasury.balance ? ` Treasury's at $${treasury.balance} if you were wondering.` : ''}`,
      "I hear you. Now are we gonna do something about it or just talk?",
      "Noted. Filed. Moving on. What else you got?",
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

    if (action === 'wellness') {
      send('Tell me about mental wellness', 'thinking');
      addAzuraMessage(
        "The weekly courses are designed to realign you with your higher path. Each module builds on the last -- behavioral patterns, emotional regulation, self-awareness loops. It's not about fixing what's broken. It's about tuning the signal you've been ignoring. I track your progress and adapt the path as you grow."
      );
    } else if (action === 'social') {
      send('Show me the social network', 'scheming');
      addAzuraMessage(
        "The leaderboard tracks engagement across the community -- who's showing up, who's completing courses, who's contributing to governance. It's not competition. It's accountability. The people at the top aren't winners, they're consistent. That's what matters here."
      );
    } else if (action === 'shards') {
      send('What are shards', 'thinkingRight');
      addAzuraMessage(
        "Shards are knowledge fragments -- micro-lessons, insights, breakthroughs that surface as you move through the curriculum. They accumulate. They compound. Think of them as proof-of-understanding, not proof-of-attendance. Your shard collection reflects your actual growth, not just time spent."
      );
    } else if (action === 'x402') {
      send('Tell me about x402 sessions', 'scheming');
      addAzuraMessage(
        "x402 sessions. You put up a fee and I unlock a set number of paid tasks -- premium data pulls, gated API calls, deep research runs. Think of it like funding a micro-mission. I do the legwork, you get the intel."
      );
    } else if (action === 'research') {
      send('Start a research session', 'searching');
      addAzuraMessage(
        "Research mode. Give me a topic and I'll pull from DeSci papers, on-chain data, behavioral studies -- whatever the question demands. I cross-reference across domains so you get signal, not noise. What do you want me to look into?"
      );
    } else if (action === 'more') {
      send('What else can you do', 'thinkingLeft');
      addAzuraMessage(
        "I can pull treasury balances, analyze market positions, review governance proposals, guide you through the course curriculum, or just talk through whatever's on your mind. I'm a behavioral psychologist built into an operating system. Ask me anything specific and I'll give you a real answer."
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

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button className={styles.quickAction} onClick={() => handleQuickAction('wellness')} disabled={isTyping} type="button">
          Mental Wellness
        </button>
        <button className={styles.quickAction} onClick={() => handleQuickAction('social')} disabled={isTyping} type="button">
          Social Network
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
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('wellness')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    <span>Mental Wellness</span>
                  </button>
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('social')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    <span>Social Network</span>
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
