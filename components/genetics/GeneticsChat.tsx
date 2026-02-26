'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { MatchedSNP, MatchedGenoset, ChatMessage } from '@/types/genetics';
import styles from './GeneticsChat.module.css';

interface GeneticsChatProps {
  matches: MatchedSNP[] | null;
  genosets: MatchedGenoset[] | null;
}

export function GeneticsChat({ matches, genosets }: GeneticsChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can help you understand your genetic data. Upload your DNA file and ask me anything about your SNPs, genotypes, or genetic traits.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = useCallback(() => {
    if (!matches || matches.length === 0) return 'No genetic data has been uploaded yet.';

    const topMatches = matches
      .filter((m) => m.parsedData.magnitude !== undefined && m.parsedData.magnitude > 0)
      .sort((a, b) => (b.parsedData.magnitude ?? 0) - (a.parsedData.magnitude ?? 0))
      .slice(0, 20);

    let ctx = `User has uploaded genetic data with ${matches.length} matched SNPs.`;

    if (topMatches.length > 0) {
      ctx += '\n\nTop SNPs by magnitude:\n';
      topMatches.forEach((m) => {
        ctx += `- ${m.rsid.toUpperCase()} (${m.genotype.toUpperCase()}) - Magnitude: ${m.parsedData.magnitude}`;
        if (m.genotypeData?.content) {
          const summary = m.genotypeData.content.substring(0, 200).replace(/\{\{[^}]*\}\}/g, '').trim();
          if (summary) ctx += ` - ${summary}`;
        }
        ctx += '\n';
      });
    }

    if (genosets && genosets.length > 0) {
      ctx += `\n\nMatched ${genosets.length} genosets:\n`;
      genosets.slice(0, 10).forEach((g) => {
        ctx += `- ${g.genoset.id} (Magnitude: ${g.parsedData.magnitude ?? 'N/A'}, ${g.matchedGenotypes.length} genotypes)\n`;
      });
    }

    return ctx;
  }, [matches, genosets]);

  const suggestedPrompts = [
    'Best diet for my DNA?',
    'Top genetic risks?',
    'Sleep & recovery?',
    'Hero traits?',
  ];

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const context = buildContext();
      const response = await fetch('/api/genetics/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, context }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'I was unable to generate a response. Please try again.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. The chat API may not be configured yet. You can still browse your genetic data above.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <span className={styles.chatHeaderTitle}>Genetics Assistant</span>
        {matches && (
          <span className={styles.chatHeaderBadge}>{matches.length.toLocaleString()} SNPs loaded</span>
        )}
      </div>

      <div className={styles.messagesContainer}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}
          >
            <div className={styles.messageBubble}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.messageAssistant}`}>
            <div className={styles.messageBubble}>
              <div className={styles.typingIndicator}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && !isLoading && (
        <div className={styles.suggestedPrompts}>
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              className={styles.promptBubble}
              onClick={() => handleSuggestedPrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={matches ? 'Ask about your genetics...' : 'Upload DNA data to ask questions...'}
          className={styles.chatInput}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={styles.sendButton}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
