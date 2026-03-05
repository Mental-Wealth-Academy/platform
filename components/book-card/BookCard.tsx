'use client';

import React from 'react';
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
    </div>
  );
};

export default BookCard;
