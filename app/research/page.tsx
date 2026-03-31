'use client';

import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './research-page.module.css';

interface Tool {
  id: string;
  label: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  external?: boolean;
  disabled?: boolean;
}

const tools: Tool[] = [
  {
    id: 'guidance',
    label: 'Guidance',
    desc: 'AI-powered spiritual and personal development guidance',
    href: '/research/guidance',
    color: '#5168FF',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    id: 'genetics',
    label: 'Genetics',
    desc: 'Explore your genetic blueprint and ancestral data',
    href: '/research/genetics',
    color: '#9724A6',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 15c6.667-6 13.333 0 20-6" />
        <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
        <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
        <path d="M17 6l-2.5 2.5" />
        <path d="M14 8l-1 1" />
        <path d="M7 18l2.5-2.5" />
        <path d="M3.5 14.5l.5-.5" />
        <path d="M20 9l.5-.5" />
        <path d="M2 9c6.667 6 13.333 0 20 6" />
      </svg>
    ),
  },
  {
    id: 'rtooling',
    label: 'R-Tooling',
    desc: 'Statistical analysis and research methodology tools',
    href: '/research/statistics',
    color: '#50599B',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <line x1="3" y1="20" x2="21" y2="20" />
      </svg>
    ),
  },
  {
    id: 'crm',
    label: 'CRM',
    desc: 'Academy relationship management and analytics',
    href: 'https://azura-theta.vercel.app/',
    color: '#74C465',
    external: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'simulation',
    label: 'Future Simulation',
    desc: 'Predictive modeling and scenario planning',
    href: 'https://azure-world.vercel.app/',
    color: '#FF7729',
    external: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    id: 'coming',
    label: 'Coming Soon',
    desc: 'More tools are being forged in the ethereal plane',
    href: '#',
    color: '#666',
    disabled: true,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function ResearchPage() {
  const { play } = useSound();

  return (
    <>
      <SideNavigation />
      <main className={styles.pageLayout}>
        <div className={styles.header}>
          <h1 className={styles.headerTitle}>DeSci Tools</h1>
          <p className={styles.headerSub}>
            Decentralized science instruments for the Academy
          </p>
        </div>

        <div className={styles.toolsGrid}>
          {tools.map((tool) => {
            const isDisabled = tool.disabled;
            const isExternal = tool.external;

            return (
              <a
                key={tool.id}
                href={isDisabled ? undefined : tool.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className={`${styles.toolCard} ${isDisabled ? styles.toolCardDisabled : ''}`}
                onMouseEnter={() => { if (!isDisabled) play('hover'); }}
                onClick={() => { if (!isDisabled) play('click'); }}
              >
                <div
                  className={styles.toolIcon}
                  style={{ backgroundColor: `${tool.color}20`, color: tool.color }}
                >
                  {tool.icon}
                </div>
                <span className={styles.toolLabel}>{tool.label}</span>
                <span className={styles.toolDesc}>{tool.desc}</span>
                {!isDisabled && (
                  <span className={styles.toolArrow}>
                    {isExternal ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </main>
    </>
  );
}
