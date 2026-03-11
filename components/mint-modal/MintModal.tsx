'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAccount } from 'wagmi'
import { providers } from 'ethers'
import { getEligibleInviteLists, getMintTransaction, SCATTER_COLLECTION_SLUG, type MintList } from '@/lib/scatter-api'
import { useSound } from '@/hooks/useSound'
import styles from './MintModal.module.css'

interface MintModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MintModal({ isOpen, onClose }: MintModalProps) {
  const { play } = useSound()
  const { address, isConnected, connector } = useAccount()
  const [mintLists, setMintLists] = useState<MintList[]>([])
  const [selectedList, setSelectedList] = useState<MintList | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'select' | 'minting' | 'success'>('select')
  const [collectionAddress, setCollectionAddress] = useState<string | null>(null)
  const [collectionChainId, setCollectionChainId] = useState<number | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      setMounted(false)
    }
  }, [])

  // Fetch collection info and eligible mint lists
  useEffect(() => {
    if (isOpen && isConnected && address) {
      setLoading(true)
      setError(null)
      
      // First fetch collection info to get address and chain ID
      fetch('/api/scatter/collection')
        .then(async (res) => {
          if (!res.ok) {
            const error = await res.json()
            throw new Error(error.error || 'Failed to fetch collection info')
          }
          return res.json()
        })
        .then(async (collectionInfo) => {
          if (collectionInfo.address) {
            setCollectionAddress(collectionInfo.address)
            setCollectionChainId(collectionInfo.chainId || 8453)
            
            // Then fetch mint lists if we have an address
            try {
              const lists = await getEligibleInviteLists({
                collectionSlug: SCATTER_COLLECTION_SLUG,
                walletAddress: address,
              })
              if (Array.isArray(lists)) {
                setMintLists(lists)
                if (lists.length > 0) {
                  setSelectedList(lists[0])
                }
              }
            } catch (listError) {
              console.error('Error fetching mint lists:', listError)
              // Don't throw - collection info is loaded, just no lists
            }
          } else {
            throw new Error('Collection address not found')
          }
        })
        .catch((err) => {
          console.error('Error fetching collection info or mint lists:', err)
          setError(err.message || 'Failed to fetch collection information')
        })
        .finally(() => {
          setLoading(false)
        })
    } else if (isOpen && !isConnected) {
      setError('Please connect your wallet to mint')
      setLoading(false)
    }
  }, [isOpen, isConnected, address])

  const handleMint = async () => {
    if (!selectedList || !address || !collectionAddress || !collectionChainId || !connector) return

    try {
      setLoading(true)
      setError(null)
      setStep('minting')

      // Get mint transaction
      const mintResponse = await getMintTransaction({
        collectionAddress: collectionAddress,
        chainId: collectionChainId,
        minterAddress: address,
        lists: [{ id: selectedList.id, quantity: 1 }],
      })

      // Get the provider from the connector
      const provider = await connector.getProvider() as any
      if (!provider) {
        throw new Error('Provider not available from connector')
      }

      // Convert EIP1193 provider to ethers Web3Provider
      const ethersProvider = new providers.Web3Provider(provider)
      const signer = ethersProvider.getSigner()
      
      // Switch to correct network if needed
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${collectionChainId.toString(16)}` }],
        })
      } catch (switchError: any) {
        // If chain doesn't exist, add it (for Base)
        if (switchError.code === 4902 && collectionChainId === 8453) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          })
        } else {
          throw switchError
        }
      }
      
      // Send transaction using ethers
      const tx = await signer.sendTransaction({
        to: mintResponse.mintTransaction.to,
        value: mintResponse.mintTransaction.value,
        data: mintResponse.mintTransaction.data,
      })
      
      setTxHash(tx.hash)
      await tx.wait()
      setStep('success')
    } catch (err) {
      console.error('Mint error:', err)
      setError(err instanceof Error ? err.message : 'Failed to purchase')
      setStep('select')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  if (!mounted) {
    // Ensure we have a DOM element to portal to
    return null
  }

  // Ensure document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  return createPortal(
    <div
      ref={modalRef}
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => { play('click'); onClose() }}
          onMouseEnter={() => play('hover')}
          className={styles.closeButton}
          type="button"
          aria-label="Close modal"
        >
          ×
        </button>

        <div className={styles.content}>
          {/* NFT Preview */}
          <div className={styles.nftPreview}>
            <div className={styles.nftImageContainer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://i.imgur.com/GXA3DBV.gif"
                alt="Angel NFT Preview"
                className={styles.nftImage}
              />
            </div>
          </div>
          <p className={styles.oneTimeBadge}>One-time purchase — yours forever</p>

          {!isConnected ? (
            <div>
              <p className={styles.message}>Please connect your wallet to buy</p>
              {error && (
                <div className={styles.errorMessage}>
                  <p className={styles.errorText}>{error}</p>
                </div>
              )}
            </div>
          ) : step === 'select' ? (
            <>
              {loading && mintLists.length === 0 ? (
                <div className={styles.loadingContainer}>
                  <p className={styles.loadingText}>Loading purchase options...</p>
                </div>
              ) : error ? (
                <div className={styles.errorMessage}>
                  <p className={styles.errorText}>{error}</p>
                </div>
              ) : mintLists.length === 0 ? (
                <div>
                  <p className={styles.message}>No eligible purchase options found</p>
                </div>
              ) : (
                <>
                  {selectedList && (
                    <div className={styles.infoCard}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Price:</span>
                        <span className={styles.infoValue}>
                          {selectedList.token_price} {selectedList.currency_symbol}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Wallet Limit:</span>
                        <span className={styles.infoValue}>
                          {selectedList.wallet_limit === 4294967295 ? 'Unlimited' : selectedList.wallet_limit}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => { play('click'); handleMint() }}
                    onMouseEnter={() => play('hover')}
                    disabled={loading || !selectedList}
                    className={styles.mintButton}
                    type="button"
                  >
                    {loading ? 'Processing...' : 'Buy Angel'}
                  </button>
                </>
              )}
            </>
          ) : step === 'minting' ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Confirming transaction in your wallet...</p>
            </div>
          ) : step === 'success' ? (
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>✨</div>
              <p className={styles.successTitle}>Purchase Successful!</p>
              <p className={styles.successMessage}>Your angel is on its way</p>
              {txHash && (
                <a
                  href={`https://basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.transactionLink}
                  onClick={() => play('navigation')}
                  onMouseEnter={() => play('hover')}
                >
                  View on BaseScan
                </a>
              )}
              <button
                onClick={() => { play('click'); onClose() }}
                onMouseEnter={() => play('hover')}
                className={styles.closeButtonSecondary}
                type="button"
              >
                Close
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
