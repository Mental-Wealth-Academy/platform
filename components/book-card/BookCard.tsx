'use client';

import React, { useState } from 'react';
import styles from './BookCard.module.css';

interface BookCardProps {
  title?: string;
  author?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  slug?: string;
  onReadClick?: (slug: string) => void;
}

const BookCard: React.FC<BookCardProps> = ({
  title = "Web3 Education",
  author = "By: Jhinn Bay",
  description = "Explore the transformative power of blockchain technology.",
  category = "Non-Fiction",
  imageUrl = "https://i.imgur.com/4K6QZ8k.png",
  slug = "",
  onReadClick,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${title} — ${author}\n\n${description}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCardClick = () => {
    if (onReadClick && slug) {
      onReadClick(slug);
    }
  };

  return (
    <div className={styles.bookCard}>
      <div
        className={styles.cardClickable}
        onClick={handleCardClick}
        role={slug ? 'button' : undefined}
        tabIndex={slug ? 0 : undefined}
        onKeyDown={slug ? (e) => { if (e.key === 'Enter') handleCardClick(); } : undefined}
      >
        <div className={styles.header}>
          <div
            className={styles.bookImage}
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <button
            className={styles.copyButton}
            onClick={handleCopy}
            type="button"
            aria-label="Copy reading info"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M15 4.5L6.75 12.75L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M12 6.75V3C12 2.17157 11.3284 1.5 10.5 1.5H3C2.17157 1.5 1.5 2.17157 1.5 3V10.5C1.5 11.3284 2.17157 12 3 12H6.75M12 6.75H15C15.8284 6.75 16.5 7.42157 16.5 8.25V15C16.5 15.8284 15.8284 16.5 15 16.5H8.25C7.42157 16.5 6.75 15.8284 6.75 15V12M12 6.75H8.25C7.42157 6.75 6.75 7.42157 6.75 8.25V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.author}>{author}</p>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.footer}>
          <div className={styles.category}>
            <div className={styles.categoryDot} />
            <span className={styles.categoryText}>{category}</span>
          </div>
          {slug && (
            <span className={styles.readLink}>
              Read article
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionBarLeft}>
          <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={styles.starButton}
                aria-label={`Rate ${star} stars`}
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={styles.starIcon}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.actionBarRight}>
          <button className={styles.commentButton} type="button" aria-label="View comments" onClick={(e) => e.stopPropagation()}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={styles.actionIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </button>
          <div className={styles.saveButtonWrapper}>
            <button className={styles.saveButton} type="button" aria-label="Save to reading list" onClick={(e) => e.stopPropagation()}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={styles.actionIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              <span className={styles.saveText}>Save</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={styles.chevronIcon}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCard;
