'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import styles from './BookReaderModal.module.css';

interface BookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  author: string;
  markdownPath: string;
  slug: string;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  username: string | null;
  avatar_url: string | null;
}

interface UserInfo {
  username: string | null;
  avatarUrl: string | null;
}

function parseMarkdown(md: string): string {
  let html = md
    .replace(/^---$/gm, '<hr />')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');

  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(?<!<\/ul>)\n((?:<li>.*<\/li>\n?)+)/g, '\n<ol>$1</ol>');

  html = html
    .split('\n\n')
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const BookReaderModal: React.FC<BookReaderModalProps> = ({ isOpen, onClose, title, author, markdownPath, slug }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || markdown) return;
    fetch(markdownPath)
      .then(res => res.text())
      .then(setMarkdown)
      .catch(err => console.error('Failed to load reading:', err));
  }, [isOpen, markdownPath, markdown]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/readings/comments?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.comments) setComments(data.comments);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }, [slug]);

  useEffect(() => {
    if (!isOpen) return;
    fetchComments();
    fetch('/api/me', { credentials: 'include', cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser({ username: data.user.username, avatarUrl: data.user.avatarUrl });
      })
      .catch(() => {});
  }, [isOpen, fetchComments]);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/readings/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug, comment: newComment }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewComment('');
        fetchComments();
      } else {
        alert(data.error || 'Failed to post comment.');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const htmlContent = useMemo(() => parseMarkdown(markdown), [markdown]);

  if (!shouldRender) return null;

  const displayName = (username: string | null) =>
    username && !username.startsWith('user_') ? username : 'Anonymous';

  return (
    <>
      <div className={`${styles.backdrop} ${isAnimating ? styles.backdropVisible : ''}`} onClick={onClose} />
      <div className={`${styles.modal} ${isAnimating ? styles.modalOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>{title}</h2>
            <p className={styles.headerAuthor}>{author}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: htmlContent }} />

          {/* Comments Section */}
          <div className={styles.commentsSection}>
            <h3 className={styles.commentsTitle}>Discussion ({comments.length})</h3>

            {user && (
              <div className={styles.commentForm}>
                <div className={styles.commentFormAvatar}>
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" width={32} height={32} className={styles.avatar} />
                  ) : (
                    <div className={styles.avatarFallback}>
                      {displayName(user.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={styles.commentFormInput}>
                  <textarea
                    className={styles.commentTextarea}
                    placeholder="Share your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={1000}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <button
                    className={styles.commentSubmit}
                    onClick={handleSubmitComment}
                    disabled={isSubmitting || !newComment.trim()}
                    type="button"
                  >
                    {isSubmitting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {!user && (
              <p className={styles.signInPrompt}>Sign in to join the discussion.</p>
            )}

            <div className={styles.commentsList}>
              {comments.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentAvatar}>
                    {c.avatar_url ? (
                      <Image src={c.avatar_url} alt="" width={28} height={28} className={styles.avatar} />
                    ) : (
                      <div className={styles.avatarFallbackSmall}>
                        {displayName(c.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentAuthor}>{displayName(c.username)}</span>
                      <span className={styles.commentTime}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p className={styles.commentText}>{c.body}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className={styles.noComments}>No comments yet. Be the first to share your thoughts.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookReaderModal;
