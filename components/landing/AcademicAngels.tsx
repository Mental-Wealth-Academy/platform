'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
        // Silent fail — section still shows with GIF
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

  const totalPrice = selectedList
    ? (parseFloat(selectedList.token_price) / Math.pow(10, selectedList.decimals) * quantity).toFixed(4)
    : '0';

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

      // Switch to correct chain
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

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Left — GIF */}
        <div className={styles.imageCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.imgur.com/GXA3DBV.gif"
            alt="Academic Angels"
            className={styles.gif}
          />
        </div>

        {/* Right — Mint panel */}
        <div className={styles.mintPanel}>
          <div className={styles.quantityRow}>
            <button
              className={styles.qtyBtn}
              onClick={() => { play('click'); setQuantity(Math.max(1, quantity - 1)); }}
              disabled={quantity <= 1}
            >
              &minus;
            </button>
            <span className={styles.qtyValue}>{quantity}</span>
            <button
              className={styles.qtyBtn}
              onClick={() => {
                play('click');
                setQuantity(Math.min(selectedList?.wallet_limit || 10, quantity + 1));
              }}
            >
              +
            </button>
          </div>

          <h2 className={styles.title}>Academic Angels</h2>
          <p className={styles.subtitle}>by Mental Wealth Academy</p>

          <div className={styles.priceRow}>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>Price</span>
              <span className={styles.priceValue}>
                {loading ? '...' : selectedList ? `${formatPrice(selectedList)} ${selectedList.currency_symbol}` : 'Free'}
              </span>
            </div>
          </div>

          {mintLists.length > 1 && (
            <div className={styles.listSelector}>
              {mintLists.map((list) => (
                <button
                  key={list.id}
                  className={`${styles.listOption} ${selectedList?.id === list.id ? styles.listOptionActive : ''}`}
                  onClick={() => { play('click'); setSelectedList(list); }}
                >
                  {list.name}
                </button>
              ))}
            </div>
          )}

          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>{totalPrice} {selectedList?.currency_symbol || 'ETH'}</span>
          </div>

          {success ? (
            <div className={styles.successBlock}>
              <span className={styles.successText}>Purchase Successful!</span>
              {txHash && (
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.txLink}
                >
                  View on BaseScan
                </a>
              )}
            </div>
          ) : (
            <button
              className={styles.mintBtn}
              onClick={handleMint}
              disabled={minting || loading}
            >
              {minting ? 'Purchasing...' : 'Purchase'}
            </button>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <a
            href="https://www.scatter.art/collection/academic-angels"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.scatterLink}
          >
            View on Scatter
          </a>
        </div>
      </div>
    </section>
  );
};

export default AcademicAngels;
