'use client';

import React, { useState } from 'react';
import styles from './SupportTab.module.css';
import SupportModal from './SupportModal';

export default function SupportTab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className={styles.supportTab} onClick={() => setIsOpen(true)}>
        SUPPORT
      </div>
      <SupportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
