'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BlueChat from '@/components/blue-chat/BlueChat';
import styles from './page.module.css';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');

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
          initialPrompt={initialPrompt}
        />
      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className={styles.pageLayout} />}>
      <ChatContent />
    </Suspense>
  );
}
