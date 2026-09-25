'use client';

import React from 'react';
import CylindricalOrbitAnimation from './CylindricalOrbitAnimation';
import styles from './ProblemMap.module.css';

// The dominant learning platforms, named for the "digital filing cabinet" stage.
const PLATFORMS = ['Blackboard', 'Moodle', 'Canvas'] as const;

// Learners in the 15-node field: a few went quiet, a few stayed connected, and
// the cabinet records the same thing for both.
const NODE_QUIET = new Set([1, 6, 9, 13]);
const NODE_CONNECTED = new Set([3, 11]);

export const ProblemMap: React.FC = () => {
  return (
    <div className={styles.wrap}>
      <div
        className={styles.flow}
        role="group"
        aria-label="Lack of mental health resources leaves people navigating distress in silos. Up to 70 percent of educators report feeling inadequately supported with modern engagement tools. Legacy platforms offer stagnant curricula and few social features, leaving students isolated."
      >
        <article className={`${styles.stage} ${styles.mapStage}`}>
          <div className={styles.mapStoryTop}>
            <div className={styles.stageHeading}>
              <span className={styles.stageNumber}>1</span>
              <h3 className={styles.stageTitle}>Lack of Mental Health Resources</h3>
            </div>
            <p className={styles.stageCopy}>
              When mental wellness support is scarce, individuals are forced to navigate distress alone.
              Disconnected care leaves people isolated right when compounding support matters most.
            </p>
          </div>
          <CylindricalOrbitAnimation />
        </article>

        <article className={`${styles.stage} ${styles.outcomeStage}`}>
          <div className={styles.stageHeading}>
            <span className={styles.stageNumber}>2</span>
            <h3 className={styles.stageTitle}>Gaps in Educator Support</h3>
          </div>
          <div className={styles.outcome}>
            <strong className={styles.outcomeValue}>70%</strong>
            <p className={styles.outcomeCopy}>
              Up to 70% of educators and mentors report feeling inadequately supported with modern digital
              engagement tools, a factor that directly contributes to high learner dropout rates.
            </p>
            <div className={styles.people} aria-hidden="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <i className={index < 6 ? styles.personActive : undefined} key={index} />
              ))}
            </div>
          </div>
        </article>

        <article className={`${styles.stage} ${styles.platformStage}`}>
          <div className={styles.stageHeaderBlock}>
            <div className={styles.stageHeading}>
              <span className={styles.stageNumber}>3</span>
              <h3 className={styles.stageTitle}>Poorly Designed Infrastructure</h3>
            </div>
            <div className={styles.platformChips} aria-hidden="true">
              {PLATFORMS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          </div>
          <p className={styles.stageCopy}>
            Legacy platforms offer stagnant curricula and few social features, leaving
            many online students isolated. Next-gen courses should hold student
            attention while improving global education.
          </p>
          <div className={styles.nodeField} aria-hidden="true">
            <div className={styles.nodeGrid}>
              {Array.from({ length: 15 }).map((_, index) => (
                <i
                  key={index}
                  className={
                    NODE_QUIET.has(index)
                      ? styles.nodeQuiet
                      : NODE_CONNECTED.has(index)
                        ? styles.nodeConnected
                        : undefined
                  }
                />
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default ProblemMap;
