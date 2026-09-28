'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './SupportTab.module.css';
import SupportModal from './SupportModal';

export default function SupportTab() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/chat' || pathname === '/blue') return null;

  return (
    <>
      <div className={styles.supportTab} onClick={() => setIsOpen(true)}>
        SUPPORT
      </div>
      <SupportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
