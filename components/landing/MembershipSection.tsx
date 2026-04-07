'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  SCATTER_COLLECTION_SLUG,
  getEligibleInviteLists,
  getMintTransaction,
  type MintList,
} from '@/lib/scatter-api';
import { useSound } from '@/hooks/useSound';
import styles from './MembershipSection.module.css';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const MembershipSection: React.FC = () => {
  const { play } = useSound();
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Scatter / mint state
  const [mintLists, setMintLists] = useState<MintList[]>([]);
  const [selectedList, setSelectedList] = useState<MintList | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [collectionAddress, setCollectionAddress] = useState<string | null>(null);
  const [collectionChainId, setCollectionChainId] = useState<number>(8453);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/scatter/collection');
        if (res.ok) {
          const info = await res.json();
          if (info.address) {
            setCollectionAddress(info.address);
            setCollectionChainId(info.chainId || 8453);
          }
        }
        const lists = await getEligibleInviteLists({
          collectionSlug: SCATTER_COLLECTION_SLUG,
        });
        if (Array.isArray(lists) && lists.length > 0) {
          setMintLists(lists);
          setSelectedList(lists[0]);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMint = async () => {
    if (!selectedList || !collectionAddress) return;
    play('click');
    setMinting(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('Please install a Web3 wallet (e.g. MetaMask)');
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const minterAddress = accounts[0];

      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${collectionChainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902 && collectionChainId === 8453) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } else {
          throw switchError;
        }
      }

      const mintResponse = await getMintTransaction({
        collectionAddress,
        chainId: collectionChainId,
        minterAddress,
        lists: [{ id: selectedList.id, quantity }],
      });

      const hash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: minterAddress,
          to: mintResponse.mintTransaction.to,
          value: mintResponse.mintTransaction.value,
          data: mintResponse.mintTransaction.data,
        }],
      });

      setTxHash(hash);
      setSuccess(true);
      play('celebration');
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setMinting(false);
    }
  };

  const openModal = () => {
    play('click');
    setShowModal(true);
  };

  const closeModal = () => {
    play('click');
    setShowModal(false);
  };

  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showModal]);

  // Allow other sections to open the purchase modal
  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener('openPurchaseModal', handler);
    return () => window.removeEventListener('openPurchaseModal', handler);
  }, []);

  return (
    <section ref={sectionRef} id="membership" className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Membership</p>
        <h2 className={styles.title}>Choose Your Path</h2>
        <p className={styles.subtitle}>
          Start the journey your way.
        </p>

        <div className={styles.tierGrid}>
          {/* Free Tier */}
          <div className={styles.tierCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierName}>Explorer</span>
              <div className={styles.tierPriceRow}>
                <span className={styles.tierPrice}>Free</span>
              </div>
              <p className={styles.tierDesc}>Access the core course and start building your practice.</p>
            </div>
            <div className={styles.tierDivider} />
            <ul className={styles.tierFeatures}>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                12-week course access
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Morning Prayers journaling
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Weekly tasks and quests
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Community forum
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Shard rewards for study
              </li>
            </ul>
            <a
              href="/home"
              className={styles.tierBtnSecondary}
              onClick={() => play('click')}
              onMouseEnter={() => play('hover')}
            >
              Enter Free
            </a>
          </div>

          {/* Monthly Tier */}
          <div className={`${styles.tierCard} ${styles.tierCardPrimary}`}>
            <div className={styles.tierBadge}>Recommended</div>
            <div className={styles.tierHeader}>
              <span className={styles.tierName}>Member</span>
              <div className={styles.tierPriceRow}>
                <span className={styles.tierPrice}>$12</span>
                <span className={styles.tierPriceLabel}>/month</span>
              </div>
              <p className={styles.tierDesc}>Full access with governance power and research tools.</p>
            </div>
            <div className={styles.tierDivider} />
            <ul className={styles.tierFeatures}>
              <li className={styles.tierFeature}>
                <span className={`${styles.featureCheck} ${styles.featureCheckPrimary}`}><CheckIcon /></span>
                Everything in Explorer
              </li>
              <li className={styles.tierFeature}>
                <span className={`${styles.featureCheck} ${styles.featureCheckPrimary}`}><CheckIcon /></span>
                Governance voting power
              </li>
              <li className={styles.tierFeature}>
                <span className={`${styles.featureCheck} ${styles.featureCheckPrimary}`}><CheckIcon /></span>
                Submit proposals to the treasury
              </li>
              <li className={styles.tierFeature}>
                <span className={`${styles.featureCheck} ${styles.featureCheckPrimary}`}><CheckIcon /></span>
                DeSci research tools
              </li>
              <li className={styles.tierFeature}>
                <span className={`${styles.featureCheck} ${styles.featureCheckPrimary}`}><CheckIcon /></span>
                Blue AI co-pilot
              </li>
            </ul>
            <button
              type="button"
              className={styles.tierBtnPrimary}
              onClick={openModal}
              onMouseEnter={() => play('hover')}
            >
              Subscribe
            </button>
          </div>

          {/* Lifetime Tier */}
          <div className={styles.tierCard}>
            <div className={styles.tierHeader}>
              <span className={styles.tierName}>Academic Angel</span>
              <div className={styles.tierPriceRow}>
                <span className={styles.tierPrice}>$90</span>
                <span className={styles.tierPriceLabel}>one-time</span>
              </div>
              <p className={styles.tierDesc}>Lifetime membership with on-chain ownership.</p>
            </div>
            <div className={styles.tierDivider} />
            <ul className={styles.tierFeatures}>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Everything in Member
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Lifetime access to all future cohorts
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                On-chain membership NFT
              </li>
              <li className={styles.tierFeature}>
                <span className={styles.featureCheck}><CheckIcon /></span>
                Treasury profit sharing
              </li>
            </ul>
            <button
              type="button"
              className={styles.tierBtnSecondary}
              onClick={openModal}
              onMouseEnter={() => play('hover')}
            >
              Purchase Membership
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showModal && typeof window !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Purchase Membership</h3>
              <button className={styles.modalClose} onClick={closeModal} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              <span className={styles.price}>$90</span>
              <span className={styles.priceNote}>One-time membership</span>

              <div className={styles.divider} />

              <ul className={styles.benefitsList}>
                <li className={styles.benefitItem}>Join a creative community awakening minds through art, science, and spirit</li>
                <li className={styles.benefitItem}>Access funding pools for research, projects, and real-world impact</li>
                <li className={styles.benefitItem}>Lifetime entry to every course, cohort, and seasonal programme</li>
              </ul>

              <div className={styles.divider} />

              {success ? (
                <div className={styles.successBlock}>
                  <span className={styles.successText}>Welcome to the Academy.</span>
                  {txHash && (
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.txLink}
                    >
                      View receipt
                    </a>
                  )}
                </div>
              ) : (
                <button
                  className={styles.mintBtn}
                  onClick={handleMint}
                  disabled={minting || loading}
                >
                  {minting ? 'Processing...' : 'Confirm Purchase'}
                </button>
              )}

              {error && <p className={styles.error}>{error}</p>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
};

export default MembershipSection;
