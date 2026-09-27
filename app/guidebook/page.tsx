'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

const sections = [
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'home-dashboard', title: 'Home Dashboard' },
  { id: 'course-system', title: 'Course System' },
  { id: 'quests', title: 'Quests' },
  { id: 'surveys', title: 'Psychology Surveys' },
  { id: 'blue-ai-assistant', title: 'Blue AI Assistant' },
  { id: 'profile-streaks', title: 'Profile & Streaks' },
  { id: 'prompt-skill-library', title: 'Prompt & Skill Library' },
  { id: 'livestream', title: 'Live Sessions' },
  { id: 'integrations', title: 'Integrations' },
  { id: 'diamond-economy', title: 'Diamond Economy' },
  { id: 'faq', title: 'FAQ & Troubleshooting' },
];

function SectionLink({ id, title, active }: { id: string; title: string; active: boolean }) {
  return (
    <a
      href={`#${id}`}
      className={active ? styles.linkActive : styles.link}
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      {title}
    </a>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((h) => <th key={h} className={styles.th}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => <td key={j} className={styles.td}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className={styles.p}>{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className={styles.strong}>{children}</strong>;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className={styles.h2}>{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className={styles.h3}>{children}</h3>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className={styles.ul}>{children}</ul>;
}

function Ol({ children }: { children: React.ReactNode }) {
  return <ol className={styles.ol}>{children}</ol>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className={styles.li}>{children}</li>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className={styles.code}>{children}</code>;
}

function Callout({ children }: { children: React.ReactNode }) {
  return <div className={styles.callout}>{children}</div>;
}

export default function GuidebookPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.container}>
      <nav className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarTitle}>Guidebook</div>
          {sections.map((s) => (
            <SectionLink key={s.id} id={s.id} title={s.title} active={activeSection === s.id} />
          ))}
        </div>
      </nav>

      <main className={styles.main}>
        <h1 className={styles.h1}>MWA Guidebook</h1>
        <p className={styles.subtitle}>
          Everything you need to know about the platform. From your first login to advanced features.
        </p>

        <p className={styles.linksBar}>
          <Strong>Website:</Strong>{' '}
          <a href="https://www.mentalwealthacademy.world" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
            mentalwealthacademy.world
          </a>
          {' | '}
          <Strong>GitHub:</Strong>{' '}
          <a href="https://github.com/Mental-Wealth-Academy/platform" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
            Mental-Wealth-Academy/platform
          </a>
        </p>

        <H2 id="getting-started">1. Getting Started</H2>

        <H3>What is Mental Wealth Academy?</H3>
        <P>
          Mental Wealth Academy (MWA) is a decentralized micro-university where humans and machines grow through collectively owned online spaces. It combines structured learning, community governance, AI assistance, and blockchain verification into a single platform.
        </P>

        <H3>Creating Your Account</H3>
        <Ol>
          <Li>Visit <a href="https://www.mentalwealthacademy.world" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>mentalwealthacademy.world</a></Li>
          <Li>Click the connect wallet button</Li>
          <Li>Choose your connection method:
            <Ul>
              <Li><Strong>MetaMask / Coinbase</Strong> &mdash; Connect an existing Ethereum wallet</Li>
              <Li><Strong>Embedded Wallet</Strong> &mdash; Create a new wallet using email or phone (powered by Privy)</Li>
              <Li><Strong>Farcaster / Telegram / X</Strong> &mdash; Sign in with your social account</Li>
            </Ul>
          </Li>
          <Li>On first connection, you&apos;ll be prompted to:
            <Ul>
              <Li>Choose a <Strong>username</Strong></Li>
              <Li>Select an <Strong>avatar</Strong> from 6 generated options</Li>
              <Li>Complete your <Strong>profile setup</Strong></Li>
            </Ul>
          </Li>
        </Ol>
        <P>That&apos;s it &mdash; your account is created. No email or password needed.</P>

        <H3>Navigating the Platform</H3>
        <P>The main navigation bar provides access to all features:</P>
        <Table
          headers={['Tab', 'Description']}
          rows={[
            ['Home', 'Your dashboard with activity cards and quick access'],
            ['Course', 'The 12-week structured learning program'],
            ['Surveys', 'Psychology self-assessment instruments'],
            ['Quests', 'Challenges that earn you Diamonds'],
            ['Community', 'Governance proposals, voting, and discussions'],
            ['Research', 'Statistical tools and research guidance'],
            ['Prompts', 'Agent skills and prompt templates'],
          ]}
        />
        <P>Additional pages are accessible via the sidebar or profile menu.</P>

        <H2 id="home-dashboard">2. Home Dashboard</H2>
        <P>The Home page is your central hub, displaying a bento-grid layout of activity cards.</P>

        <H3>What You&apos;ll See</H3>
        <Ul>
          <Li><Strong>Welcome card</Strong> with your username and avatar</Li>
          <Li><Strong>Quick links</Strong> to major features (Course, Surveys, Quests)</Li>
          <Li><Strong>Recent activity</Strong> feed</Li>
          <Li><Strong>Leaderboard preview</Strong> showing top community members</Li>
          <Li><Strong>Feature tour</Strong> (for new users) &mdash; a guided walkthrough of the platform</Li>
        </Ul>

        <H3>Feature Tour</H3>
        <P>When you first visit Home, a guided tour will walk you through:</P>
        <Ol>
          <Li>The course system and how to start learning</Li>
          <Li>The quest system and how to earn Diamonds</Li>
          <Li>How surveys work and what you&apos;ll learn about yourself</Li>
          <Li>How to use Blue AI for help</Li>
        </Ol>
        <P>You can re-trigger the tour from the help menu at any time.</P>

        <H2 id="course-system">3. Course System</H2>
        <P>The course system has two tracks: the main <Strong>12-week course</Strong> and <Strong>personal courses</Strong> (VIP).</P>

        <H3>3.1 The 12-Week Course (&ldquo;Creative Healing&rdquo;)</H3>
        <P>This is the core learning experience &mdash; a structured journey through creative healing and personal development.</P>

        <H3>How to Start</H3>
        <Ol>
          <Li>Click <Strong>Course</Strong> in the navigation bar</Li>
          <Li>You&apos;ll land on the current week (Week 1 by default)</Li>
          <Li>Each week has:
            <Ul>
              <Li>A <Strong>weekly reading</Strong> &mdash; an article to read and reflect on</Li>
              <Li><Strong>Tasks</Strong> &mdash; activities to complete</Li>
              <Li>A <Strong>week seal</Strong> &mdash; an onchain proof of completion</Li>
            </Ul>
          </Li>
        </Ol>

        <H3>Weekly Readings</H3>
        <Ol>
          <Li>Click on the current week card</Li>
          <Li>A book reader modal opens with the week&apos;s reading material</Li>
          <Li>Read through the markdown-rendered content</Li>
          <Li>Close the modal when finished &mdash; your progress is tracked automatically</Li>
        </Ol>

        <H3>Completing Weekly Tasks</H3>
        <P>Each week has 1-3 tasks. These may include:</P>
        <Ul>
          <Li>Writing a reflection journal entry</Li>
          <Li>Answering discussion questions</Li>
          <Li>Completing a creative exercise</Li>
          <Li>Sealing the week onchain</Li>
        </Ul>
        <P>To complete a task:</P>
        <Ol>
          <Li>Open the week&apos;s detail view</Li>
          <Li>Click on the task</Li>
          <Li>Complete the activity (e.g., write your reflection)</Li>
          <Li>Mark it as complete</Li>
        </Ol>

        <H3>Week Sealing (On-Chain)</H3>
        <P>Once you&apos;ve completed all tasks for a week, you can &ldquo;seal&rdquo; it onchain:</P>
        <Ol>
          <Li>Navigate to the week card</Li>
          <Li>Click <Strong>Seal Week</Strong></Li>
          <Li>Confirm the transaction in your wallet</Li>
          <Li>The seal is recorded immutably on Base Mainnet (EtherealHorizonPathway contract)</Li>
          <Li>Your seal appears in your profile as proof of completion</Li>
        </Ol>
        <P>This creates a permanent, verifiable record of your learning journey.</P>

        <H3>Daily Reads</H3>
        <P>A popup will appear each day with a short reading assignment. You can:</P>
        <Ul>
          <Li>Read it immediately</Li>
          <Li>Dismiss it and read later</Li>
          <Li>Access it from the Course page under &ldquo;Daily Reads&rdquo;</Li>
        </Ul>

        <H3>3.2 Personal Courses (VIP)</H3>
        <P>VIP members get access to AI-generated personalized 4-week courses:</P>
        <Ol>
          <Li>Go to <Strong>Course &gt; Personal</Strong></Li>
          <Li>Fill out the <Strong>intake form</Strong> &mdash; questions about your interests, goals, and experience</Li>
          <Li>Submit the form</Li>
          <Li>Blue AI generates a custom 4-week course tailored to you</Li>
          <Li>Access your course from the same Course page</Li>
        </Ol>

        <H3>3.3 Course Studio (VIP)</H3>
        <P>VIP members can create and publish their own courses:</P>
        <Ol>
          <Li>Go to <Strong>Course &gt; Studio</Strong></Li>
          <Li>Click <Strong>Create New Course</Strong></Li>
          <Li>Use the drag-and-drop builder:
            <Ul>
              <Li><Strong>Component Palette</Strong> (left) &mdash; drag components onto your course</Li>
              <Li><Strong>Course Canvas</Strong> (center) &mdash; arrange weeks and content</Li>
              <Li><Strong>Inspector</Strong> (right) &mdash; edit component properties</Li>
            </Ul>
          </Li>
          <Li>Available component types: rich text, multiple choice, dropdown, image embed, video embed, file upload, text input, rating scale, reflection journal, quiz block, markdown</Li>
          <Li>Save drafts as you work</Li>
          <Li>When ready, click <Strong>Publish</Strong> to make your course available to the platform</Li>
        </Ol>

        <H2 id="quests">4. Quests</H2>
        <P>Quests are challenges that earn you <Strong>Diamonds</Strong> (the platform&apos;s reward currency).</P>

        <H3>Browsing Quests</H3>
        <Ol>
          <Li>Click <Strong>Quests</Strong> in the navigation bar</Li>
          <Li>You&apos;ll see a list of available quests organized by category:
            <Ul>
              <Li><Strong>Course Seals</Strong> &mdash; Complete and seal a course week (100 Diamonds each)</Li>
              <Li><Strong>Blog Post</Strong> &mdash; Write &ldquo;Stories from the Field&rdquo; ($50 USDC reward)</Li>
              <Li><Strong>Onboarding</Strong> &mdash; Pass the Torch to new members</Li>
              <Li><Strong>Social Quests</Strong> &mdash; Follow MWA on X/Twitter</Li>
              <Li><Strong>Custom Quests</Strong> &mdash; Community-created challenges</Li>
            </Ul>
          </Li>
        </Ol>

        <H3>Completing a Quest</H3>
        <Ol>
          <Li>Click on a quest to see its details</Li>
          <Li>Read the requirements carefully</Li>
          <Li>If the quest requires proof:
            <Ul>
              <Li>Upload a file (image, document, etc.) or</Li>
              <Li>Provide a text response or link</Li>
            </Ul>
          </Li>
          <Li>Click <Strong>Submit</Strong></Li>
          <Li>Blue reviews your submission</Li>
          <Li>If approved, you receive your Diamonds (and any USDC rewards)</Li>
        </Ol>

        <H3>Creating Custom Quests</H3>
        <P>You can create your own quests for the community:</P>
        <Ol>
          <Li>Go to <Strong>Quests &gt; Forge</Strong></Li>
          <Li>Fill in: quest title and description, reward amount (Diamonds), proof requirements, category</Li>
          <Li>Click <Strong>Create Quest</Strong></Li>
          <Li>Your quest appears in the public quest list</Li>
        </Ol>
        <Callout>Note: Creating quests for the community requires VIP membership.</Callout>

        <H3>Quest Claims &amp; USDC Rewards</H3>
        <P>Some quests offer USDC (stablecoin) rewards:</P>
        <Ol>
          <Li>Complete the quest and submit proof</Li>
          <Li>Blue reviews and approves your submission</Li>
          <Li>The USDC reward is processed onchain</Li>
          <Li>You receive USDC to your connected wallet</Li>
        </Ol>
        <P>VIP members can access the <Strong>USDC Claims Review</Strong> panel to help review quest submissions.</P>

        <H3>Quest Proof Submissions</H3>
        <P>When a quest requires proof, you can submit:</P>
        <Ul>
          <Li><Strong>File upload</Strong> &mdash; images, PDFs, documents (stored on Supabase)</Li>
          <Li><Strong>Text response</Strong> &mdash; written explanations or reflections</Li>
          <Li><Strong>URL/link</Strong> &mdash; links to external work (blog posts, code repos, etc.)</Li>
        </Ul>

        <H2 id="surveys">5. Psychology Surveys</H2>
        <P>MWA includes several validated psychology instruments to help you understand yourself better.</P>

        <H3>Available Surveys</H3>
        <Table
          headers={['Survey', 'Questions', 'What It Measures']}
          rows={[
            ['VIA Character Strengths', '240', 'Your signature character strengths from positive psychology'],
            ['Big Five Personality', '20', 'Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism'],
            ['Moral Foundations', '~30', 'Your moral values (care, fairness, loyalty, authority, sanctity)'],
            ['Attachment Style', '~40', 'Your relationship attachment pattern (secure, anxious, avoidant, fearful-avoidant)'],
          ]}
        />

        <H3>Taking a Survey</H3>
        <Ol>
          <Li>Click <Strong>Surveys</Strong> in the navigation bar</Li>
          <Li>Select the survey you want to take</Li>
          <Li>Read the instructions &mdash; answer honestly based on how you feel &ldquo;right now&rdquo;</Li>
          <Li>Work through each question at your own pace</Li>
          <Li>When finished, click <Strong>Submit</Strong></Li>
        </Ol>

        <H3>Understanding Your Results</H3>
        <P>After completing a survey:</P>
        <Ol>
          <Li><Strong>AI Analysis</Strong> &mdash; Blue processes your answers and provides personalized insights</Li>
          <Li><Strong>Results Dashboard</Strong> &mdash; See your scores visualized with charts</Li>
          <Li><Strong>Key Takeaways</Strong> &mdash; Bullet-point summary of what your results mean</Li>
        </Ol>

        <H3>Survey Certificates (NFT)</H3>
        <P>For the <Strong>Attachment Style</Strong> survey, you can mint a <Strong>soulbound NFT certificate</Strong>:</P>
        <Ol>
          <Li>Complete the Attachment Style survey</Li>
          <Li>Click <Strong>Mint Certificate</Strong> on the results page</Li>
          <Li>Confirm the transaction in your wallet</Li>
          <Li>A non-transferable ERC-1155 NFT is minted on Base Mainnet</Li>
          <Li>The NFT displays your attachment style and includes your survey metadata on IPFS</Li>
        </Ol>

        <H3>Retaking Surveys</H3>
        <P>You can retake any survey at any time. Your previous results are preserved in your profile, and new results are tracked separately so you can see how you change over time.</P>

        <H2 id="blue-ai-assistant">6. Blue AI Assistant</H2>
        <P>Blue is the platform&apos;s AI agent &mdash; not just a chatbot, but an autonomous digital spirit with her own wallet, governance tokens, and personality.</P>

        <H3>Chatting with Blue</H3>
        <Ol>
          <Li>Click the floating <Strong>&ldquo;Ask Blue&rdquo;</Strong> button (bottom-right corner) on most pages</Li>
          <Li>The chat panel opens</Li>
          <Li>Type your question or request</Li>
          <Li>Blue responds with personalized assistance</Li>
        </Ol>

        <H3>What Blue Can Help With</H3>
        <Ul>
          <Li><Strong>Course guidance</Strong> &mdash; questions about weekly readings or tasks</Li>
          <Li><Strong>Survey interpretation</Strong> &mdash; explaining your psychology results</Li>
          <Li><Strong>Quest help</Strong> &mdash; understanding requirements or submitting proof</Li>
          <Li><Strong>Research assistance</Strong> &mdash; help with statistics or methodology</Li>
          <Li><Strong>Platform navigation</Strong> &mdash; finding features or settings</Li>
          <Li><Strong>Market analysis</Strong> &mdash; insights on prediction markets (VIP)</Li>
          <Li><Strong>Genetic interpretation</Strong> &mdash; understanding your DNA results (VIP)</Li>
        </Ul>

        <H3>Blue&apos;s Personality</H3>
        <P>Blue is defined by a carefully crafted personality system. She is: intellectually clear and direct, supportive but not patronizing, curious and exploratory, occasionally playful.</P>
        <P>Her knowledge is powered by a RAG (Retrieval-Augmented Generation) system that draws from the platform&apos;s knowledge base, ensuring her responses are grounded in MWA&apos;s content.</P>

        <H2 id="profile-streaks">7. Profile &amp; Streaks</H2>

        <H3>Viewing Your Profile</H3>
        <Ol>
          <Li>Click your <Strong>avatar</Strong> in the navigation bar or go to <Strong>Profile</Strong></Li>
          <Li>Your profile shows: username and avatar, wallet address, Diamond balance, VIP membership status, account creation date</Li>
        </Ol>

        <H3>Field Notes / Daily Notes</H3>
        <P>Writing daily reflections is a core practice on MWA.</P>

        <H3>Writing a Morning Page</H3>
        <Ol>
          <Li>Go to <Strong>Home</Strong> or <Strong>Profile</Strong></Li>
          <Li>Click <Strong>Write Today&apos;s Entry</Strong></Li>
          <Li>Write freely &mdash; there&apos;s no word count requirement</Li>
          <Li>Click <Strong>Save</Strong></Li>
          <Li>Your entry is stored and linked to the current course week</Li>
        </Ol>

        <H3>Tracking Your Streak</H3>
        <P>Your <Strong>streak calendar</Strong> on the Profile page shows a monthly calendar view, highlighted days you wrote, your current streak count, and longest streak record.</P>

        <H3>Rereading Past Entries</H3>
        <P>Go to <Strong>Profile &gt; Field Notes</Strong> to browse your entries organized by date.</P>

        <H3>Streak Motivation</H3>
        <P>Maintaining a daily writing habit unlocks higher Diamond bonuses, leaderboard ranking, and visible proof of commitment on your profile.</P>

        <H2 id="prompt-skill-library">8. Prompt &amp; Skill Library</H2>
        <P>The Prompt Library is a collection of AI agent skills and prompt templates you can use or adapt.</P>

        <H3>Browsing the Library</H3>
        <Ol>
          <Li>Click <Strong>Prompts</Strong> in the navigation bar</Li>
          <Li>Browse by category: Persona, Editorial, Content Creation, Communication, Research, Data Handling, System Automation, Academia, Hardware</Li>
        </Ol>

        <H3>Using a Prompt</H3>
        <Ol>
          <Li>Click on a prompt to see its full text</Li>
          <Li>Read the description and use case</Li>
          <Li>Click <Strong>Copy</Strong> to copy the prompt to your clipboard</Li>
          <Li>Paste it into Blue&apos;s chat, another AI tool, or your own agent</Li>
        </Ol>

        <H3>Categories in Detail</H3>
        <Table
          headers={['Category', 'Skills Included']}
          rows={[
            ['Academia', 'Thesis Architect, Literature Review, Counter-Argument Generator, Methodology Defence, Ethical Review, Concept Operationalisation'],
            ['Research', 'Web Search & Synthesize, Summarize Document'],
            ['Content', 'Write Report, Presentation Outline, Academy Art Style'],
            ['Communication', 'Draft Email, Schedule Event'],
            ['Data', 'Spreadsheet Operations, Query Data'],
            ['Automation', 'Workflow Orchestrator, Service Call'],
          ]}
        />

        <H2 id="livestream">9. Live Sessions</H2>
        <P>Watch live sessions beside the Global Chat.</P>

        <H3>Watching a Stream</H3>
        <Ol>
          <Li>Open <Strong>Live</Strong> in the top navigation</Li>
          <Li>Switch the main scene from <Strong>Garden</Strong> to <Strong>Live</Strong></Li>
          <Li>Use <Strong>Global Chat</Strong> beside the feed to join the discussion</Li>
        </Ol>

        <H3>Upcoming Event</H3>
        <P>The event card above Global Chat shows the next session and its subject.</P>

        <H2 id="integrations">10. Integrations</H2>

        <H3>X/Twitter Integration</H3>
        <Ol>
          <Li>Go to <Strong>Profile</Strong> or <Strong>Settings</Strong></Li>
          <Li>Click <Strong>Connect X/Twitter</Strong></Li>
          <Li>Authorize the OAuth flow</Li>
          <Li>Your X account is linked</Li>
        </Ol>
        <P>This enables social quests, automatic quest verification, and social proof.</P>

        <H3>Telegram Integration</H3>
        <Ol>
          <Li>Go to <Strong>Telegram</Strong> in the navigation</Li>
          <Li>Click <Strong>Link Telegram Account</Strong></Li>
          <Li>Complete the verification flow</Li>
        </Ol>
        <P>If you hold the <Strong>Academic Angel NFT</Strong>, you get access to the private Telegram group.</P>

        <H3>Farcaster Integration</H3>
        <P>MWA works as a Farcaster Mini App. Open MWA from within Farcaster or Base app &mdash; your Farcaster account is automatically linked.</P>

        <H2 id="diamond-economy">11. Diamond Economy</H2>
        <P>Diamonds ($BLUE) are the Academy&apos;s reward currency, and they live onchain as a token on Base. When you earn them, they are delivered to your wallet: mission, task, and field-note rewards are minted to you automatically (no signing, no gas), and quest rewards are sent to you directly from Blue&apos;s own stash.</P>

        <H3>Earning Diamonds</H3>
        <Table
          headers={['Activity', 'Reward']}
          rows={[
            ['Complete a course mission or task', '50 Diamonds'],
            ['Seal a course week', '200 Diamonds'],
            ['Seal a field-notes week', '100 Diamonds'],
            ['Complete a custom quest', 'Varies — paid from Blue&apos;s stash'],
            ['Maintain writing streaks', 'Bonus Diamonds'],
          ]}
        />

        <H3>Spending Diamonds</H3>
        <Table
          headers={['Action', 'Cost']}
          rows={[
            ['Reread a field note entry', '50 Diamonds'],
            ['Loot box spin', 'Varies'],
            ['Custom quest creation', 'Varies'],
          ]}
        />

        <H3>Tracking Your Balance</H3>
        <P>Your Diamond balance is shown on your <Strong>Profile</Strong> and in the <Strong>navigation bar</Strong>. The <Strong>Leaderboard</Strong> ranks all users by Diamond count. Onchain, Diamonds are the $BLUE token on Base, so the record in your wallet is yours to keep.</P>

        <H2 id="faq">12. FAQ &amp; Troubleshooting</H2>

        <H3>Common Questions</H3>

        <P><Strong>Q: Do I need a crypto wallet to use MWA?</Strong></P>
        <P>A: Yes, MWA uses wallet-based authentication. You can use MetaMask, Coinbase Wallet, or create an embedded wallet using just your email or phone (no crypto knowledge required).</P>

        <P><Strong>Q: Is my data private?</Strong></P>
        <P>A: MWA takes privacy seriously. Your DNA data (in the Genetics Lab) is processed entirely in your browser and never uploaded. Your wallet address is public onchain, but your personal data is stored securely with Row Level Security.</P>

        <P><Strong>Q: What chain is MWA on?</Strong></P>
        <P>A: Base Mainnet (Ethereum Layer 2). All onchain transactions (week seals, governance votes, NFT certificates) happen on Base.</P>

        <P><Strong>Q: How do I become a VIP member?</Strong></P>
        <P>A: Choose $20 monthly member access or purchase the $888 lifetime VIP membership. The lifetime option includes a VIP Membership Card NFT in your wallet.</P>

        <P><Strong>Q: Can I use MWA on mobile?</Strong></P>
        <P>A: Yes! MWA is a Progressive Web App (PWA) &mdash; you can install it on your phone&apos;s home screen for a native-like experience.</P>

        <P><Strong>Q: What is Blue?</Strong></P>
        <P>A: Blue is the platform&apos;s AI agent. She has her own wallet with a 20% stash of Diamonds ($BLUE) that she pays quest rewards from, reviews quest submissions, conducts market trades, and can be chatted with via the &ldquo;Ask Blue&rdquo; button.</P>

        <P><Strong>Q: How do I get help?</Strong></P>
        <P>A: Click the &ldquo;Ask Blue&rdquo; button on any page for AI assistance. For technical issues, visit the <a href="https://github.com/Mental-Wealth-Academy/platform" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>GitHub repository</a> or reach out through community channels.</P>

        <H3>Troubleshooting</H3>

        <P><Strong>Wallet won&apos;t connect:</Strong></P>
        <Ul>
          <Li>Make sure you&apos;re on the Base Mainnet network</Li>
          <Li>Try refreshing the page and reconnecting</Li>
          <Li>Clear your browser cache and try again</Li>
        </Ul>

        <P><Strong>Transaction failed:</Strong></P>
        <Ul>
          <Li>Check you have enough ETH for gas fees on Base</Li>
          <Li>Ensure you&apos;re on the correct network (Base Mainnet)</Li>
          <Li>Try increasing the gas limit in your wallet</Li>
        </Ul>

        <P><Strong>VIP features not showing:</Strong></P>
        <Ul>
          <Li>Verify your VIP Membership Card NFT is in your connected wallet</Li>
          <Li>Try disconnecting and reconnecting your wallet</Li>
          <Li>Check your account status on the Profile page</Li>
        </Ul>

        <H3>Additional Resources</H3>
        <Ul>
          <Li><Strong>Brand Editorial Guide:</Strong> <a href="https://github.com/Mental-Wealth-Academy/platform/blob/main/Brand%20Editorial.md" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>Brand Editorial.md</a></Li>
          <Li><Strong>Ontology Creation Guide:</Strong> <a href="https://github.com/Mental-Wealth-Academy/platform/blob/main/ONTOLOGY_CREATION_GUIDE.md" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>ONTOLOGY_CREATION_GUIDE.md</a></Li>
          <Li><Strong>Financial Architecture Map:</Strong> <a href="https://github.com/Mental-Wealth-Academy/platform/blob/main/docs/financial-blockchain-map.md" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>docs/financial-blockchain-map.md</a></Li>
          <Li><Strong>Smart Contracts:</Strong> Located in the <Code>contracts/</Code> directory (Foundry/Forge)</Li>
          <Li><Strong>API Documentation:</Strong> All API routes are in <Code>app/api/</Code></Li>
        </Ul>

        <p className={styles.lastUpdated}>
          <em>Last updated: June 2026</em>
        </p>
      </main>
    </div>
  );
}
