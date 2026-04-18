'use client';

import { useState } from 'react';
import styles from './page.module.css';

const SAMPLE_SKILLS = [
  { name: 'SKILLS', model: 'CLAUDE', api: 'API', users: '0.00', rating: '0.0%', calls: '0.0%' },
  { name: 'BLOCKCHAIN', model: '10/01/2025', api: 'SOL', users: '2,345', rating: '4.8%', calls: '12.3%' },
  { name: 'WEB3', model: '09/15/2025', api: 'ETH', users: '1,892', rating: '4.6%', calls: '9.8%' },
  { name: 'DEFI', model: '08/30/2025', api: 'USDC', users: '945', rating: '4.9%', calls: '15.2%' },
  { name: 'SMART CONTRACTS', model: '08/22/2025', api: 'CONTRACT', users: '567', rating: '4.7%', calls: '8.5%' },
  { name: 'WALLET SECURITY', model: '08/10/2025', api: 'SECURE', users: '3,421', rating: '4.5%', calls: '11.7%' },
  { name: 'TRADING', model: '07/28/2025', api: 'TRADE', users: '2,156', rating: '4.8%', calls: '14.9%' },
  { name: 'GOVERNANCE', model: '07/15/2025', api: 'DAO', users: '834', rating: '4.6%', calls: '10.2%' },
  { name: 'NFT', model: '06/30/2025', api: 'NFT', users: '1,654', rating: '4.4%', calls: '7.3%' },
];

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
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSkills = SAMPLE_SKILLS.filter(skill =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {/* Top Banner */}
      <div className={styles.topBanner}>
        <p className={styles.bannerText}>
          The Onchain Digital Library Built To Reward Quality Information.
        </p>
      </div>

      {/* Main Content Wrapper */}
      <div className={styles.contentWrapper}>
        {/* Left Content Area */}
        <div className={styles.mainArea}>
          {/* Header Section */}
          <div className={styles.headerSection}>
            <div className={styles.titleGroup}>
              <h1 className={styles.title}>Skill Library</h1>
              <button className={styles.scanButton}>Scan Prompts</button>
            </div>
            <div className={styles.scanDetails}>
              <p className={styles.scanLabel}>MIRROR-S1 SCAN DETAILS</p>
              <p className={styles.scanInfo}>
                <span>Azure V.12</span> - 3.5MB - July 20, 2025
              </p>
            </div>
          </div>

          {/* Search & Filter Section */}
          <div className={styles.filterSection}>
            <div className={styles.searchBox}>
              <svg
                className={styles.searchIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search for books & classes"
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  {typeof badge === 'string' ? badge : badge.label}
                </button>
              ))}
            </div>
          </div>

          {/* Excel Sheet Styled Skills Table */}
          <div className={styles.tableContainer}>
            <div className={styles.tableScroll}>
              <table className={styles.skillsTable}>
                <thead>
                  <tr>
                    <th>SKILLS</th>
                    <th>MODEL</th>
                    <th>API</th>
                    <th>USERS</th>
                    <th>RATING</th>
                    <th>CALLS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSkills.map((skill, idx) => (
                    <tr key={idx} className={idx === 0 ? styles.headerRow : ''}>
                      <td>{skill.name}</td>
                      <td>{skill.model}</td>
                      <td>{skill.api}</td>
                      <td>{skill.users}</td>
                      <td>{skill.rating}</td>
                      <td>{skill.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className={styles.sidebar}>
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

          <p className={styles.descriptionText}>
            We use a community-driven consensus model to verify eligibility of creative work.{' '}
            <strong>Read more</strong> about how our DAO ensures ethical responsibility and
            representation of all digital work on the Mental Wealth Academy platform.
          </p>
        </div>
      </div>
    </div>
  );
}
