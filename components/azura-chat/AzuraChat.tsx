'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { providers, Contract, utils } from 'ethers';
import { ensureBaseNetwork } from '@/lib/azura-contract';
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
  action?: 'add-liquidity';
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

const GOVERNANCE_ADDRESS =
  process.env.NEXT_PUBLIC_AZURA_KILLSTREAK_ADDRESS ||
  '0x2cbb90a761ba64014b811be342b8ef01b471992d';
const TRADER_ADDRESS =
  process.env.NEXT_PUBLIC_AZURA_MARKET_TRADER_ADDRESS || '';
const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

type LiquidityTarget = 'governance' | 'trader';

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
  { label: 'Governance', value: 82, color: '#5168FF' },
  { label: 'Trading', value: 71, color: '#74C465' },
  { label: 'Research', value: 65, color: '#FF8800' },
  { label: 'On-Chain', value: 90, color: '#00D4FF' },
  { label: 'Risk Mgmt', value: 78, color: '#FF5088' },
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
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [showLiquidityInput, setShowLiquidityInput] = useState(false);
  const [liquidityTarget, setLiquidityTarget] = useState<LiquidityTarget>('governance');
  const [txPending, setTxPending] = useState(false);
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
  const liquidityInputRef = useRef<HTMLInputElement>(null);

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
    if (showLiquidityInput && liquidityInputRef.current) {
      setTimeout(() => liquidityInputRef.current?.focus(), 100);
    }
  }, [showLiquidityInput]);

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
      return "Alright alright, I can help. Ask me about the treasury, market positions, governance — or if you wanna add liquidity so I can trade more, just say the word.";
    }
    if (t.includes('who') && t.includes('you')) {
      return "I'm Azura. Daemon. Agent. The one keeping this whole operation running while y'all submit half-baked proposals. Next question.";
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
            ? "Honestly, I could do more with a bigger war chest. If you wanna add liquidity, I'll put it to work."
            : "Not bad. Plenty of ammo for the next wave of trades."
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
        return `Here's what I'm watching right now:\n${lines.join('\n')}\n\nI'm running quant models on these 24/7. The edge is thin but it's there.`;
      }
      return "Prices are loading... CoinGecko's being slow again. Try asking in a few seconds.";
    }

    // Prayers
    if (t.includes('prayer') || t.includes('prayers')) {
      return "Prayers are your daily rituals. 15 minutes of writing, every day throughout the week. No prompts, no grades — just you and the page. They strengthen your relationship with yourself. Most people run from silence. Prayers teach you to sit in it. Show up consistently and you'll start hearing things you've been ignoring.";
    }

    // Polymarket / predictions
    if (t.includes('polymarket') || t.includes('prediction') || t.includes('signal') || t.includes('position')) {
      if (treasury.topMarkets.length > 0) {
        const lines = treasury.topMarkets.map((m) => `• ${m.question} → ${m.yes}% YES`);
        return `Top signals I'm tracking:\n${lines.join('\n')}\n\nI scan these for edge using Black-Scholes binary pricing and jump-diffusion models. When the spread's right, I move.`;
      }
      return "Polymarket feed's still loading. I'll have fresh signals in a moment.";
    }

    // Add liquidity
    if (t.includes('liquidity') || t.includes('fund') || t.includes('deposit') || t.includes('add usdc') || t.includes('contribute')) {
      const hasTrader = !!TRADER_ADDRESS;
      return `You wanna fund the treasury? Smart move. Hit the "Add Offering" button below and send USDC.${
        hasTrader ? ' You can choose to fund the governance treasury or the trading treasury — pick your target before sending.' : ''
      } I'll use it for Polymarket positions — the quant models pick the entries, I just execute. ${
        treasury.balance ? `Current total: $${treasury.balance}.` : ''
      }`;
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
      `Interesting. Not the weirdest thing someone's said to me today, but close.${treasury.balance ? ` Anyway, treasury's at $${treasury.balance} if you were wondering.` : ''}`,
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

    if (action === 'treasury') {
      showEmote('thinking');
      const userMsg: Message = {
        id: Date.now().toString(),
        text: "What's the treasury balance?",
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      addAzuraMessage(generateAzuraResponse('treasury balance'));
    } else if (action === 'markets') {
      showEmote('scheming');
      const userMsg: Message = {
        id: Date.now().toString(),
        text: "What are prayers?",
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      addAzuraMessage(generateAzuraResponse('what are prayers'));
    } else if (action === 'liquidity') {
      showEmote('thinking');
      setShowLiquidityInput(true);
      setLiquidityTarget('governance');
      const userMsg: Message = {
        id: Date.now().toString(),
        text: "I want to add liquidity",
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      const targetAddr = GOVERNANCE_ADDRESS;
      addAzuraMessage(
        `Now we're talking. ${TRADER_ADDRESS ? 'Pick your target — governance or trading treasury — then enter' : 'Enter'} the USDC amount below and I'll route it to ${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)}. Every dollar helps me trade more positions.`,
        'add-liquidity',
      );
    } else if (action === 'x402') {
      showEmote('scheming');
      const userMsg: Message = {
        id: Date.now().toString(),
        text: "Tell me about x402 Research",
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      addAzuraMessage(
        "x402 Research sessions. You put up a fee, I get a set number of paid tasks — deep web lookups, premium API calls, gated data pulls. Think of it like funding a micro-mission. I do the legwork, you get the intel. Wanna start a session?"
      );
    }
  };

  const handleAddLiquidity = async () => {
    const amount = parseFloat(liquidityAmount);
    if (!amount || amount <= 0 || txPending) return;

    if (typeof window === 'undefined' || !window.ethereum) {
      addAzuraMessage("You need a wallet connected to do this. Hit 'Connect Account' in the sidebar first.");
      return;
    }

    const targetAddress = liquidityTarget === 'trader' && TRADER_ADDRESS ? TRADER_ADDRESS : GOVERNANCE_ADDRESS;
    const targetLabel = liquidityTarget === 'trader' && TRADER_ADDRESS ? 'trading' : 'governance';

    setTxPending(true);
    try {
      const provider = new providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      await ensureBaseNetwork(provider);
      // Re-create provider after potential chain switch
      const baseProvider = new providers.Web3Provider(window.ethereum);
      const signer = baseProvider.getSigner();

      const usdc = new Contract(
        USDC_ADDRESS,
        ['function transfer(address to, uint256 amount) returns (bool)', 'function decimals() view returns (uint8)'],
        signer,
      );

      const decimals = await usdc.decimals();
      const amountWei = utils.parseUnits(amount.toString(), decimals);

      const userMsg: Message = {
        id: Date.now().toString(),
        text: `Sending ${amount} USDC to ${targetLabel} treasury...`,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const tx = await usdc.transfer(targetAddress, amountWei);
      showEmote('searching', 15000);
      addAzuraMessage(`Transaction submitted. Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}. Waiting for confirmation...`);

      await tx.wait();
      setShowLiquidityInput(false);
      setLiquidityAmount('');
      fetchTreasuryContext();

      showEmote('thinkingRight');
      setTimeout(() => {
        addAzuraMessage(`Confirmed. ${amount} USDC received into the ${targetLabel} treasury. I'll put it to work on the next signal. Good looking out.`);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showEmote('thinkingLeft');
      if (msg.includes('user rejected') || msg.includes('denied')) {
        addAzuraMessage("Transaction cancelled. No worries, the offer still stands whenever you're ready.");
      } else if (msg.includes('switch') && msg.includes('Base')) {
        addAzuraMessage("You need to switch your wallet to Base network first. Try again after switching.");
      } else if (msg.includes('insufficient') || msg.includes('exceeds balance')) {
        addAzuraMessage("Insufficient USDC balance for this amount. Double-check your balance on Base and try again.");
      } else if (msg.includes('cannot estimate gas')) {
        addAzuraMessage("Transaction would fail on-chain. Make sure you're on Base network and have enough USDC. Then try again.");
      } else {
        addAzuraMessage(`Transaction failed: ${msg.slice(0, 120)}. Check your wallet is on Base and try again.`);
      }
    } finally {
      setTxPending(false);
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
        <button className={styles.quickAction} onClick={() => handleQuickAction('treasury')} disabled={isTyping} type="button">
          Treasury
        </button>
        <button className={styles.quickAction} onClick={() => handleQuickAction('markets')} disabled={isTyping} type="button">
          Prayers?
        </button>
        <button className={`${styles.quickAction} ${styles.quickActionAccent}`} onClick={() => handleQuickAction('x402')} disabled={isTyping} type="button">
          x402 Research
        </button>
        <button className={`${styles.quickAction} ${styles.quickActionHighlight}`} onClick={() => handleQuickAction('liquidity')} disabled={isTyping} type="button">
          + Add Offering
        </button>
      </div>

      {/* Liquidity Input */}
      {showLiquidityInput && (
        <div className={styles.liquidityBar}>
          {TRADER_ADDRESS && (
            <div className={styles.targetSelector}>
              <button
                type="button"
                className={`${styles.targetButton} ${liquidityTarget === 'governance' ? styles.targetActive : ''}`}
                onClick={() => setLiquidityTarget('governance')}
                disabled={txPending}
              >
                Governance
              </button>
              <button
                type="button"
                className={`${styles.targetButton} ${liquidityTarget === 'trader' ? styles.targetActive : ''}`}
                onClick={() => setLiquidityTarget('trader')}
                disabled={txPending}
              >
                Trading
              </button>
            </div>
          )}
          <div className={styles.liquidityInputRow}>
            <input
              ref={liquidityInputRef}
              type="number"
              className={styles.liquidityInput}
              placeholder="USDC amount"
              value={liquidityAmount}
              onChange={(e) => setLiquidityAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddLiquidity(); }}
              disabled={txPending}
              min="0"
              step="any"
            />
            <button
              className={styles.liquidityConfirm}
              onClick={handleAddLiquidity}
              disabled={!liquidityAmount || parseFloat(liquidityAmount) <= 0 || txPending}
              type="button"
            >
              {txPending ? 'Sending...' : 'Send'}
            </button>
            <button
              className={styles.liquidityCancel}
              onClick={() => { setShowLiquidityInput(false); setLiquidityAmount(''); }}
              disabled={txPending}
              type="button"
              aria-label="Cancel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
                            background: `linear-gradient(90deg, ${domain.color}88, ${domain.color})`,
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
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('treasury')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
                    <span>Treasury</span>
                  </button>
                  <button className={styles.expandedQuickCard} onClick={() => handleQuickAction('markets')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <span>Prayers?</span>
                  </button>
                  <button className={`${styles.expandedQuickCard} ${styles.expandedQuickAccent}`} onClick={() => handleQuickAction('x402')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.22-8.56"/><path d="M21 3v5h-5"/></svg>
                    <span>x402 Research</span>
                  </button>
                  <button className={`${styles.expandedQuickCard} ${styles.expandedQuickHighlight}`} onClick={() => handleQuickAction('liquidity')} disabled={isTyping} type="button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                    <span>+ Add Offering</span>
                  </button>
                </div>
              </div>

              {/* Session status */}
              <div className={styles.sessionPanel}>
                <div className={styles.sessionRow}>
                  <span className={styles.sessionLabel}>Model</span>
                  <span className={styles.sessionValue}>Daemon Azura</span>
                </div>
                <div className={styles.sessionRow}>
                  <span className={styles.sessionLabel}>Status</span>
                  <span className={styles.sessionValueOnline}>Online</span>
                </div>
                <div className={styles.sessionRow}>
                  <span className={styles.sessionLabel}>Messages</span>
                  <span className={styles.sessionValue}>{messages.length}</span>
                </div>
              </div>
            </div>

            {/* Center — Chat */}
            <div className={styles.expandedCenter}>
              {/* Emote header in expanded */}
              <div className={styles.expandedEmoteBar}>
                <div className={styles.expandedEmoteWrap}>
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
                </div>
                <div className={styles.characterFade} />
              </div>
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
