'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import YourAccountsModal from './YourAccountsModal';
import styles from './ProfileButton.module.css';

const ProfileButton: React.FC = () => {
  const { isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't show button if not connected
  if (!isConnected) {
    return null;
  }

  return (
    <>
      <button 
        className={styles.profileButton} 
        data-intro="profile"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        <span className={styles.buttonText}>Your impact</span>
        <Image 
          src="/icons/nav-teleport.svg" 
          alt="Impact" 
          width={20}
          height={20}
          className={styles.iconRight}
        />
      </button>

      {isModalOpen && (
        <YourAccountsModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
};

export default ProfileButton;

