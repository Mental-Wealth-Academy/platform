'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  SCATTER_COLLECTION_SLUG,
  getEligibleInviteLists,
  getMintTransaction,
  type MintList,
} from '@/lib/scatter-api';
import { useSound } from '@/hooks/useSound';
import styles from './AcademicAngels.module.css';

export const AcademicAngels: React.FC = () => {
  const { play } = useSound();
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [mintLists, setMintLists] = useState<MintList[]>([]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        // Silent fail — section still shows
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatPrice = useCallback((list: MintList) => {
    const price = parseFloat(list.token_price) / Math.pow(10, list.decimals);
    return price < 1 ? price.toFixed(4) : price.toFixed(2);
  }, []);

  const totalPrice = (0.05 * quantity).toFixed(4);

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
    <section ref={sectionRef} className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}>
      <div className={styles.sectionInner}>
        <div className={styles.ctaRow}>
          <span className={styles.ctaPrice}>$90</span>
          <span className={styles.ctaPriceLabel}>one-time</span>
          <button
            type="button"
            className={styles.purchaseBtn}
            onClick={openModal}
            onMouseEnter={() => play('hover')}
          >
            Purchase Membership
          </button>
        </div>
      </div>

      {/* ── Purchase Modal (portaled to body) ── */}
      {showModal && createPortal(
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

export default AcademicAngels;
