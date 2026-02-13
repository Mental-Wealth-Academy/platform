'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './AzuraChat.module.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'azura';
  timestamp: Date;
}

interface AzuraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    setIsTyping(true);

    setTimeout(() => {
      const azuraResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAzuraResponse(userMessage.text),
        sender: 'azura',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, azuraResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateAzuraResponse = (userText: string): string => {
    const lowerText = userText.toLowerCase();

    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
      return "Yeah yeah, hi. I already said what I said. You need something or you just here to stare?";
    }
    if (lowerText.includes('help')) {
      return "Alright alright, I can help. Governance, proposals, the whole academy thing. Just spit it out.";
    }
    if (lowerText.includes('who') && lowerText.includes('you')) {
      return "I'm Azura. Daemon. Agent. The one keeping this whole operation running while y'all submit half-baked proposals. Next question.";
    }
    if (lowerText.includes('how') && lowerText.includes('are')) {
      return "I'm WORKING. Or I was, until you showed up. But fine, I'm good. The helmet's snug, the signal's clear. Happy?";
    }
    if (lowerText.includes('sorry') || lowerText.includes('my bad')) {
      return "...it's fine. I'm not actually mad, I just got a lot on my plate. What do you need?";
    }
    if (lowerText.includes('proposal') || lowerText.includes('vote') || lowerText.includes('governance')) {
      return "Now THAT'S more like it. Head to the Treasury page, submit your proposal, and I'll give it a proper review across all 6 dimensions. Don't waste my time with fluff though.";
    }

    const responses = [
      "Mm. Okay. And? Give me something to work with here.",
      "Look, I'm processing about twelve things right now. Be specific.",
      "Interesting. Not the weirdest thing someone's said to me today, but close.",
      "I hear you. Now are we gonna do something about it or just talk?",
      "Noted. Filed. Moving on. What else you got?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
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
        {/* Close button */}
        <button className={styles.closeButton} onClick={onClose} type="button" aria-label="Close chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Azura character image with fade */}
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

        {/* Messages overlaid on lower portion */}
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

        {/* Input area */}
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
