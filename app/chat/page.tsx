'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import BlueChat from '@/components/blue-chat/BlueChat';
import styles from './page.module.css';

export default function ChatPage() {
  const router = useRouter();

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  return (
    <div className={styles.pageLayout}>
      <main className={styles.content}>
        <BlueChat
          isOpen={true}
          onClose={handleClose}
          fullPage
        />
      </main>
    </div>
  );
}
