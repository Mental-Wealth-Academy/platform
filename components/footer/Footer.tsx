'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';

// Social Media Icons
const TwitterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 0C7.28467 0 6.944 0.011 5.877 0.06C4.812 0.108 4.081 0.278 3.45 0.525C2.795 0.785 2.236 1.127 1.677 1.686C1.118 2.245 0.776 2.804 0.516 3.459C0.269 4.09 0.099 4.821 0.051 5.886C0.002 6.953 -0.009 7.293 -0.009 10.009C-0.009 12.724 0.002 13.065 0.051 14.131C0.099 15.196 0.269 15.927 0.516 16.558C0.776 17.213 1.118 17.772 1.677 18.331C2.236 18.89 2.795 19.232 3.45 19.492C4.081 19.739 4.812 19.909 5.877 19.957C6.944 20.006 7.284 20.017 10 20.017C12.716 20.017 13.056 20.006 14.122 19.957C15.187 19.909 15.918 19.739 16.549 19.492C17.204 19.232 17.763 18.89 18.322 18.331C18.881 17.772 19.223 17.213 19.483 16.558C19.73 15.927 19.9 15.196 19.948 14.131C19.997 13.065 20.008 12.724 20.008 10.009C20.008 7.293 19.997 6.953 19.948 5.886C19.9 4.821 19.73 4.09 19.483 3.459C19.223 2.804 18.881 2.245 18.322 1.686C17.763 1.127 17.204 0.785 16.549 0.525C15.918 0.278 15.187 0.108 14.122 0.06C13.055 0.011 12.715 0 10 0ZM10 1.802C12.715 1.802 13.056 1.812 14.122 1.86C15.135 1.906 15.744 2.071 16.13 2.22C16.602 2.399 16.97 2.625 17.357 3.012C17.744 3.399 17.97 3.767 18.149 4.239C18.298 4.625 18.463 5.234 18.509 6.247C18.557 7.313 18.567 7.653 18.567 10.368C18.567 13.083 18.557 13.424 18.509 14.49C18.463 15.503 18.298 16.112 18.149 16.498C17.97 16.97 17.744 17.338 17.357 17.725C16.97 18.112 16.602 18.338 16.13 18.517C15.744 18.666 15.135 18.831 14.122 18.877C13.056 18.925 12.715 18.935 10 18.935C7.284 18.935 6.944 18.925 5.878 18.877C4.865 18.831 4.256 18.666 3.87 18.517C3.398 18.338 3.03 18.112 2.643 17.725C2.256 17.338 2.03 16.97 1.851 16.498C1.702 16.112 1.537 15.503 1.491 14.49C1.443 13.424 1.433 13.083 1.433 10.368C1.433 7.653 1.443 7.313 1.491 6.247C1.537 5.234 1.702 4.625 1.851 4.239C2.03 3.767 2.256 3.399 2.643 3.012C3.03 2.625 3.398 2.399 3.87 2.22C4.256 2.071 4.865 1.906 5.878 1.86C6.944 1.812 7.284 1.802 10 1.802ZM10 4.865C7.169 4.865 4.865 7.169 4.865 10C4.865 12.831 7.169 15.135 10 15.135C12.831 15.135 15.135 12.831 15.135 10C15.135 7.169 12.831 4.865 10 4.865ZM10 13.333C8.161 13.333 6.667 11.839 6.667 10C6.667 8.161 8.161 6.667 10 6.667C11.839 6.667 13.333 8.161 13.333 10C13.333 11.839 11.839 13.333 10 13.333ZM15.338 4.661C14.73 4.661 14.239 5.152 14.239 5.76C14.239 6.368 14.73 6.859 15.338 6.859C15.946 6.859 16.437 6.368 16.437 5.76C16.437 5.152 15.946 4.661 15.338 4.661Z" fill="currentColor"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor"/>
  </svg>
);

const data = [
  {
    title: 'About',
    links: [
      { label: 'Features', link: '/home' },
      { label: 'Quests', link: '/quests' },
      { label: 'Chapters', link: '/chapters' },
      { label: 'Support', link: 'https://mental-wealth-academy.gitbook.io/mental-wealth-academy-docs/' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'Contribute', link: '/home' },
      { label: 'Proposals', link: '/home' },
      { label: 'Governance', link: '/home' },
      { label: 'Docs', link: 'https://mental-wealth-academy.gitbook.io/mental-wealth-academy-docs/' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Follow on X', link: 'https://twitter.com' },
      { label: 'YouTube', link: 'https://youtube.com' },
      { label: 'Instagram', link: 'https://instagram.com' },
      { label: 'Newsletter', link: '#' },
    ],
  },
];

export function Footer() {
  const groups = data.map((group) => {
    const links = group.links.map((link, index) => {
      const isExternal = link.link.startsWith('http');
      const LinkComponent = isExternal ? 'a' : Link;
      const linkProps = isExternal
        ? { href: link.link, target: '_blank', rel: 'noopener noreferrer' }
        : { href: link.link };

      return (
        <LinkComponent
          key={index}
          className={styles.link}
          {...linkProps}
        >
          {link.label}
        </LinkComponent>
      );
    });

    return (
      <div className={styles.wrapper} key={group.title}>
        <div className={styles.title}>{group.title}</div>
        {links}
      </div>
    );
  });

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <Image
            src="/icons/mentalwealth-academy-logo.png"
            alt="Mental Wealth Academy"
            width={180}
            height={48}
            className={styles.logoImage}
            unoptimized
          />
          <p className={styles.description}>
            Building accessible mental health research infrastructure through community-governed funding and AI-driven care architecture.
          </p>
        </div>
        <div className={styles.groups}>{groups}</div>
      </div>
      <div className={styles.afterFooter}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Mental Wealth Academy. All rights reserved.
        </p>

        <div className={styles.social}>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialIcon}
            aria-label="Twitter"
          >
            <TwitterIcon />
          </a>
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialIcon}
            aria-label="YouTube"
          >
            <YouTubeIcon />
          </a>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialIcon}
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}

