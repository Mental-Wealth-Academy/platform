'use client';

import { useState } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface Skill {
  name: string;
  model: string;
  api: string;
  users: string;
  rating: string;
  calls: string;
}

const SAMPLE_SKILLS: Skill[] = [
  { name: 'Self-Improving Skill Loop', model: '10/01/2025', api: 'AUTO', users: '2,345', rating: '4.8%', calls: '12.3%' },
  { name: 'Workflow Orchestration', model: '09/15/2025', api: 'MULTI', users: '1,892', rating: '4.6%', calls: '9.8%' },
  { name: 'Web Search & Data Extraction', model: '08/30/2025', api: 'WEB', users: '945', rating: '4.9%', calls: '15.2%' },
  { name: 'Code Generation & Execution', model: '08/22/2025', api: 'CODE', users: '567', rating: '4.7%', calls: '8.5%' },
  { name: 'Manim Animation Generation', model: '08/10/2025', api: 'VIZ', users: '3,421', rating: '4.5%', calls: '11.7%' },
  { name: 'Terminal/System Control', model: '07/28/2025', api: 'SYS', users: '2,156', rating: '4.8%', calls: '14.9%' },
  { name: 'BrowserAct Skills', model: '07/15/2025', api: 'BROWSER', users: '834', rating: '4.6%', calls: '10.2%' },
  { name: 'Architecture Diagram Generator', model: '06/30/2025', api: 'ARCH', users: '1,654', rating: '4.4%', calls: '7.3%' },
  { name: 'Context Management', model: '06/15/2025', api: 'CTX', users: '1,200', rating: '4.7%', calls: '13.5%' },
];

const CATEGORY_BADGES = [
  'Top Skills',
  'Native/Core',
  'Marketplace',
  'Behavioral',
  'Trusted',
  'Popular',
  'Recent',
];

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('Top Skills');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { play } = useSound();

  const filteredSkills = SAMPLE_SKILLS.filter((skill) =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setSidebarOpen(true);
    play('click');
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    play('click');
  };

  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <div className={styles.container}>
          {/* Top Banner */}
          <div className={styles.topBanner}>
            <p className={styles.bannerText}>
              The Onchain Digital Library — Decentralized Skills &amp; Marketplace
            </p>
          </div>

          {/* Main Content Area */}
          <div className={styles.contentWrapper}>
            {/* Left Content Area */}
            <div className={styles.mainArea}>
              {/* Header Section */}
              <div className={styles.headerSection}>
                <h1 className={styles.title}>Skills</h1>
                <button className={styles.scanButton}>New Scan</button>
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
                    placeholder="Search skills..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Category Badges */}
                <div className={styles.badgesContainer}>
                  {CATEGORY_BADGES.map((badge) => (
                    <button
                      key={badge}
                      onClick={() => {
                        setSelectedCategory(badge);
                        play('hover');
                      }}
                      className={`${styles.badge} ${
                        badge === selectedCategory ? styles.badgeActive : styles.badgeInactive
                      }`}
                    >
                      {badge}
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
                        <th>SKILL</th>
                        <th>ADDED</th>
                        <th>TYPE</th>
                        <th>USERS</th>
                        <th>RATING</th>
                        <th>USAGE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkills.map((skill, idx) => (
                        <tr
                          key={idx}
                          onClick={() => handleSkillClick(skill)}
                          className={styles.tableRow}
                        >
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
          </div>
        </div>

        {/* Details Sidebar - Slide In Modal */}
        <div className={`${styles.sidebarOverlay} ${sidebarOpen ? styles.sidebarOpen : ''}`} onClick={handleCloseSidebar} />
        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          {selectedSkill && (
            <>
              <button className={styles.closeButton} onClick={handleCloseSidebar}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div className={styles.detailsSection}>
                <h2 className={styles.skillTitle}>{selectedSkill.name}</h2>

                <div className={styles.tabsHeader}>
                  <span>Details</span>
                  <span>Docs</span>
                  <span>Links</span>
                </div>

                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Contract</p>
                  <p className={styles.detailValue}>0x99879dswe2d3rdewer8hg98...345345</p>
                </div>

                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Chain</p>
                  <p className={styles.detailValue}>Ethereum</p>
                </div>

                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Royalties</p>
                  <p className={styles.detailValue}>12.32%</p>
                </div>

                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Mint ID</p>
                  <p className={styles.detailValue}>
                    0x0erj0w34jr03489jrth0w384erfow90erw9e8rh0w
                  </p>
                </div>
              </div>

              <p className={styles.descriptionText}>
                Community-verified skill. <strong>Learn more</strong> about how the DAO ensures quality.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
