'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { providers, Contract, utils } from 'ethers';
import { ensureBaseNetwork } from '@/lib/azura-contract';
import styles from './AzuraChat.module.css';

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
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

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
      return `You wanna fund the treasury? Smart move. Hit the "Add Liquidity" button below and send USDC.${
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

  const handleQuickAction = (action: string) => {
    if (isTyping) return;

    if (action === 'treasury') {
      const userMsg: Message = {
        id: Date.now().toString(),
        text: "What's the treasury balance?",
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      addAzuraMessage(generateAzuraResponse('treasury balance'));
    } else if (action === 'markets') {
      const userMsg: Message = {
        id: Date.now().toString(),
        text: "What markets are you watching?",
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      addAzuraMessage(generateAzuraResponse('polymarket signals'));
    } else if (action === 'liquidity') {
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
      addAzuraMessage(`Transaction submitted. Hash: ${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}. Waiting for confirmation...`);

      await tx.wait();
      setShowLiquidityInput(false);
      setLiquidityAmount('');
      fetchTreasuryContext();

      setTimeout(() => {
        addAzuraMessage(`Confirmed. ${amount} USDC received into the ${targetLabel} treasury. I'll put it to work on the next signal. Good looking out.`);
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
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

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.chatContainer}>
        <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.characterSection}>
          <Image
            src="https://i.imgur.com/HFjHyUZ.png"
            alt="Azura working at her desk"
            fill
            className={styles.characterImage}
            unoptimized
            priority
          />
          <div className={styles.characterFade} />
          <div className={styles.characterNameplate}>
            <span className={styles.nameplateStatus} />
            <span className={styles.nameplateName}>Azura</span>
            <span className={styles.nameplateLabel}>v1.3</span>
          </div>
        </div>

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
            Signals
          </button>
          <button className={`${styles.quickAction} ${styles.quickActionHighlight}`} onClick={() => handleQuickAction('liquidity')} disabled={isTyping} type="button">
            + Add Liquidity
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
            className={styles.sendButton}
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            type="button"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default AzuraChat;
