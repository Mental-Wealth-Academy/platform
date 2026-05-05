import React from 'react';
import styles from './SurveySpace.module.css';

interface BadgePill {
  label: string;
}

interface SurveySpaceProps {
  label?: string;
  badges?: BadgePill[];
  children?: React.ReactNode;
}

export default function SurveySpace({
  label = 'Test output',
  badges = [
    { label: 'Badge' },
    { label: 'Badge' },
    { label: 'Badge' },
    { label: 'Badge' },
  ],
  children,
}: SurveySpaceProps) {
  return (
    <div className={styles.space}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <div className={styles.badges}>
          {badges.map((b, i) => (
            <span key={i} className={styles.badge}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.innerPanel}>{children}</div>
      </div>
    </div>
  );
}
