'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import styles from './YourAccountsModal.module.css';
import { XConnectingModal } from '../x-connecting/XConnectingModal';
import { BlockchainAccountModal } from '../blockchain-account/BlockchainAccountModal';

interface YourAccountsModalProps {
  onClose: () => void;
}

interface XAccount {
  username: string;
  userId: string;
  connectedAt: string;
}

const YourAccountsModal: React.FC<YourAccountsModalProps> = ({ onClose }) => {
  const { address, isConnected } = useAccount();
  const [xAccount, setXAccount] = useState<XAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [showConnectingModal, setShowConnectingModal] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const dragStateRef = useRef<{ startY: number; pointerId: number | null }>({
    startY: 0,
    pointerId: null,
  });

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isDraggingSheet) return;

    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.userSelect = '';
      document.body.style.touchAction = '';
    };
  }, [isDraggingSheet]);

  const [syncedWalletAddress, setSyncedWalletAddress] = useState<string | null>(null);

  // Fetch account status (synced wallet and X account)
  // Uses session-based auth - no wallet signature needed
  useEffect(() => {
    const fetchAccountData = async () => {
      try {
        // Fetch account status to get synced wallet (uses session cookie)
        const accountStatusResponse = await fetch('/api/account/status', {
          cache: 'no-store',
          credentials: 'include',
        });
        
        if (accountStatusResponse.ok) {
          const accountStatus = await accountStatusResponse.json();
          if (accountStatus.walletAddress) {
            setSyncedWalletAddress(accountStatus.walletAddress);
          } else {
            setSyncedWalletAddress(null);
          }
        } else if (accountStatusResponse.status === 401) {
          // Not authenticated - clear state
          setSyncedWalletAddress(null);
          setXAccount(null);
          setIsLoading(false);
          return;
        }
        
        // Fetch X account status (uses session cookie)
        const response = await fetch('/api/x-auth/status', { 
          cache: 'no-store',
          credentials: 'include',
        });
        
        // Handle 503 (database not configured) gracefully
        if (response.status === 503) {
          setServiceUnavailable(true);
          setXAccount(null);
          setIsLoading(false);
          return;
        }
        
        // Handle 401 (not authenticated)
        if (response.status === 401) {
          setXAccount(null);
          setIsLoading(false);
          return;
        }
        
        // Handle other non-OK responses
        if (!response.ok) {
          setXAccount(null);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        if (data.connected && data.xAccount) {
          setXAccount(data.xAccount);
        } else {
          setXAccount(null);
        }
      } catch (error) {
        // Network errors - likely service unavailable
        console.error('Failed to fetch account data:', error);
        setServiceUnavailable(true);
        setXAccount(null);
        setSyncedWalletAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccountData();

    // Refresh when window regains focus (after OAuth redirect)
    const handleFocus = () => {
      fetchAccountData();
    };
    
    // Listen for X account update events
    const handleXAccountUpdate = () => {
      fetchAccountData();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('xAccountUpdated', handleXAccountUpdate);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('xAccountUpdated', handleXAccountUpdate);
    };
  }, []); // Fetch on mount - session cookie handles auth

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  // Handle wallet disconnect (placeholder)
  const handleWalletDisconnect = (address: string) => {
    // TODO: Implement wallet disconnect functionality
    console.log('Disconnect wallet:', address);
  };

  const [showBlockchainModal, setShowBlockchainModal] = useState(false);

  // Handle blockchain account sync - opens modal instead of direct sync
  const handleSyncBlockchainAccount = () => {
    setShowBlockchainModal(true);
  };

  const handleAccountSynced = () => {
    // Refresh account data (uses session cookie)
    const refreshAccountData = async () => {
      try {
        const accountStatusResponse = await fetch('/api/account/status', {
          cache: 'no-store',
          credentials: 'include',
        });
        
        if (accountStatusResponse.ok) {
          const accountStatus = await accountStatusResponse.json();
          if (accountStatus.walletAddress) {
            setSyncedWalletAddress(accountStatus.walletAddress);
          } else {
            setSyncedWalletAddress(null);
          }
        }
      } catch (error) {
        console.error('Failed to refresh account data:', error);
      }
    };
    refreshAccountData();
    window.dispatchEvent(new Event('xAccountUpdated'));
  };

  // Handle social connect - X account connection is now independent
  const handleSocialConnect = async (platform: string) => {
    if (platform === 'twitter' || platform === 'x') {
      if (serviceUnavailable) {
        return; // Don't attempt if service is unavailable
      }
      
      setIsConnecting(true);
      setShowConnectingModal(true);
      try {
        // Initiate X OAuth flow - no wallet connection required
        const response = await fetch('/api/x-auth/initiate', {
          credentials: 'include',
        });
        
        // Handle 503 (database not configured) gracefully
        if (response.status === 503) {
          setServiceUnavailable(true);
          setIsConnecting(false);
          setShowConnectingModal(false);
          return;
        }
        
        // Handle 401 (not authenticated) - user needs to sign in
        if (response.status === 401) {
          console.error('Not authenticated. Please sign in first.');
          setIsConnecting(false);
          setShowConnectingModal(false);
          alert('Please sign in to connect your X account.');
          return;
        }
        
        // Check if response is OK before parsing JSON
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
          console.error('Failed to initiate X OAuth:', errorData);
          alert(`Failed to connect X account: ${errorData.error || 'Unknown error'}`);
          setIsConnecting(false);
          setShowConnectingModal(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.authUrl) {
          // Immediately redirect to X authorization
          window.location.href = data.authUrl;
        } else {
          console.error('Failed to get auth URL:', data);
          alert(`Failed to get authorization URL: ${data.error || 'Unknown error'}`);
          setIsConnecting(false);
          setShowConnectingModal(false);
        }
      } catch (error) {
        console.error('Failed to connect X account:', error);
        setServiceUnavailable(true);
        setIsConnecting(false);
        setShowConnectingModal(false);
      }
    } else {
      // TODO: Implement other social connection functionality
      console.log('Connect:', platform);
    }
  };

  // Handle X account disconnect
  const handleXDisconnect = async () => {
    // TODO: Implement disconnect functionality
    // For now, just remove from UI - would need API endpoint to delete from DB
    setXAccount(null);
  };

  const handleSheetDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    dragStateRef.current = {
      startY: e.clientY,
      pointerId: e.pointerId,
    };
    setIsDraggingSheet(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSheetDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSheet || dragStateRef.current.pointerId !== e.pointerId) return;

    const nextOffset = Math.max(0, e.clientY - dragStateRef.current.startY);
    setDragOffset(nextOffset);
  };

  const finishSheetDrag = (pointerId?: number) => {
    const shouldClose = dragOffset > 120;

    setIsDraggingSheet(false);
    dragStateRef.current.pointerId = null;

    if (shouldClose) {
      onClose();
      return;
    }

    setDragOffset(0);
  };

  const handleSheetDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    finishSheetDrag(e.pointerId);
  };

  return (
    <div className={styles.modalWrapper} onClick={onClose}>
      <div
        className={`${styles.modal} ${isDraggingSheet ? styles.modalDragging : ''}`}
        style={{ transform: `translateY(${dragOffset}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.sheetHandleZone}
          onPointerDown={handleSheetDragStart}
          onPointerMove={handleSheetDragMove}
          onPointerUp={handleSheetDragEnd}
          onPointerCancel={handleSheetDragEnd}
        >
          <div className={styles.sheetHandle} aria-hidden="true" />
        </div>

        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span>链接</span>Edit Connections
          </div>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            <div className={styles.animatedButtonTextContainer}>
              <div className={styles.animatedButtonText}>CLOSE</div>
              <div className={`${styles.animatedButtonText} ${styles.animatedButtonTextClone}`}>CLOSE</div>
            </div>
          </button>
        </div>

        <div className={`${styles.modalBody} ${styles.bgPluses} ${styles.connectionsModal}`}>
          <div className={styles.connectionsContainer}>
            {/* Synced Blockchain Accounts Section */}
            <div>
              <p className={`${styles.strokedText} ${styles.large}`}>Synced Blockchain Accounts</p>
              <div className={styles.walletsContainer}>
                {syncedWalletAddress && (
                  <div className={`${styles.wallet} ${styles.shadowInnerGlow}`}>
                    <div>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 320 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z"></path>
                      </svg>
                      <span>{formatAddress(syncedWalletAddress)}</span>
                    </div>
                    <button
                      className={`${styles.animatedButton} ${styles.animatedButtonDisconnect} ${styles.walletDisconnectButton}`}
                      onClick={() => handleWalletDisconnect(syncedWalletAddress)}
                    >
                      <div className={styles.animatedButtonTextContainer}>
                        <div className={styles.animatedButtonText}>UNLINK</div>
                        <div className={`${styles.animatedButtonText} ${styles.animatedButtonTextClone}`}>UNLINK</div>
                      </div>
                    </button>
                  </div>
                )}
                {!syncedWalletAddress && !serviceUnavailable && (
                  <button 
                    className={`${styles.btn} ${styles.connect} ${styles.socialConnectButton}`}
                    onClick={handleSyncBlockchainAccount}
                  >
                    <div className={styles.socialConnectTextContainer}>
                      <div className={styles.socialConnectText}>Sync Blockchain Account</div>
                      <div className={`${styles.socialConnectText} ${styles.socialConnectTextClone}`}>Sync Blockchain Account</div>
                    </div>
                  </button>
                )}
                {serviceUnavailable && (
                  <div className={`${styles.emptyContainer} ${styles.gap}`} style={{ opacity: 0.7 }}>
                    <span style={{ color: '#ff9800' }}>⚠ Account syncing unavailable</span>
                    <span style={{ fontSize: '12px' }}>Please try again later</span>
                  </div>
                )}
              </div>
            </div>

            {/* Social Accounts Section */}
            <div>
              <p className={`${styles.strokedText} ${styles.large}`}>Social Accounts</p>
              
              {/* Service Unavailable Notice */}
              {serviceUnavailable && (
                <div className={`${styles.emptyContainer} ${styles.gap}`} style={{ marginBottom: '16px', opacity: 0.7 }}>
                  <span style={{ color: '#ff9800' }}>⚠ Connection services temporarily unavailable</span>
                  <span style={{ fontSize: '12px' }}>Please try again later</span>
                </div>
              )}
              
              {/* Connected X Account */}
              {!isLoading && xAccount && (
                <div className={styles.walletsContainer} style={{ marginBottom: '16px' }}>
                  <div className={`${styles.wallet} ${styles.shadowInnerGlow}`}>
                    <div>
                      <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 24 24"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                      </svg>
                      <span>@{xAccount.username}</span>
                    </div>
                    <button
                      className={`${styles.animatedButton} ${styles.animatedButtonDisconnect} ${styles.walletDisconnectButton}`}
                      onClick={handleXDisconnect}
                    >
                      <div className={styles.animatedButtonTextContainer}>
                        <div className={styles.animatedButtonText}>UNLINK</div>
                        <div className={`${styles.animatedButtonText} ${styles.animatedButtonTextClone}`}>UNLINK</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.socialsContainer}>
                {/* Connect X Account Button - Always show alongside LinkedIn and WhatsApp */}
                {!xAccount && !serviceUnavailable && (
                  <button
                    className={`${styles.btn} ${styles.connect} ${styles.socialConnectButton}`}
                    onClick={() => handleSocialConnect('twitter')}
                    disabled={isConnecting || isLoading}
                  >
                    <div className={styles.socialConnectTextContainer}>
                      <div className={styles.socialConnectText}>
                        {isConnecting ? 'Connecting...' : isLoading ? 'Loading...' : 'Connect X Account'}
                      </div>
                      <div className={`${styles.socialConnectText} ${styles.socialConnectTextClone}`}>
                        {isConnecting ? 'Connecting...' : isLoading ? 'Loading...' : 'Connect X Account'}
                      </div>
                    </div>
                  </button>
                )}
                <button
                  className={`${styles.btn} ${styles.connect} ${styles.socialConnectButton} ${styles.linkedinButton}`}
                  onClick={() => handleSocialConnect('linkedin')}
                >
                  <div className={styles.socialConnectTextContainer}>
                    <div className={styles.socialConnectText}>Connect LinkedIn</div>
                    <div className={`${styles.socialConnectText} ${styles.socialConnectTextClone}`}>Connect LinkedIn</div>
                  </div>
                </button>
                <button
                  className={`${styles.btn} ${styles.connect} ${styles.socialConnectButton} ${styles.whatsappButton}`}
                  onClick={() => handleSocialConnect('whatsapp')}
                >
                  <div className={styles.socialConnectTextContainer}>
                    <div className={styles.socialConnectText}>Connect WhatsApp</div>
                    <div className={`${styles.socialConnectText} ${styles.socialConnectTextClone}`}>Connect WhatsApp</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2FA Authenticators Section */}
            <div>
              <p className={`${styles.strokedText} ${styles.large}`}>2FA Authenticators</p>
              <div className={`${styles.emptyContainer} ${styles.tall} ${styles.gap}`}>
                <span>No 2FA setup yet</span>
                <span>Add 2FA to protect your account</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <XConnectingModal isOpen={showConnectingModal} />
      <BlockchainAccountModal
        isOpen={showBlockchainModal}
        onClose={() => setShowBlockchainModal(false)}
        onAccountSynced={handleAccountSynced}
      />
    </div>
  );
};

export default YourAccountsModal;
