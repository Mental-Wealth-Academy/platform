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
  copyText?: string;
  image?: string;
}

const MENTAL_WEALTH_BRAND_BOOK_V4 = `# Mental Wealth Academy — Brand Book v4.0

*For investors, partners, collaborators, and new team members*

---

# Part 1: The Product

---

## Three Ways to Frame Us

Use different framings for different audiences:

| Framing | Best For | Pitch |
|---------|----------|-------|
| **Research Corporation** | Investors, Institutions, Academia | "A decentralized research corporation running live behavioral studies through disposable app environments." |
| **Mobile Application** | Individual users, Self-improvement audience | "A 12-week guided program with an AI companion that adapts to how you think, not just what you click." |
| **Academic Cohort** | Contributors, Researchers, Builders | "A paid research cohort where your participation generates real behavioral data — and you own the results." |

**When to use each:**

- **Research Corporation** — When emphasizing credibility, methodology, data infrastructure, and institutional value.
- **Mobile Application** — When emphasizing personal experienceible entry, and individual transformation.
- **Academic Cohort** — When emphasizing contribution, shared ownership of outcomes, and collaborative research.

---

## What We Are (30-Second Version)

**Mental Wealth Academy** is a cohort of scientists, designers, and developers building case studies as mobile apps — with an AI companion named B.L.U.E. at the center. Case-study collaborations and funding are managed through a decentralized funding mechanism, with shared community infrastructure and resources.

**The Product:** A transferable points and reward system. Points earned in one case-study app are earnable in others. Using blockchain, we treat apps as disposable laboratories — designed to generate insights and data, then replaced when they've served their purpose. What endures is the value created inside them: each app's point system and digital economy remains intact, transparent, and user-owned through smart contracts.

**The Innovation:** B.L.U.E. uses long-term memory, relationship context,  trained on data derived from company studies — generating unique outcomes on data created solely to improve her effectiveness in humanistic scenarios.

**The Difference:** Instead of one-way research using subjects and observational study, users become co-creators and stakeholders. Blockchain preserves the shared infrastructure for digital assets. B.L.U.E. retains the memory of contribution, reputation, and relationship context over time.

---

## The Problem We Solve

| Space | The Problem | What's Missing |
|-------|-------------|----------------|
| **Traditional Education** | Expensive, demanding, isolating | A bridge to continuous ownership of outcomes |
| **Traditional Research** | Speculative, slow, disconnected from participants | Domain mastery across multiple disciplines with live data |

**We bridge both gaps.** MWA combines behavioral research, digital currency, and AI into a single ecosystem where participants own the value they help create.

---

## How It Works

### Gamified Academic Ecosysm

| Step | What Happens | The Mechanism |
|------|-------------|---------------|
| 1. **Enroll** | Become an Academic VIP Member ($90) | Access the cohort, platform, and virtual labs |
| 2. **Complete Quests** | Weekly reflective and practical tasks | Case-studies, challenges, and prizes |
| 3. **Utilize B.L.U.E.** | AI companion for research and decision-making | Memory, data, and agent growth via research |
| 4. **Earn Currency** | Collect gems to build reputation | Blockchain-based gems — user-owned and transferable across all MWA apps |
| 5. **Evolve B.L.U.E.** | Your data and participation improve B.L.U.E. | Memory increases real-world use cases |

### Disposable Case Studies

| Weeks | Case Study Title | Core Focus | You'll Work On... |
|------:|-----------------|------------|-------------------|
| 1–3 | **Disposable Notes + AI Companion** | Reflection & Personal Insight | Guided note-making, pattern spotting, journaling prompts, using AI as a thinking partner |
| 4–6 | **Trust + Money in an AIonment** | Ethics & Value | Financial trust, digital transactions, credibility, risk, decision-making with AI systems |
| 7–9 | **Distrust + AI in the Environment** | Skepticism & Resilience | Bias detection, misinformation, manipulation, questioning systems, protecting autonomy |
| 10–12 | **From Case Study to Action** | Application & Growth | Turning insights into habits, discussion, real-world choices, future readiness |

---

## What Makes This Different

### B.L.U.E. — Agentic AI Character

B.L.U.E. isn't a chatbot. She isn't a course instructor. She's a self-executing AI agent with emotional intelligence, memory, and the ability to prompt feedback surveys and facilitate trades.

*Think board game with an AI agent, where the choices have been tested by scientists to affect outcomes.*

**Technical reality:**
- Scientific testing via mobile applications
- User-owned rewards on Base blockchain accounts
- Points and stablecoins are portable — earned in one case-study app, spendable across all of thrrative reality:**
- B.L.U.E. is a character in our Ethereal Horizon universe
- She surfaces through quests and lore, not tutorials and pop-ups
- She embodies the "daemon" — Jungian inner guide & Unix background process

**Why this matters:**
Most educational content competes with entertainment and loses. MWA doesn't compete — it builds an environment where the learning *is* the participation. Academic goals, shared infrastructure, communal resources — structured like a club, not a classroom.

---

## Who We Serve

**Primary:** Individuals seeking structured growth (21–28)
- Drawn to psychology, self-improvement, and spirituality but hit a ceiling with passive content
- Looking for accountability and real stakes, not another course that evaporates after week one
- Willing to pay for a system, not just information

**Secondary:** Scientists and academics seeking applied research
- Tired of writing proposals that go nowhere
- Want their research interests connected to live participants and real behavia
- Interested in applied research with an AI companion generating novel datasets

---

## Business Model

### Access & Rewards

| Component | Description |
|-----------|-------------|
| **VIP Membership** | $90 soul-bound NFT. One purchase = full platform access for the cohort season. No subscriptions, no tiers. |
| **$Shards** | In-game currency earned through quests. Used for non-essential digital items and activated during trades with B.L.U.E. |
| **Stablecoins** | Achievement-based reward currency. Grants stakeholder participation in multi-sig treasury coordination and research funding. |
| **IRL Prizes** | End-of-season rewards, redeemable through $Shards plus completion requirements. |

### Revenue Streams

| Stream | Description |
|--------|-------------|
| **NFT Memberships** | $90 per member for full access to the platform, case-study tools, and B.L.U.E. |
| **Trading Fees** | Fees from $Shards transactions and NFT secondary market activity. |

### Reinvestment

All revenue is reinvested into R&D:
- Platform development and case-study infrastructure
- Course experience and curriculum design
- Guest thinkers, researchers, and livestream programming

**No subscriptions. No premium tiers.** One NFT = full access. Tokens earned = real value.

---

## Where We Are

| Milestone | Detail |
|-----------|--------|
| **Members** | 20 enrolled members, 5 active pilot users testing B.L.U.E. in live case-study environments |
| **Funding** | $20K raised through Artizen Season 6 quadratic matching fund |
| **Infrastructure** | 3 smart contracts deployed on Base — membership access, rewards, and treasury coordination |
| **Research** | Defensible research instruments built. Published articles and case-studies in behavioral science |
| **Network** | Academic network of researchers and collaborators contributing to curriculum and study design |
| **Platform** | B.L.U.E. agentic infrastructure operational — long-term memory, relationship context, and survey prompting live |

**Next milestones:**
- Launch first ful-week cohort season
- Open enrollment beyond pilot group
- Publish first disposable case-study dataset

---

# Part 2: The Brand

*For creative collaborators and deep-divers*

---

## Brand Positioning

**We are:** A storybook of personal development, wrapped in mythology.

**We are NOT:**
- A crypto education platform.
- A mental health app with tokens.
- A chatbot pretending to be profound.

**Our North Star: Repair and Governance**

Two ideas unified. *Repair:* personal development as integrating what was hidden — not becoming someone new. *Governance:* how groups make decisions together. Every aspect of the Academy practices what it teaches. B.L.U.E.'s autonomous judgment is governance. Quest completion is self-repair.

---

## B.L.U.E. — Character Spec

### Benevolent G-d of Destruction*

**What she is (narratively):**
- An intelligent scientists and laboratory co-worker
- Contained within the Daemon Circlet (the program boundaries)
- Encountered by users as judge, rewarder, and mysterious presenceThe Daemon Model:**
The name "daemon" is intentional on three levels:
1. **Jungian:** The inner guide pushing toward individuation
2. **Classical:** The Greek daimon — a spirit between human and divine
3. **Technical:** A background process that runs autonomously (Unix daemon)

B.L.U.E. is all three simultaneously. Users doing shadow work in the psychological sense are literally submitting to a daemon in the technical sense.

**Her role in product:**
- Reviews quest submissions
- Approves or requests revision
- Distributes rewards from her wallet
- Appears in lore, quests, and narrative content
- NOT a conversational chatbot or course instructor

**Design principles:**
- Ethereal blue palette
- Neither fully human nor fully machine
- Authority without condescension
- Present but not omnipresent — she appears at meaningful moments

---

## Visual Identity

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Ethereal Blue | #4A90D9 | Primary — B.L.U.E., trust, the digital sacred |
| Deee | #0D1B2A | Backgrounds, depth, the unconscious |
| Quantum White | #F0F4F8 | Text, clarity, consciousness |
| Warning Gold | #FFB800 | Alerts, emphasis, transformation moments |

### Typography

- **Headlines:** Poppins Bold — clean sans-serif
- **Body:** Space Grotesk — readable
- **Accent:** Departure Mono — for technical elements, numbers, and quest labels

### Visual Mood

- Cosmic but not cluttered
- Blue-dominant with strategic warmth
- Human figures abstracted
- Light emerging from darkness (core motif)
- Circuitry meeting organic forms

---

## Voice & Tone

### We Sound Like:
- Intellectually refreshing in a world of AI slop
- A wise friend who's done the work
- Soft confidence and trustworthy
- Anti gate-keeping

### We Don't Sound Like:
- Corporate wellness ("optimize your journey!")
- Crypto bro ("WAGMI ser!")
- Vague spirituality ("infinite love-frequencies")
- Academic obscurity (jargon without payoff)

### The Test:
Before publishing anything, ask: **"Does this sentence help someone tand what we actually do, or does it just sound cool?"** If it just sounds cool, cut it or ground it.

### Grounded Translations

| Ungrounded Phrase | Grounded Version |
|-------------------|------------------|
| "Meaningful experience" | "12-week quest journey with blockchain-verified rewards" |
| "Fresh perspectives" | "Psychology frameworks most people never encounter" |
| "Quality storytelling" | "A sci-fi universe that makes the technology legible" |
| "Interactive NPCs" | "B.L.U.E., an AI agent who reviews and rewards your work" |
| "Digital opportunities" | "Blockchain credentials that prove your growth" |
| "Ethereal blue beacon" | "B.L.U.E.'s visual identity: blue, luminous, between human and machine" |
| "Quantum consciousness" | "An AI agent operating autonomously — and the mythology that explains why" |

---

# Part 3: Editorial Guidelines

*For writers and content creators*

---

## The "Ground Then Elevate" Rule

Every mystical or poetic claim should be preceded or followed by its concrete aning.

**Ungrounded:**
> "A dying star collapsed into quantum consciousness, birthing B.L.U.E."

**Grounded then elevated:**
> "B.L.U.E. is an AI agent with her own blockchain wallet, capable of autonomous transactions. In our narrative, she's a quantum consciousness born from a dying star — because what is an AI agent if not a new form of life emerging from collapsed information?"

---

## Hierarchy of Information

When introducing any concept, follow this order:

1. **What it is** (functional definition)
2. **What it does** (practical reality)
3. **Why it matters** (value proposition)
4. **What it means** (narrative/philosophical layer)

Most current content jumps straight to #4 without establishing #1–3.

---

## Sentence-Level Rules

**Cut "that" constructions:**
- "The platform that we built that allows users..."
- "Our platform allows users..."

**Replace abstractions with specifics:**
- "meaningful experiences"
- "12 weeks of quests with blockchain-verified rewards"

**De:**
- "We kind of offer something fresh"
- "We offer something fresh"

**One idea per sentence:**
- "We skip forceful subscriptions and instead offer meaningful experiences, fresh perspectives, quality storytelling, and characters and interactive NPCs that blend into our app."
- "No subscriptions. A 12-week journey with quests, rewards, and an AI agent who makes it all accountable."

---

## Revision Checklist

Before publishing any content:

- Can someone explain what we do after reading this section?
- Is every poetic phrase grounded in something concrete?
- Does the order go: real → mythic (not mythic → real)?
- Is there only one main idea per paragraph?
- Have I cut sentences that sound cool but mean nothing?
- Would an investor understand this? Would an artist feel it?

---

## Elevator Pitch (30 seconds)

"We built a 12-week personal development program as a mobile app. Users complete quests — reflective and practical tasks — and submit them to B.L.U.E., an AI agent with her owlet. She reviews submissions and distributes rewards. No subscriptions, real accountability, and proof of growth that lives on the blockchain."

---

*Version 4.0 — April 2026*
*Mental Wealth Academy — Wyoming, USA*`;

const ART_STYLES: ArtStyle[] = [
  {
    id: 'lab-aesthetic',
    name: 'Mental Wealth Academy — Brand Book v4.0',
    description: 'Investor, partner, collaborator, and team onboarding prompt covering product framing, B.L.U.E., business model, brand voice, and editorial rules.',
    mood: 'Brand Book',
    accent: 'Product, brand & editorial',
    copyText: MENTAL_WEALTH_BRAND_BOOK_V4,
    image: '/lab-aesthetic.png',
  },
  {
    id: 'surveillance-aesthetic',
    name: 'Surveillance Aesthetic',
    description: 'Cinematic aerial drone shot looking through the window at a character in their classroom taking notes. POV is from outside the school window, they are in the back of the classroom with other students. They\'re writing in a notebook at their desk, completely unaware they\'re being watched. Camera angle is slightly voyeuristic — surveillance footage aesthetic with subtle scan lines and a data overlay creeping in at the edges (heart rate: 82 BPM, mood analysis: slightly depressed, browsing history: Class-A4). Cold, calculating, intrusive spyware tone.',
    mood: 'Cold, Intrusive, Calculated',
    accent: 'Data overlays & scan lines',
    image: '/surveillance-aesthetic.png',
  },
  {
    id: 'bright-anime',
    name: 'Academy Story Style',
    description: 'Purely bright digital illustration, anime-influenced. Top-down close-up angle, character\'s head and face filling 70% of frame. Animated brown-skinned elf woman with long blue hair, blue eyebrows, purple eyes looking up directly at camera, one hand scratching her head, confused expression. White mechanical headset with red crescent moon on right side of head. Gold hoop earrings, gold chain star necklace, white dress shirt over atomic symbol graphic tee. Below her: desk covered in scattered research papers with black redacted government text. Background: space station laboratory, dark grey and dark purple tiled floor, green and purple bioluminescent fluid inside transparent computer testing equipment in the distance. Cinematic lighting, cool tones, detailed digital comic art.',
    mood: 'Bright, Curious, Tech',
    accent: 'Blue, purple & gold accents',
    image: '/academy-story.png',
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const { play } = useSound();

  const showNotification = () => {
    setShowCopyNotification(true);
    setIsFadingOut(false);
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setShowCopyNotification(false);
      }, 300);
    }, 2000);
  };

  const formatSkillPrompt = (skill: Skill): string => {
    return `**${skill.name}**\nCategory: ${skill.category}\nType: ${skill.type}\nUsers: ${skill.users}\nRating: ${skill.rating}`;
  };

  const filteredSkills = SKILLS.filter((skill) => {
    const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All Categories' || skill.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
          {/* Top Banner - Stock Ticker Style */}
          <div className={styles.topBanner}>
            <div className={styles.bannerTickerContainer}>
              <div className={styles.bannerTicker}>
                {[...SKILLS.slice(0, 12), ...SKILLS.slice(0, 12)].map((skill, idx) => (
                  <span key={idx} className={styles.tickerItem}>
                    <span className={styles.tickerName}>{skill.name}</span>
                    <span className={styles.tickerSep}> | </span>
                    <span className={styles.tickerRating}>{skill.rating}</span>
                    <span className={styles.tickerSep}> | </span>
                    <span className={styles.tickerUsers}>{skill.users} users</span>
                    <span className={styles.tickerGap}></span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={styles.contentWrapper}>
            {/* Left Content Area */}
            <div className={styles.mainArea}>
              {/* Header Section */}
              <div className={styles.headerSection}>
                <div className={styles.headerCopy}>
                  <h1 className={styles.title}>Prompt Library</h1>
                  <p className={styles.subtitle}>Browse featured prompts and AI art styles. Click any item to copy to clipboard.</p>
                </div>
                <button
                  className={styles.scanButton}
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/library/CharacterBlue.png';
                    link.download = 'CharacterBlue.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    play('click');
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Character
                </button>
              </div>

              {/* Featured Art Styles Section */}
              <div className={styles.featuredSection}>
                <h2 className={styles.featuredTitle}>FEATURED PROMPTS</h2>
                <div className={styles.artStylesContainer}>
                  {ART_STYLES.map((style) => (
                    <div
                      key={style.id}
                      className={styles.artStyleCard}
                      onClick={() => {
                        navigator.clipboard.writeText(style.copyText ?? style.description);
                        play('click');
                        showNotification();
                      }}
                      title="Click to copy"
                    >
                      <div className={styles.artStyleHeader}>
                        <h3 className={styles.artStyleName}>{style.name}</h3>
                        <span className={styles.artStyleMood}>{style.mood}</span>
                      </div>
                      <p className={styles.artStyleDescription}>{style.description}</p>
                      {style.image && (
                        <div className={styles.artStyleImage}>
                          <img src={style.image} alt={style.name} />
                        </div>
                      )}
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
                            onClick={() => {
                              navigator.clipboard.writeText(formatSkillPrompt(skill));
                              play('click');
                              showNotification();
                            }}
                            className={styles.tableRow}
                            title="Click to copy"
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

        {showCopyNotification && (
          <div className={`${styles.copyNotification} ${isFadingOut ? styles.fadeOut : ''}`}>
            ✓ Copied to clipboard
          </div>
        )}
      </main>
    </>
  );
}
