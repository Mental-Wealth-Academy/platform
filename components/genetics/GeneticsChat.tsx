'use client';

import { useState, useRef, useEffect } from 'react';
import type { MatchedSNP, MatchedGenoset, ChatMessage } from '@/types/genetics';
import { generateGeneticsChatResponse } from './geneticsChatResponses';
import styles from './GeneticsChat.module.css';

interface GeneticsChatProps {
  matches: MatchedSNP[] | null;
  genosets: MatchedGenoset[] | null;
}

export function GeneticsChat({ matches }: GeneticsChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Ask about SNPs, genotypes, genosets, or how this tool handles your data. The file and this guide stay on your device.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestedPrompts = [
    'What is a SNP?',
    'How is magnitude read?',
    'What is a genoset?',
    'How is my data handled?',
  ];

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: generateGeneticsChatResponse(trimmed, matches?.length ?? 0),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
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
        <span className={styles.chatHeaderTitle}>Genetics Guide</span>
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
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && (
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
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className={styles.sendButton}
          aria-label="Send question"
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
