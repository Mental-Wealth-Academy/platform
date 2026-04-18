'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

// Asset imports from Figma
const FIGMA_ASSETS = {
  frameHero1: 'https://www.figma.com/api/mcp/asset/c9f5a7f9-a1eb-4e45-9fe1-2709009512ad',
  frameHero2: 'https://www.figma.com/api/mcp/asset/66537faf-70b4-4809-bbcb-c8d5d2fa6b97',
  frameGradient: 'https://www.figma.com/api/mcp/asset/30d7310b-a9d5-43b1-a549-c21add451f92',
  bgPattern1: 'https://www.figma.com/api/mcp/asset/ee0c351b-20b4-4123-960a-aa1fb732e1a4',
  bgPattern2: 'https://www.figma.com/api/mcp/asset/c6caeeb4-c17e-4885-8c17-8e52911dd477',
  sidebarBg: 'https://www.figma.com/api/mcp/asset/638a01aa-42be-4de1-ad3b-3930e13f9908',
  bgCard: 'https://www.figma.com/api/mcp/asset/95fb31be-9db0-499c-9f24-93d58143c2b7',
  subtract: 'https://www.figma.com/api/mcp/asset/872182de-2977-4300-82aa-3b3f0b6333d0',
  icon: 'https://www.figma.com/api/mcp/asset/8e59e433-0673-47eb-bf97-d29faeb09a42',
  line: 'https://www.figma.com/api/mcp/asset/6f198261-7347-4206-8b1f-5911da99dc65',
  searchIcon: 'https://www.figma.com/api/mcp/asset/3f280e4d-f86e-47f2-9d37-f02406cc8d64',
  iconRight: 'https://www.figma.com/api/mcp/asset/699b42e8-b249-40c5-a4e4-604552030d03',
};

const CATEGORY_BADGES = [
  { label: 'My Favorite (0)', highlighted: true },
  'Customer Service',
  'Finance & Accounts',
  'HR & Recruitment',
  'Human Resources',
  'Marketing',
  'Operations & Support',
  'Project Management',
  'Sales',
  'Strategy & Leadership',
];

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('My Favorite (0)');

  return (
    <div className={styles.container}>
      {/* Navbar Hero Section */}
      <div className={styles.navbar}>
        <div className={styles.heroCard}>
          <div className={styles.heroImageWrapper}>
            <img
              src={FIGMA_ASSETS.frameHero1}
              alt="Library Hero"
              className={styles.heroImage}
            />
            <img
              src={FIGMA_ASSETS.frameHero2}
              alt="Library Accent"
              className={styles.heroImage}
            />
          </div>
        </div>
      </div>

      {/* Hero Title Bar */}
      <div className={styles.titleBar}>
        <div className={styles.titleBackdrop}>
          <img
            src={FIGMA_ASSETS.frameGradient}
            alt=""
            className={styles.titleBgImage}
          />
        </div>
        <p className={styles.titleText}>
          The Onchain Digital Library Built To Reward Quality Information.
        </p>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <div className={styles.patternBg}>
            <img src={FIGMA_ASSETS.bgPattern1} alt="" />
          </div>

          {/* Sidebar */}
          <div className={styles.sidebar}>
            {/* Marketplace Details */}
            <div className={styles.detailsSection}>
              <div className={styles.tabsHeader}>
                <span>Details</span>
                <span>Collectors</span>
                <span>Links</span>
              </div>

              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Contract Address</p>
                <p className={styles.detailValue}>0x99879dswe2d3rdewer8hg98...345345</p>
              </div>

              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Blockchain</p>
                <p className={styles.detailValue}>Ethereum</p>
              </div>

              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Creator Royalties</p>
                <p className={styles.detailValue}>12.32%</p>
              </div>

              <div className={styles.detailItem}>
                <p className={styles.detailLabel}>Mint vector ID</p>
                <p className={styles.detailValue}>
                  0x0erj0w34jr03489jrth0w384erfow90erw9e8rh0w
                </p>
              </div>
            </div>

            {/* Description */}
            <p className={styles.descriptionText}>
              We use a community-driven consensus model to verify eligibility of creative work.{' '}
              <strong>Read more</strong> about how our DAO ensures ethical responsibility and
              representation of all digital work on the Mental Wealth Academy platform.
            </p>
          </div>

          {/* Main Library Section */}
          <div className={styles.librarySection}>
            {/* Search & Filters */}
            <div className={styles.filterCard}>
              <div className={styles.searchBox}>
                <img src={FIGMA_ASSETS.searchIcon} alt="Search" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search for books & classes"
                  className={styles.searchInput}
                />
              </div>

              {/* Category Badges */}
              <div className={styles.badgesContainer}>
                {CATEGORY_BADGES.map((badge) => (
                  <button
                    key={typeof badge === 'string' ? badge : badge.label}
                    onClick={() =>
                      setSelectedCategory(typeof badge === 'string' ? badge : badge.label)
                    }
                    className={`${styles.badge} ${
                      (typeof badge === 'string' ? badge : badge.label) === selectedCategory
                        ? styles.badgeActive
                        : styles.badgeInactive
                    }`}
                  >
                    {typeof badge === 'string' ? (
                      badge
                    ) : (
                      <>
                        <img src={FIGMA_ASSETS.icon} alt="Favorite Icon" />
                        {badge.label}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Library Grid */}
            <div className={styles.libraryGrid}>
              {/* Placeholder content - will be populated with actual library items */}
              <div className={styles.emptyState}>
                <p>Library content coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
