'use client';

import { useRouter } from 'next/navigation';
import DigipetGame from '@/components/digipet/DigipetGame';
import styles from '@/components/digipet/Digipet.module.css';

export default function DigipetPage() {
  const router = useRouter();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <button
        className={styles.backButton}
        onClick={() => router.push('/home')}
      >
        &larr; Back
      </button>
      <h1 className={styles.pageTitle}>Digipet</h1>
      <DigipetGame />
    </div>
  );
}
