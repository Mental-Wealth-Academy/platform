'use client';

import { useState } from 'react';
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

interface Skill {
  name: string;
  category: string;
  added: string;
  type: string;
  users: string;
  rating: string;
}

interface ArtStyle {
  id: string;
  name: string;
  description: string;
  mood: string;
  accent: string;
}

const ART_STYLES: ArtStyle[] = [
  {
    id: 'lab-aesthetic',
    name: 'Lab Aesthetic',
    description: 'Desaturated environment, almost grayscale rooms — library, research desk, dimly lit hallway. Azura always in the white lab coat. Single accent color per scene (her blue hair, a lamp\'s warm glow, a glowing monitor). No crowd scenes. No dramatic weather. Just her, thinking, observing, moving through quiet spaces.',
    mood: 'Contemplative, Quiet',
    accent: 'Single bright color',
  },
  {
    id: 'surveillance-aesthetic',
    name: 'Surveillance Aesthetic',
    description: 'Cinematic aerial drone shot looking through the window at Azura in her classroom taking notes. POV is from outside the school window, she is in the back of the classroom with other students. She\'s writing in a notebook at her desk, completely unaware she\'s being watched. Camera angle is slightly voyeuristic — surveillance footage aesthetic with subtle scan lines and a data overlay creeping in at the edges (heart rate: 82 BPM, mood analysis: slightly depressed, browsing history: Class-A4). Cold, calculating, intrusive spyware tone.',
    mood: 'Cold, Intrusive, Calculated',
    accent: 'Data overlays & scan lines',
  },
];

const SKILLS: Skill[] = [
  // AI & Automation
  { name: 'Self-Improving Skill Loop', category: 'AI & Automation', added: '2026-03-15', type: 'AUTO', users: '2,345', rating: '4.8%' },
  { name: 'Workflow Orchestration', category: 'AI & Automation', added: '2026-03-10', type: 'MULTI', users: '1,892', rating: '4.6%' },
  { name: 'Multi-Agent Collaboration', category: 'AI & Automation', added: '2026-03-08', type: 'AGENT', users: '1,245', rating: '4.7%' },
  { name: 'Memory & Learning System', category: 'AI & Automation', added: '2026-03-05', type: 'LEARN', users: '856', rating: '4.5%' },

  // Web & Data
  { name: 'Web Search & Data Extraction', category: 'Web & Data', added: '2026-02-28', type: 'WEB', users: '3,421', rating: '4.9%' },
  { name: 'Playwright Browser Automation', category: 'Web & Data', added: '2026-02-25', type: 'BROWSER', users: '2,156', rating: '4.8%' },
  { name: 'CSV Data Summarizer', category: 'Web & Data', added: '2026-02-20', type: 'DATA', users: '1,654', rating: '4.6%' },
  { name: 'Deep Research Assistant', category: 'Web & Data', added: '2026-02-18', type: 'RESEARCH', users: '945', rating: '4.7%' },
  { name: 'Article Extractor', category: 'Web & Data', added: '2026-02-15', type: 'EXTRACT', users: '1,123', rating: '4.5%' },
  { name: 'Metadata Extraction', category: 'Web & Data', added: '2026-02-12', type: 'META', users: '567', rating: '4.4%' },

  // Code & Development
  { name: 'Code Generation & Execution', category: 'Code & Development', added: '2026-02-10', type: 'CODE', users: '4,231', rating: '4.9%' },
  { name: 'MCP Server Builder', category: 'Code & Development', added: '2026-02-08', type: 'MCP', users: '1,876', rating: '4.7%' },
  { name: 'Git Pushing & Version Control', category: 'Code & Development', added: '2026-02-05', type: 'GIT', users: '2,543', rating: '4.8%' },
  { name: 'Skill Creator Framework', category: 'Code & Development', added: '2026-02-03', type: 'SKILL', users: '1,432', rating: '4.6%' },
  { name: 'AWS Deployment Skills', category: 'Code & Development', added: '2026-01-30', type: 'AWS', users: '987', rating: '4.5%' },
  { name: 'Changelog Generator', category: 'Code & Development', added: '2026-01-28', type: 'DOC', users: '845', rating: '4.4%' },
  { name: 'LangSmith Integration', category: 'Code & Development', added: '2026-01-25', type: 'LANG', users: '654', rating: '4.3%' },
  { name: 'Webapp Testing Framework', category: 'Code & Development', added: '2026-01-22', type: 'TEST', users: '1,234', rating: '4.6%' },

  // Terminal & System
  { name: 'Terminal/System Control', category: 'Terminal & System', added: '2026-01-20', type: 'SYS', users: '3,456', rating: '4.9%' },
  { name: 'File Organization & Management', category: 'Terminal & System', added: '2026-01-18', type: 'FILE', users: '2,234', rating: '4.7%' },
  { name: 'Computer Forensics', category: 'Terminal & System', added: '2026-01-15', type: 'FORENSIC', users: '432', rating: '4.2%' },
  { name: 'Threat Hunting with SIGMA', category: 'Terminal & System', added: '2026-01-12', type: 'SECURITY', users: '543', rating: '4.5%' },

  // Visualization & Design
  { name: 'Manim Animation Generation', category: 'Visualization & Design', added: '2026-01-10', type: 'VIZ', users: '2,123', rating: '4.8%' },
  { name: 'D3.js Visualization', category: 'Visualization & Design', added: '2026-01-08', type: 'D3', users: '1,654', rating: '4.6%' },
  { name: 'Canvas Design Tools', category: 'Visualization & Design', added: '2026-01-05', type: 'DESIGN', users: '1,345', rating: '4.7%' },
  { name: 'Theme Factory', category: 'Visualization & Design', added: '2026-01-03', type: 'THEME', users: '876', rating: '4.5%' },
  { name: 'Image Enhancer', category: 'Visualization & Design', added: '2025-12-30', type: 'IMAGE', users: '2,345', rating: '4.6%' },

  // Document Processing
  { name: 'DOCX Document Creator', category: 'Document Processing', added: '2025-12-28', type: 'DOCX', users: '3,234', rating: '4.8%' },
  { name: 'PDF Processing Engine', category: 'Document Processing', added: '2025-12-25', type: 'PDF', users: '4,123', rating: '4.9%' },
  { name: 'PPTX Presentation Builder', category: 'Document Processing', added: '2025-12-23', type: 'PPTX', users: '2,456', rating: '4.7%' },
  { name: 'XLSX Spreadsheet Generator', category: 'Document Processing', added: '2025-12-20', type: 'XLSX', users: '2,890', rating: '4.8%' },
  { name: 'Markdown to EPUB Converter', category: 'Document Processing', added: '2025-12-18', type: 'EPUB', users: '876', rating: '4.4%' },
  { name: 'Invoice Organizer', category: 'Document Processing', added: '2025-12-15', type: 'INVOICE', users: '1,234', rating: '4.5%' },

  // Business & Marketing
  { name: 'Competitive Ads Extractor', category: 'Business & Marketing', added: '2025-12-13', type: 'MARKETING', users: '1,567', rating: '4.6%' },
  { name: 'Domain Name Brainstormer', category: 'Business & Marketing', added: '2025-12-10', type: 'BRANDING', users: '987', rating: '4.3%' },
  { name: 'Lead Research Assistant', category: 'Business & Marketing', added: '2025-12-08', type: 'SALES', users: '2,123', rating: '4.7%' },
  { name: 'Brand Guidelines Generator', category: 'Business & Marketing', added: '2025-12-05', type: 'BRAND', users: '654', rating: '4.4%' },
  { name: 'Twitter Algorithm Optimizer', category: 'Business & Marketing', added: '2025-12-03', type: 'SOCIAL', users: '1,432', rating: '4.5%' },

  // Productivity & Writing
  { name: 'Content Research Writer', category: 'Productivity & Writing', added: '2025-11-30', type: 'CONTENT', users: '2,876', rating: '4.7%' },
  { name: 'Brainstorming Assistant', category: 'Productivity & Writing', added: '2025-11-28', type: 'IDEATION', users: '1,654', rating: '4.6%' },
  { name: 'Meeting Insights Analyzer', category: 'Productivity & Writing', added: '2025-11-25', type: 'MEETING', users: '1,345', rating: '4.5%' },
  { name: 'Tailored Resume Generator', category: 'Productivity & Writing', added: '2025-11-23', type: 'HR', users: '2,234', rating: '4.8%' },
  { name: 'Family History Researcher', category: 'Productivity & Writing', added: '2025-11-20', type: 'RESEARCH', users: '567', rating: '4.3%' },

  // Integration & APIs
  { name: 'Google Workspace Skills', category: 'Integration & APIs', added: '2025-11-18', type: 'GOOGLE', users: '3,456', rating: '4.8%' },
  { name: 'Slack GIF Creator', category: 'Integration & APIs', added: '2025-11-15', type: 'SLACK', users: '1,876', rating: '4.5%' },
  { name: 'NotebookLM Integration', category: 'Integration & APIs', added: '2025-11-13', type: 'NOTEBOOK', users: '987', rating: '4.6%' },
  { name: 'PostgreSQL Database Tools', category: 'Integration & APIs', added: '2025-11-10', type: 'DATABASE', users: '1,654', rating: '4.7%' },
  { name: 'n8n Automation Skills', category: 'Integration & APIs', added: '2025-11-08', type: 'AUTOMATION', users: '1,234', rating: '4.5%' },

  // Context & Management
  { name: 'Context Management', category: 'Context & Management', added: '2025-11-05', type: 'CTX', users: '2,345', rating: '4.8%' },
  { name: 'Root Cause Tracing', category: 'Context & Management', added: '2025-11-03', type: 'DEBUG', users: '1,432', rating: '4.6%' },
];

const CATEGORY_FILTERS = [
  'All Categories',
  'AI & Automation',
  'Web & Data',
  'Code & Development',
  'Terminal & System',
  'Visualization & Design',
  'Document Processing',
  'Business & Marketing',
  'Productivity & Writing',
  'Integration & APIs',
  'Context & Management',
];

export default function LibraryPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { play } = useSound();

  const filteredSkills = SKILLS.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All Categories' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
    setSidebarOpen(true);
    play('click');
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
    play('click');
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setFilterOpen(false);
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
              Decentralized Skills Marketplace — {SKILLS.length}+ Verified Skills
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

              {/* Featured Art Styles Section */}
              <div className={styles.featuredSection}>
                <h2 className={styles.featuredTitle}>Blue's AI Artstyles</h2>
                <div className={styles.artStylesContainer}>
                  {ART_STYLES.map((style) => (
                    <div key={style.id} className={styles.artStyleCard}>
                      <div className={styles.artStyleHeader}>
                        <h3 className={styles.artStyleName}>{style.name}</h3>
                        <span className={styles.artStyleMood}>{style.mood}</span>
                      </div>
                      <p className={styles.artStyleDescription}>{style.description}</p>
                      <div className={styles.artStyleFooter}>
                        <span className={styles.artStyleAccent}>Accent: {style.accent}</span>
                      </div>
                    </div>
                  ))}
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
                    placeholder="Search skills..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Category Filter Dropdown */}
                <div className={styles.filterDropdown}>
                  <button
                    className={styles.filterButton}
                    onClick={() => setFilterOpen(!filterOpen)}
                    onMouseEnter={() => play('hover')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                    <span className={styles.filterLabel}>
                      {selectedCategory === 'All Categories' ? 'All' : selectedCategory}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.filterChevron}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {filterOpen && (
                    <div className={styles.filterMenu}>
                      {CATEGORY_FILTERS.map((category) => (
                        <button
                          key={category}
                          className={`${styles.filterOption} ${
                            category === selectedCategory ? styles.filterOptionActive : ''
                          }`}
                          onClick={() => handleCategorySelect(category)}
                          onMouseEnter={() => play('hover')}
                        >
                          {category}
                          {category === selectedCategory && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Results Count */}
              <div className={styles.resultsInfo}>
                <p className={styles.resultsText}>
                  {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Excel Sheet Styled Skills Table */}
              <div className={styles.tableContainer}>
                <div className={styles.tableScroll}>
                  <table className={styles.skillsTable}>
                    <thead>
                      <tr>
                        <th>SKILL</th>
                        <th>CATEGORY</th>
                        <th>ADDED</th>
                        <th>TYPE</th>
                        <th>USERS</th>
                        <th>RATING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSkills.length > 0 ? (
                        filteredSkills.map((skill, idx) => (
                          <tr
                            key={idx}
                            onClick={() => handleSkillClick(skill)}
                            className={styles.tableRow}
                          >
                            <td>{skill.name}</td>
                            <td className={styles.categoryCell}>{skill.category}</td>
                            <td>{skill.added}</td>
                            <td>{skill.type}</td>
                            <td>{skill.users}</td>
                            <td>{skill.rating}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className={styles.emptyState}>
                            No skills found
                          </td>
                        </tr>
                      )}
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
                <p className={styles.skillCategory}>{selectedSkill.category}</p>

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
                  <p className={styles.detailLabel}>Users</p>
                  <p className={styles.detailValue}>{selectedSkill.users}</p>
                </div>

                <div className={styles.detailItem}>
                  <p className={styles.detailLabel}>Rating</p>
                  <p className={styles.detailValue}>{selectedSkill.rating}</p>
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
