'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { providers } from 'ethers';
import { getCollectionInfo, getEligibleInviteLists, getMintTransaction, SCATTER_COLLECTION_SLUG } from '@/lib/scatter-api';
import { useSound } from '@/hooks/useSound';
import CtaButton from '@/components/shared/CtaButton';
import ModalShell from '@/components/shared/ModalShell';
import styles from './AngelUpsellModal.module.css';

interface AngelUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type MintPhase = 'idle' | 'loading' | 'minting' | 'success' | 'error';

const ANGEL_IMAGE = '/angel-upsell-mural.webp';

export default function AngelUpsellModal({ isOpen, onClose }: AngelUpsellModalProps) {
  const { play } = useSound();
  const { address, isConnected, connector } = useAccount();
  const [phase, setPhase] = useState<MintPhase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setPhase('idle');
  }, [isOpen]);

  const handleMint = async () => {
    if (!isConnected || !address || !connector) {
      setErrorMsg('Please connect your wallet first');
      setPhase('error');
      return;
    }

    try {
      setPhase('loading');
      setErrorMsg(null);

      const rawProvider = await connector.getProvider();
      const ethersProvider = new providers.Web3Provider(rawProvider as any);

      const info = await getCollectionInfo(SCATTER_COLLECTION_SLUG);
      const userLists = await getEligibleInviteLists({
        collectionSlug: SCATTER_COLLECTION_SLUG,
        walletAddress: address,
      });

      setPhase('minting');

      const mintRes = await getMintTransaction({
        collectionAddress: info.address,
        chainId: info.chainId,
        minterAddress: address,
        lists: userLists.length > 0 ? [{ id: userLists[0].id, quantity: 1 }] : [],
      });

      const mintTx = mintRes.mintTransaction;
      if (!mintTx) {
        throw new Error('No mint transaction returned from Scatter API');
      }

      const signer = ethersProvider.getSigner();
      const txResponse = await signer.sendTransaction({
        to: mintTx.to,
        data: mintTx.data,
        value: mintTx.value,
      });

      setTxHash(txResponse.hash);
      await txResponse.wait();
      setPhase('success');
    } catch (err: any) {
      console.error('Scatter mint error:', err);
      setErrorMsg(err.reason || err.message || 'Transaction failed');
      setPhase('error');
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} hideHeader maxWidth="md">
      <div className={styles.imageSection}>
        <img src={ANGEL_IMAGE} alt="Academic Angel" className={styles.angelImage} />
      </div>

      <div className={styles.body}>
        {(phase === 'idle' || phase === 'error') && (
          <h2 id="angel-upsell-title" className={styles.title}>
            You need an Angel to play this game
          </h2>
        )}

        {phase === 'idle' && (
          <CtaButton
            block
            onClick={() => { play('click'); handleMint(); }}
            onMouseEnter={() => play('hover')}
          >
            Mint your Angel
          </CtaButton>
        )}

        {phase === 'loading' && (
          <div className={styles.statusContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.statusText}>Preparing your purchase...</p>
          </div>
        )}

        {phase === 'minting' && (
          <div className={styles.statusContainer}>
            <div className={styles.spinner}></div>
            <p className={styles.statusText}>Confirm transaction in your wallet...</p>
          </div>
        )}

        {phase === 'success' && (
          <div className={styles.successContainer}>
            <p className={styles.successTitle}>Welcome to the Tribe</p>
            <p className={styles.successMessage}>Your angel is on its way</p>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
                onClick={() => play('navigation')}
                onMouseEnter={() => play('hover')}
              >
                View on BaseScan
              </a>
            )}
            <CtaButton
              variant="secondary"
              onClick={() => { play('click'); onClose(); }}
              onMouseEnter={() => play('hover')}
            >
              Close
            </CtaButton>
          </div>
        )}

        {phase === 'error' && (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{errorMsg}</p>
            <CtaButton
              block
              onClick={() => { play('click'); handleMint(); }}
              onMouseEnter={() => play('hover')}
            >
              Try again
            </CtaButton>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
