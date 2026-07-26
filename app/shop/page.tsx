'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import type { ExternalProvider } from '@ethersproject/providers';
import { ShopPageSkeleton } from '@/components/skeleton/Skeleton';
import { ensureBaseChain, type Eip1193Provider } from '@/lib/ensure-base-chain';
import { fetchDiamondBalance } from '@/lib/diamonds-balance';
import { shopItems, getDiamondPrice, type ShopItem, type BadgeType } from '@/lib/shop-catalog';
import { useSound } from '@/hooks/useSound';
import { getDiamondsTokenAddress, BURN_ADDRESS } from '@/lib/chain-config';
import styles from './page.module.css';

const DIAMONDS_TOKEN_ADDRESS = getDiamondsTokenAddress();
const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

type PayPhase = 'idle' | 'burning' | 'verifying' | 'done';

const ALL_CATEGORIES = ['All', ...Array.from(new Set(shopItems.map((i) => i.category)))];

const badgeClassMap: Record<BadgeType, string> = {
  new: 'badgeNew',
  limited: 'badgeLimited',
  exclusive: 'badgeExclusive',
  free: 'badgeFree',
  'sold-out': 'badgeSoldOut',
};

const badgeLabel = (badge: BadgeType) => badge.replace('-', ' ');

export default function ShopPage() {
  const { play } = useSound();
  const { authenticated, login } = usePrivy();
  const { address, isConnected, connector } = useAccount();
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [payItem, setPayItem] = useState<ShopItem | null>(null);
  const [payPhase, setPayPhase] = useState<PayPhase>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isMintingItemId, setIsMintingItemId] = useState<string | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  useEffect(() => {
    if (!payItem || !address) { setBalance(null); return; }
    let cancelled = false;
    fetchDiamondBalance(address).then((b) => { if (!cancelled) setBalance(b); });
    return () => { cancelled = true; };
  }, [payItem, address]);

  const handleMintNow = async (item: ShopItem) => {
    if (item.badge === 'sold-out') return;
    play('click');
    setMintError(null);

    if (!authenticated) {
      login();
      return;
    }

    setIsMintingItemId(item.id);
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMintError(data?.error || 'Could not start Stripe checkout.');
        setIsMintingItemId(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setMintError('Invalid checkout response.');
        setIsMintingItemId(null);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setMintError('Could not connect to payment gateway.');
      setIsMintingItemId(null);
    }
  };

  const payWithDiamonds = async (item: ShopItem) => {
    if (payPhase !== 'idle') return;
    const price = getDiamondPrice(item.id);
    if (!price) return;
    setPayError(null);
    if (!authenticated) { setPayError('Sign in to pay with diamonds.'); return; }
    if (!isConnected || !connector) { setPayError('Connect a wallet to pay with diamonds.'); return; }
    if (!DIAMONDS_TOKEN_ADDRESS) { setPayError('Diamonds token is not configured.'); return; }
    if (balance !== null && balance < price) { setPayError(`You need ${price} diamonds — you have ${balance}.`); return; }

    setPayPhase('burning');
    try {
      const eip1193 = (await connector.getProvider()) as Eip1193Provider;
      await ensureBaseChain(eip1193);
      const { Contract, providers, utils } = await import('ethers');
      const web3 = new providers.Web3Provider(eip1193 as ExternalProvider);
      const token = new Contract(DIAMONDS_TOKEN_ADDRESS, ERC20_TRANSFER_ABI, web3.getSigner());
      const tx = await token.transfer(BURN_ADDRESS, utils.parseUnits(String(price), 18));
      await tx.wait(1);

      setPayPhase('verifying');
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, txHash: tx.hash }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(data?.error === 'tx_already_used' ? 'That burn was already redeemed.' : 'Could not verify the burn. Try again.');
        setPayPhase('idle');
        return;
      }
      setPayPhase('done');
    } catch (err: any) {
      if (err?.code === 4001 || err?.code === 'ACTION_REJECTED') setPayError('Payment cancelled in wallet.');
      else if (err?.code === 'INSUFFICIENT_FUNDS') setPayError('Not enough ETH on Base to cover gas.');
      else setPayError('Could not complete the payment. Try again.');
      setPayPhase('idle');
    }
  };

  const closePay = () => { if (payPhase === 'burning' || payPhase === 'verifying') return; setPayItem(null); setPayPhase('idle'); setPayError(null); };

  const filtered = activeCategory === 'All' ? shopItems : shopItems.filter((i) => i.category === activeCategory);

  useEffect(() => {
    // Show skeleton briefly, then reveal content
    const timer = setTimeout(() => {
      setIsContentLoading(false);
    }, 600);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedItem(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (isContentLoading) {
    return (
      <div className={styles.pageLayout}>
        <main className={styles.page}>
          <ShopPageSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.pageLayout}>
      <main className={styles.page}>
        {/* Category pills */}
        <div className={styles.categories}>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryPill} ${activeCategory === cat ? styles.categoryPillActive : ''}`}
              onClick={() => { play('click'); setActiveCategory(cat); }}
              onMouseEnter={() => play('hover')}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={styles.productGrid}>
          {filtered.map((item) => {
            const isSoldOut = item.badge === 'sold-out';
            return (
            <button
              key={item.id}
              type="button"
              className={styles.productCard}
              onClick={() => { if (isSoldOut) return; play('click'); setMintError(null); setSelectedItem(item); }}
              onMouseEnter={() => { if (!isSoldOut) play('hover'); }}
              aria-disabled={isSoldOut}
            >
              <img
                className={styles.productImage}
                src={item.image}
                alt={item.title}
                loading="lazy"
                draggable={false}
                referrerPolicy="no-referrer"
              />
              <span className={styles.cardMeta}>
                <span className={styles.metaText}>
                  <span className={styles.metaTitle}>{item.title}</span>
                  <span className={styles.metaSub}>{item.sub}</span>
                </span>
                <span className={styles.metaFooter}>
                  <span className={styles.metaPrice}>{item.price}</span>
                  {item.badge && (
                    <span className={`${styles.metaBadge} ${styles[badgeClassMap[item.badge]]}`}>
                      {badgeLabel(item.badge)}
                    </span>
                  )}
                </span>
              </span>
            </button>
            );
          })}
        </div>

        {/* Detail Modal */}
        {selectedItem && (
          <div className={styles.detailOverlay} onClick={() => { setSelectedItem(null); setMintError(null); }}>
            <div className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailImageWrap}>
                <img className={styles.detailImage} src={selectedItem.image} alt={selectedItem.title} referrerPolicy="no-referrer" />
              </div>
              <div className={styles.detailInfo}>
                {selectedItem.badge && (
                  <span className={`${styles.detailBadge} ${styles[badgeClassMap[selectedItem.badge]]}`}>
                    {badgeLabel(selectedItem.badge)}
                  </span>
                )}
                <span className={styles.detailTitle}>{selectedItem.title}</span>
                <span className={styles.detailSub}>{selectedItem.sub}</span>
                <div className={styles.detailDivider} />
                <p className={styles.detailDesc}>{selectedItem.desc}</p>
                <span className={styles.detailPrice}>
                  {selectedItem.price}
                  {getDiamondPrice(selectedItem.id) && (
                    <span className={styles.detailPriceAlt}>or {getDiamondPrice(selectedItem.id)} diamonds</span>
                  )}
                </span>
                {mintError && (
                  <p className={styles.payErrorText} role="alert" style={{ margin: '8px 0 0 0' }}>
                    {mintError}
                  </p>
                )}
                <div className={styles.detailActions}>
                  <button
                    className={styles.detailMintButton}
                    onClick={() => handleMintNow(selectedItem)}
                    onMouseEnter={() => selectedItem.badge !== 'sold-out' && play('hover')}
                    disabled={selectedItem.badge === 'sold-out' || isMintingItemId === selectedItem.id}
                  >
                    {selectedItem.badge === 'sold-out'
                      ? 'Sold Out'
                      : isMintingItemId === selectedItem.id
                      ? 'Loading…'
                      : 'Mint Now'}
                  </button>
                  {selectedItem.badge !== 'sold-out' && getDiamondPrice(selectedItem.id) && (
                    <button
                      className={styles.detailDiamondButton}
                      onClick={() => { play('click'); setPayError(null); setPayItem(selectedItem); setPayPhase('idle'); }}
                      onMouseEnter={() => play('hover')}
                    >
                      Pay with diamonds
                    </button>
                  )}
                </div>
              </div>
            </div>
            <button
              className={styles.detailClose}
              onClick={() => { setSelectedItem(null); setMintError(null); }}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Pay with diamonds — burn confirmation */}
        {payItem && (
          <div className={styles.payOverlay} onClick={closePay}>
            <div className={styles.payDialog} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className={styles.payTitleBar}>
                <span className={styles.payTitleText}>pay.diamonds</span>
              </div>
              <div className={styles.payBody}>
                {payPhase === 'done' ? (
                  <>
                    <p className={styles.payMessage}>
                      Paid. Your {payItem.title} order is in — we will follow up on delivery.
                    </p>
                    <div className={styles.payButtons}>
                      <button type="button" className={styles.payBtnBurn} onClick={() => { play('click'); closePay(); setSelectedItem(null); }} onMouseEnter={() => play('hover')}>
                        Done
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles.payMessage}>
                      Burn {getDiamondPrice(payItem.id)} diamonds for {payItem.title}? Diamonds are spent for good.
                    </p>
                    {balance !== null && (
                      <p className={styles.payBalance}>You have {balance} diamonds.</p>
                    )}
                    {payError && <p className={styles.payErrorText} role="alert">{payError}</p>}
                    <div className={styles.payButtons}>
                      <button type="button" className={styles.payBtnCancel} onClick={() => { play('click'); closePay(); }} onMouseEnter={() => play('hover')} disabled={payPhase !== 'idle'}>
                        Cancel
                      </button>
                      <button type="button" className={styles.payBtnBurn} onClick={() => { play('click'); payWithDiamonds(payItem); }} onMouseEnter={() => play('hover')} disabled={payPhase !== 'idle'}>
                        {payPhase === 'burning' ? 'Burning…' : payPhase === 'verifying' ? 'Verifying…' : 'Pay'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
