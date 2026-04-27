'use client';

import Link from 'next/link';
import { useSound } from '@/hooks/useSound';
import styles from './ProposalSuccessModal.module.css';

interface ProposalSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  proposalId: number;
}

export default function ProposalSuccessModal({
  isOpen,
  onClose,
  txHash,
  proposalId,
}: ProposalSuccessModalProps) {
  const { play } = useSound();

  if (!isOpen) return null;

  const baseScanUrl = `https://basescan.org/tx/${txHash}`;
  const shortTxHash = `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.modalTitle}>Proposal Submitted!</h2>
        </div>

        <div className={styles.modalContent}>
          <p className={styles.message}>
            Your proposal has been created on-chain and saved to the database.
          </p>

          <div className={styles.detailsCard}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Proposal ID</span>
              <span className={styles.detailValue}>#{proposalId}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Transaction</span>
              <a
                href={baseScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
                onClick={() => play('navigation')}
                onMouseEnter={() => play('hover')}
              >
                {shortTxHash}
                <span className={styles.externalIcon}>↗</span>
              </a>
            </div>
          </div>

          <div className={styles.blueNote}>
            <div className={styles.blueAvatar}>✦</div>
            <span className={styles.blueText}>
              Blue is reviewing your proposal now. Check back soon for her decision!
            </span>
          </div>

          <div className={styles.actions}>
            <Link href="/home" className={styles.primaryButton} onClick={() => { play('navigation'); onClose(); }} onMouseEnter={() => play('hover')}>
              View All Proposals
            </Link>
            <button className={styles.secondaryButton} onClick={() => { play('click'); onClose(); }} onMouseEnter={() => play('hover')}>
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
