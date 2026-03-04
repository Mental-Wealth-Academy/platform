'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSound } from '@/hooks/useSound'
import styles from './SwapModal.module.css'

interface SwapModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { play } = useSound()
  const [mounted, setMounted] = useState(false)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [isReversed, setIsReversed] = useState(false)

  const RATE = 100 // 1 POINTS = 100 POWER

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const fromToken = isReversed ? 'POWER' : 'POINTS'
  const toToken = isReversed ? 'POINTS' : 'POWER'
  const fromBalance = '0.00'
  const toBalance = '0.00'

  const handleFromChange = (value: string) => {
    setFromAmount(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      const converted = isReversed ? num / RATE : num * RATE
      setToAmount(converted.toFixed(2))
    } else {
      setToAmount('')
    }
  }

  const handleSwapDirection = () => {
    setIsReversed(!isReversed)
    setFromAmount('')
    setToAmount('')
  }

  if (!isOpen) return null

  if (!mounted) {
    return null
  }

  if (typeof document === 'undefined' || !document.body) {
    return null
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => { play('click'); onClose() }}
          onMouseEnter={() => play('hover')}
          className={styles.closeButton}
          type="button"
          aria-label="Close modal"
        >
          &times;
        </button>

        <div className={styles.content}>
          <div className={styles.header}>
            <h2 className={styles.title}>Exchange</h2>
          </div>

          {/* From Token */}
          <div className={styles.tokenCard}>
            <div className={styles.tokenRow}>
              <div className={styles.tokenInfo}>
                <span className={styles.tokenLabel}>From</span>
                <span className={styles.tokenName}>{fromToken}</span>
              </div>
              <input
                type="number"
                className={styles.tokenInput}
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => handleFromChange(e.target.value)}
                min="0"
              />
            </div>
            <div className={styles.balanceRow}>
              <span className={styles.balanceLabel}>Balance: {fromBalance}</span>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className={styles.swapButtonRow}>
            <button
              className={styles.swapDirectionBtn}
              onClick={() => { play('click'); handleSwapDirection() }}
              onMouseEnter={() => play('hover')}
              type="button"
              aria-label="Swap direction"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 16L7 4M7 4L3 8M7 4L11 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 8L17 20M17 20L21 16M17 20L13 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* To Token */}
          <div className={styles.tokenCard}>
            <div className={styles.tokenRow}>
              <div className={styles.tokenInfo}>
                <span className={styles.tokenLabel}>To</span>
                <span className={styles.tokenName}>{toToken}</span>
              </div>
              <input
                type="number"
                className={styles.tokenInput}
                placeholder="0.00"
                value={toAmount}
                readOnly
              />
            </div>
            <div className={styles.balanceRow}>
              <span className={styles.balanceLabel}>Balance: {toBalance}</span>
            </div>
          </div>

          {/* Rate Display */}
          <div className={styles.rateRow}>
            <span className={styles.rateLabel}>Rate</span>
            <span className={styles.rateValue}>
              1 POINT = 100 POWER
            </span>
          </div>

          {/* Swap CTA */}
          <button className={styles.swapCta} onClick={() => play('click')} onMouseEnter={() => play('hover')} type="button">
            Swap
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
