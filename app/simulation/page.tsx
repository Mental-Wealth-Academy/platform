'use client';

import SimulationGate from './SimulationGate';
import styles from './simulation.module.css';

export default function SimulationPage() {
  return (
    <>
      <main className={styles.pageLayout}>
        <SimulationGate />
      </main>
    </>
  );
}
