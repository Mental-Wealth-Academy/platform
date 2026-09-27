'use client';

import React from 'react';
import Image from 'next/image';
import styles from './BlueChatBubble.module.css';

const BLUE_AVATAR_SRC = '/blue/blue-avatar.png';

interface BlueChatBubbleProps {
  message: string;
  className?: string;
  variant?: 'default' | 'featured' | 'compact';
  avatarSrc?: string;
  avatarWidth?: number;
  avatarHeight?: number;
  pixelatedAvatar?: boolean;
  /** Optional eyebrow context shown after the name, e.g. "Review" -> "Blue · Review". */
  context?: string;
  /** Hides the "Blue" sender label under the avatar entirely. */
  hideSender?: boolean;
  ariaLive?: 'off' | 'polite' | 'assertive';
  /** On narrow screens, stack the avatar on top and center it instead of the
   *  side-by-side row (avoids the message text getting squished). */
  stackOnMobile?: boolean;
}

export default function BlueChatBubble({
  message,
  className = '',
  variant = 'default',
  avatarSrc = BLUE_AVATAR_SRC,
  avatarWidth = 72,
  avatarHeight = 48,
  pixelatedAvatar = false,
  context,
  hideSender = false,
  ariaLive = 'off',
  stackOnMobile = false,
}: BlueChatBubbleProps) {
  const variantClass =
    variant === 'featured'
      ? styles.featured
      : variant === 'compact'
        ? styles.compact
        : '';

  return (
    <div
      className={`${styles.shell} ${variantClass} ${stackOnMobile ? styles.stackMobile : ''} ${className}`}
      data-blue-chat-bubble="true"
      aria-live={ariaLive}
    >
      <div className={styles.avatarColumn}>
        <div className={`${styles.avatar} ${pixelatedAvatar ? styles.pixelatedAvatar : ''}`}>
          <Image src={avatarSrc} alt="Blue" width={avatarWidth} height={avatarHeight} unoptimized />
        </div>
        {!hideSender && (
          <span className={styles.sender}>
            Blue{context ? <span className={styles.context}> · {context}</span> : null}
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.bubble}>
          <p className={styles.message}>{message}</p>
        </div>
      </div>
    </div>
  );
}
