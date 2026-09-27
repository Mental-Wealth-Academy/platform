'use client';

import React from 'react';
import EducatorSupportAnimation from './EducatorSupportAnimation';
import CylindricalOrbitAnimation from './CylindricalOrbitAnimation';
import InfrastructureMatrixAnimation from './InfrastructureMatrixAnimation';
import styles from './ProblemMap.module.css';

// The dominant learning platforms, named for the "digital filing cabinet" stage.
const PLATFORMS = ['Blackboard', 'Moodle', 'Canvas'] as const;

export const ProblemMap: React.FC = () => {
  return (
    <div className={styles.wrap}>
      <div
        className={styles.flow}
        role="group"
        aria-label="Up to 70 percent of educators report feeling inadequately supported with modern engagement tools. Lack of mental health resources leaves people navigating distress in silos. Legacy platforms offer stagnant curricula and few social features, leaving students isolated."
      >
        <article className={`${styles.stage} ${styles.outcomeStage}`}>
          <div className={styles.mapStoryTop}>
            <div className={styles.stageHeading}>
              <span className={styles.stageNumber}>1</span>
              <h3 className={styles.stageTitle}>Gaps in Educator Support</h3>
            </div>
            <p className={styles.stageCopy}>
              Up to 70% of educators and mentors report feeling inadequately supported with modern digital
              engagement tools, a factor that directly contributes to high learner dropout rates.
            </p>
          </div>
          <EducatorSupportAnimation />
        </article>

        <article className={`${styles.stage} ${styles.mapStage}`}>
          <div className={styles.mapStoryTop}>
            <div className={styles.stageHeading}>
              <span className={styles.stageNumber}>2</span>
              <h3 className={styles.stageTitle}>Lack of Mental Health Resources</h3>
            </div>
            <p className={styles.stageCopy}>
              When mental wellness support is scarce, individuals are forced to navigate distress alone.
              Disconnected care leaves people isolated right when compounding support matters most.
            </p>
          </div>
          <CylindricalOrbitAnimation />
        </article>

        <article className={`${styles.stage} ${styles.platformStage}`}>
          <div className={styles.stageHeaderBlock}>
            <div className={styles.stageHeading}>
              <span className={styles.stageNumber}>3</span>
              <h3 className={styles.stageTitle}>Inadequate infrastructure</h3>
            </div>
            <div className={styles.platformChips} aria-hidden="true">
              {PLATFORMS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <p className={styles.stageCopy}>
              Legacy platforms offer stagnant curricula and few social features, leaving
              many online students isolated. Next-gen courses should hold student
              attention while improving global education.
            </p>
          </div>
          <InfrastructureMatrixAnimation />
        </article>
      </div>
    </div>
  );
};

export default ProblemMap;
