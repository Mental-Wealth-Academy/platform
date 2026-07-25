'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { Contract, providers } from 'ethers';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useDevMode } from '../useDevMode';
import ModalShell from '@/components/shared/ModalShell';
import styles from './ProMembershipModal.module.css';

interface ProMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Screen = 'intro' | 'account' | 'duplicate-warning' | 'purchase' | 'transfer';
type TransferPhase = 'working' | 'done' | 'failed';
type PaymentMethod = 'card' | 'crypto';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const CARD_PAYMENTS_ENABLED = Boolean(PUBLISHABLE_KEY);
let cachedStripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(): Promise<Stripe | null> | null {
  if (!PUBLISHABLE_KEY) return null;
  if (!cachedStripePromise) cachedStripePromise = loadStripe(PUBLISHABLE_KEY);
  return cachedStripePromise;
}

const BLUE_AVATAR = '/uploads/blueagent.png';
const MEMBERSHIP_IMAGE = '/uploads/vip-membership-card.png';
const EXXIE_IMAGE = '/exxie.png';
const PRICE_LABEL = '$888';
const CHECKOUT_REQUEST_TIMEOUT_MS = 20_000;
const FEATURES = [
  "Unlock Blue's AI Power-Tools",
  'Access Community Treasury',
  'MWA-7B Model & Datasets',
  'Lifetime Magazine Subscription',
];

const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];
const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_ID_HEX = '0x2105';
const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID_HEX,
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

async function checkoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CHECKOUT_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('The checkout service took too long to respond. Please try again.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

function getProviderErrorCode(err: unknown): string | number | undefined {
  return (err as { code?: string | number })?.code;
}

async function ensureBaseChain(eip1193: Eip1193Provider): Promise<void> {
  const current = await eip1193.request({ method: 'eth_chainId' }).catch(() => null);
  if (typeof current === 'string' && current.toLowerCase() === BASE_CHAIN_ID_HEX) return;

  try {
    await eip1193.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
  } catch (err) {
    const code = getProviderErrorCode(err);
    if (code !== 4902 && code !== '4902') throw err;
    await eip1193.request({
      method: 'wallet_addEthereumChain',
      params: [BASE_CHAIN_PARAMS],
    });
  }

  const after = await eip1193.request({ method: 'eth_chainId' });
  if (typeof after !== 'string' || after.toLowerCase() !== BASE_CHAIN_ID_HEX) {
    throw new Error('Switch your wallet to Base to pay with crypto.');
  }
}

function CheckoutSummary() {
  return (
    <div className={styles.orderSummary} aria-label="Order summary">
      <div className={styles.orderItem}>
        <Image
          src={MEMBERSHIP_IMAGE}
          alt="VIP Membership card"
          width={1008}
          height={619}
          className={styles.orderItemImage}
        />
        <div className={styles.orderItemText}>
          <p className={styles.orderItemTitle}>VIP Membership Card</p>
          <p className={styles.orderItemMeta}>Lifetime access · Qty 1</p>
        </div>
        <span className={styles.orderItemPrice}>{PRICE_LABEL}</span>
      </div>
      <div className={styles.orderTotalRow}>
        <span>Total due today</span>
        <strong>{PRICE_LABEL}</strong>
      </div>
    </div>
  );
}

/* ── Stripe checkout form (must render inside <Elements>) ─────────────────── */

function CheckoutForm({ onPaid }: { onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setError(null);

    const { error: payError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (payError) {
      setError(payError.message || 'Payment could not be completed.');
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onPaid();
      return;
    }

    setError('Payment did not complete. Please try again.');
    setSubmitting(false);
  };

  return (
    <form className={styles.checkoutForm} onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className={styles.formError}>{error}</p>}
      <button
        type="submit"
        className={`${styles.ctaButton} ${styles.ctaButtonBuy}`}
        disabled={!stripe || submitting}
      >
        <span>{submitting ? 'Processing...' : `Pay ${PRICE_LABEL}`}</span>
      </button>
    </form>
  );
}

/* ── Crypto checkout — pay Blue's wallet directly in USDC or ETH ──────────── */

interface CryptoIntent {
  orderId: string;
  blueWallet: string;
  chainId: number;
  usdcAddress: string;
  quote: {
    usdAmount: number;
    usdc: { amount: string; decimals: number; display: string };
    eth: { amount: string; decimals: number; display: string; usdPrice: number };
  };
}

function CryptoCheckout({
  authHeaders,
  onPaid,
}: {
  authHeaders: () => Promise<HeadersInit>;
  onPaid: (orderId: string) => void;
}) {
  const { isConnected, connector } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<CryptoIntent | null>(null);
  const [paying, setPaying] = useState<'usdc' | 'eth' | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Reserve a slot and quote the price the moment crypto checkout is shown.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await checkoutFetch('/api/membership/crypto-intent', {
          method: 'POST',
          credentials: 'include',
          headers: await authHeaders(),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || 'Could not start crypto checkout.');
          return;
        }
        setIntent(data as CryptoIntent);
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : 'Could not reach the checkout service.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, retryKey]);

  const pay = async (currency: 'usdc' | 'eth') => {
    if (!intent || paying) return;
    if (!isConnected || !connector) {
      setError('Connect a wallet first to pay with crypto.');
      return;
    }

    setPaying(currency);
    setError(null);

    try {
      if (intent.chainId !== BASE_CHAIN_ID) {
        throw new Error('Crypto checkout is only configured for Base.');
      }
      const eip1193 = (await connector.getProvider()) as Eip1193Provider;
      await ensureBaseChain(eip1193);
      const web3Provider = new providers.Web3Provider(eip1193 as providers.ExternalProvider);
      const signer = web3Provider.getSigner();

      let txHash: string;
      if (currency === 'eth') {
        const tx = await signer.sendTransaction({
          to: intent.blueWallet,
          value: intent.quote.eth.amount,
        });
        txHash = tx.hash;
      } else {
        const usdc = new Contract(intent.usdcAddress, ERC20_TRANSFER_ABI, signer);
        const tx = await usdc.transfer(intent.blueWallet, intent.quote.usdc.amount);
        txHash = tx.hash;
      }

      // Hand the payment hash to the server right away. Once it is recorded the
      // server owns delivery — verification and the NFT transfer happen in the
      // backend reconcile worker, so closing this tab no longer loses the order.
      const headers = (await authHeaders()) as Record<string, string>;
      const confirmRes = await checkoutFetch('/api/membership/confirm-crypto', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: intent.orderId, currency, txHash }),
      });
      const confirmData = await confirmRes.json().catch(() => ({}));

      if (confirmRes.ok) {
        // Payment recorded — the transfer screen polls the order to completion.
        onPaid(intent.orderId);
        return;
      }

      setError(confirmData?.error || 'Payment sent, but we could not record it. Contact support.');
      setPaying(null);
    } catch (err) {
      const e = err as { shortMessage?: string; reason?: string; message?: string; code?: string };
      const msg =
        e?.code === 'ACTION_REJECTED'
          ? 'Payment was cancelled in your wallet.'
          : e?.shortMessage || e?.reason || e?.message || 'Payment could not be completed.';
      setError(msg);
      setPaying(null);
    }
  };

  if (loading) {
    return <p className={styles.loadingText}>Preparing crypto checkout...</p>;
  }
  if (error && !intent) {
    return (
      <div className={styles.formErrorBlock}>
        <p className={styles.formError}>{error}</p>
        <button
          type="button"
          className={styles.inlineRetryButton}
          onClick={() => setRetryKey((value) => value + 1)}
        >
          Try again
        </button>
      </div>
    );
  }
  if (!intent) return null;

  const { quote } = intent;

  return (
    <div className={styles.cryptoOptions}>
      {!isConnected && (
        <p className={styles.walletNote}>Connect a wallet to pay with crypto.</p>
      )}

      <button
        type="button"
        className={`${styles.ctaButton} ${styles.ctaButtonBuy}`}
        onClick={() => pay('usdc')}
        disabled={!!paying || !isConnected}
      >
        <span>{paying === 'usdc' ? 'Confirm in wallet...' : `Pay ${quote.usdc.display} USDC`}</span>
      </button>

      <button
        type="button"
        className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}
        onClick={() => pay('eth')}
        disabled={!!paying || !isConnected}
      >
        <span>{paying === 'eth' ? 'Confirm in wallet...' : `Pay ${quote.eth.display} ETH`}</span>
      </button>

      <p className={styles.cryptoMeta}>
        {`ETH quote: ${quote.eth.display} ETH for the ${PRICE_LABEL} total. Gas not included.`}
      </p>

      {error && <p className={styles.formError}>{error}</p>}

      <p className={styles.secureNote}>Paid straight to Blue&apos;s wallet on Base.</p>
    </div>
  );
}

/* ── Transfer animation stage ────────────────────────────────────────────── */

function TransferStage({
  phase,
  userAvatar,
}: {
  phase: TransferPhase;
  userAvatar: string | null;
}) {
  const settled = phase === 'done';

  return (
    <div className={styles.transferStage}>
      <svg className={styles.flowSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
        <line
          x1="16"
          y1="16"
          x2="78"
          y2="80"
          className={`${styles.flowLine} ${settled ? styles.flowLineSettled : ''}`}
        />
      </svg>

      {/* Blue — top left */}
      <div className={`${styles.node} ${styles.nodeBlue}`}>
        <img src={BLUE_AVATAR} alt="Blue" />
      </div>

      {/* Human — bottom right */}
      <div className={`${styles.node} ${styles.nodeUser}`}>
        {userAvatar ? (
          <img src={userAvatar} alt="You" />
        ) : (
          <div className={styles.nodeFallback}>You</div>
        )}
        {settled && (
          <motion.div
            className={styles.nodeCheck}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.5 4.5L6.5 11.5L2.5 7.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* The membership card travelling along the line */}
      <motion.div
        className={styles.travelCard}
        initial={{ left: '13%', top: '11%', opacity: 0, scale: 0.7 }}
        animate={
          settled
            ? { left: '63%', top: '63%', opacity: 1, scale: 0.92 }
            : {
                left: ['13%', '63%'],
                top: ['11%', '63%'],
                opacity: [0, 1, 1, 0],
                scale: [0.7, 1, 1, 0.85],
              }
        }
        transition={
          settled
            ? { duration: 0.55, ease: 'easeOut' }
            : { duration: 2.1, repeat: Infinity, ease: 'easeInOut', times: [0, 0.2, 0.8, 1] }
        }
      >
        <img src={MEMBERSHIP_IMAGE} alt="VIP Membership" />
      </motion.div>
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */

const ProMembershipModal: React.FC<ProMembershipModalProps> = ({ isOpen, onClose }) => {
  const { ready, authenticated, login, getAccessToken } = usePrivy();
  const devMode = useDevMode();

  const [screen, setScreen] = useState<Screen>('intro');
  // No method is pre-selected when card is available — the buyer must choose,
  // so the Stripe PaymentIntent is not opened until they actually pick "Card".
  const [method, setMethod] = useState<PaymentMethod | null>(CARD_PAYMENTS_ENABLED ? null : 'crypto');
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [membershipCheckLoading, setMembershipCheckLoading] = useState(false);
  const [membershipCheckError, setMembershipCheckError] = useState<string | null>(null);
  const [resumeAfterLogin, setResumeAfterLogin] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [transferPhase, setTransferPhase] = useState<TransferPhase>('working');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [transferPollAttempt, setTransferPollAttempt] = useState(0);
  const cardIntentAttemptedRef = useRef(false);
  const cardIntentInFlightRef = useRef(false);

  const authHeaders = useCallback(async (): Promise<HeadersInit> => {
    try {
      const token = await getAccessToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }, [getAccessToken]);

  // Reset everything when the modal is closed.
  useEffect(() => {
    if (!isOpen) {
      setScreen('intro');
      setMethod(CARD_PAYMENTS_ENABLED ? null : 'crypto');
      setStripePromise(null);
      setClientSecret(null);
      setOrderId(null);
      setIntentError(null);
      cardIntentAttemptedRef.current = false;
      cardIntentInFlightRef.current = false;
      setMembershipCheckLoading(false);
      setMembershipCheckError(null);
      setResumeAfterLogin(false);
      setTransferPhase('working');
      setTransferError(null);
      setTxHash(null);
      setTransferPollAttempt(0);
    }
  }, [isOpen]);

  const continueToPurchase = useCallback(async () => {
    if (membershipCheckLoading) return;

    setMembershipCheckError(null);
    if (!ready) {
      setMembershipCheckError('Secure sign-in is still starting. Please try again in a moment.');
      return;
    }
    if (!authenticated) {
      setResumeAfterLogin(true);
      try {
        await login();
      } catch {
        setResumeAfterLogin(false);
        setMembershipCheckError('Account setup could not open. Please try again.');
      }
      return;
    }

    setMembershipCheckLoading(true);
    try {
      const accountResponse = await checkoutFetch('/api/auth/wallet-signup', {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
      });
      const accountData = await accountResponse.json().catch(() => ({}));
      if (!accountResponse.ok) {
        throw new Error(accountData?.error || 'Could not create your Academy account.');
      }

      const res = await checkoutFetch('/api/membership/holding-status', {
        method: 'GET',
        credentials: 'include',
        headers: await authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.hasVipMembershipCard) {
        setScreen('duplicate-warning');
        return;
      }
      if (res.ok) {
        setScreen('purchase');
        return;
      }
      setMembershipCheckError(data?.error || 'Could not check your current membership.');
    } catch (error) {
      setMembershipCheckError(
        error instanceof Error ? error.message : 'Could not prepare checkout. Please try again.',
      );
    } finally {
      setMembershipCheckLoading(false);
    }
  }, [authenticated, authHeaders, login, membershipCheckLoading, ready]);

  useEffect(() => {
    if (!isOpen || !authenticated || !resumeAfterLogin) return;
    setResumeAfterLogin(false);
    void continueToPurchase();
  }, [authenticated, continueToPurchase, isOpen, resumeAfterLogin]);

  // Dev-only: drop straight into a screen / transfer phase, no real payment.
  const devJump = useCallback((target: Screen | 'transfer:done' | 'transfer:failed') => {
    setIntentError(null);
    cardIntentAttemptedRef.current = false;
    cardIntentInFlightRef.current = false;
    if (target === 'transfer:done') {
      setOrderId(null); // no orderId -> polling stays off, phase is ours to set
      setTxHash('0xdev0000000000000000000000000000000000000000000000000000000000000');
      setTransferError(null);
      setTransferPhase('done');
      setScreen('transfer');
      return;
    }
    if (target === 'transfer:failed') {
      setOrderId(null);
      setTxHash(null);
      setTransferError('Payment received, but the NFT transfer did not complete. (dev preview)');
      setTransferPhase('failed');
      setScreen('transfer');
      return;
    }
    if (target === 'transfer') {
      setOrderId(null);
      setTransferError(null);
      setTransferPhase('working');
    }
    setScreen(target);
  }, []);

  // Close on escape, lock body scroll.
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Load the buyer's avatar for the transfer screen.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void authHeaders().then((headers) => fetch('/api/me', { credentials: 'include', headers }))
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.user?.avatarUrl) setUserAvatar(data.user.avatarUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authHeaders, isOpen]);

  // Open a Stripe payment intent — only for the card path.
  const ensureCardIntent = useCallback(async () => {
    if (clientSecret || cardIntentAttemptedRef.current || cardIntentInFlightRef.current) return;

    cardIntentAttemptedRef.current = true;
    cardIntentInFlightRef.current = true;
    setIntentLoading(true);
    setIntentError(null);
    try {
      const res = await checkoutFetch('/api/membership/create-intent', {
        method: 'POST',
        credentials: 'include',
        headers: await authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        setIntentError(data?.error || 'Could not start checkout.');
        return;
      }
      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
    } catch {
      setIntentError('Could not reach the payment service.');
    } finally {
      cardIntentInFlightRef.current = false;
      setIntentLoading(false);
    }
  }, [clientSecret, authHeaders]);

  const retryCardIntent = useCallback(() => {
    cardIntentAttemptedRef.current = false;
    cardIntentInFlightRef.current = false;
    void ensureCardIntent();
  }, [ensureCardIntent]);

  // Fetch the Stripe intent lazily once the card path is on screen.
  useEffect(() => {
    if (screen === 'purchase' && method === 'card' && CARD_PAYMENTS_ENABLED) {
      setStripePromise(getStripePromise());
      void ensureCardIntent();
    }
  }, [screen, method, ensureCardIntent]);

  // Poll order status while the transfer screen is showing.
  useEffect(() => {
    if (screen !== 'transfer' || !orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await checkoutFetch(
          `/api/membership/order-status?orderId=${encodeURIComponent(orderId)}`,
          { credentials: 'include', headers: await authHeaders() },
        );
        const data = await res.json();
        if (cancelled) return;

        if (data.status === 'transferred') {
          setTxHash(data.txHash || null);
          setTransferPhase('done');
          return;
        }
        if (data.status === 'failed' || data.status === 'expired') {
          setTransferError(
            data.error || 'We could not confirm card delivery yet.',
          );
          setTransferPhase('failed');
          return;
        }
      } catch {
        /* keep polling through transient errors */
      }
      if (!cancelled) timer = setTimeout(poll, 3000);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [screen, orderId, authHeaders, transferPollAttempt]);

  const retryDelivery = useCallback(() => {
    if (!orderId) return;
    setTransferError(null);
    setTransferPhase('working');
    setTransferPollAttempt((attempt) => attempt + 1);
  }, [orderId]);

  useEffect(() => {
    if (transferPhase === 'done') {
      window.dispatchEvent(new Event('vipMembershipUpdated'));
    }
  }, [transferPhase]);

  if (!isOpen) return null;

  const elementsOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'flat' as const,
          variables: { colorPrimary: '#5168FF', borderRadius: '4px' },
        },
      }
    : undefined;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} hideHeader maxWidth="lg">

        {/* ── Screen 1: VIP intro ───────────────────────────────────────── */}
        {screen === 'intro' && (
          <div className={styles.content}>
            <div className={styles.imageWrapper}>
              <Image
                src={MEMBERSHIP_IMAGE}
                alt="VIP Membership card"
                width={1008}
                height={619}
                className={styles.membershipImage}
                priority
              />
            </div>

            <div className={styles.textContent}>
              <span className={styles.badge}>VIP Membership</span>
              <h2 id="membership-checkout-title" className={styles.title}>Earn Your Wings</h2>
              <p className={styles.description}>
                Mental Wealth Academy is a research cohort built like a club,
                not a classroom. One membership unlocks the path to excellence.
              </p>

              <p className={styles.benefitsHeading}>Benefits Include:</p>
              <ul className={styles.featureList}>
                {FEATURES.map((feature) => (
                  <li key={feature} className={styles.featureItem}>
                    <svg
                      className={styles.checkIcon}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M13.5 4.5L6.5 11.5L2.5 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`${styles.ctaButton} ${styles.ctaButtonBuy}`}
                onClick={() => setScreen('account')}
              >
                <span>Next</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Screen 1a: Account setup ─────────────────────────────────── */}
        {screen === 'account' && (
          <div className={styles.content}>
            <button className={styles.backLink} onClick={() => setScreen('intro')} type="button">
              Back
            </button>
            <div className={styles.textContent}>
              <span className={styles.badge}>Step 1 of 2</span>
              <h2 id="membership-checkout-title" className={styles.title}>Create your account</h2>
              <p className={styles.description}>
                Your account records the purchase and the wallet that receives your membership card.
              </p>
              {!ready && (
                <p className={styles.secureNote}>
                  Secure sign-in is starting. Try again in a moment.
                </p>
              )}
              <button
                className={`${styles.ctaButton} ${styles.ctaButtonBuy}`}
                onClick={continueToPurchase}
                disabled={membershipCheckLoading}
              >
                <span>
                  {membershipCheckLoading
                    ? 'Preparing checkout...'
                    : authenticated
                      ? 'Continue to checkout'
                      : 'Create account'}
                </span>
              </button>
              {membershipCheckError && (
                <p className={styles.formError}>{membershipCheckError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Screen 1b: Repeat-purchase warning ───────────────────────── */}
        {screen === 'duplicate-warning' && (
          <div className={styles.content}>
            <button
              className={styles.backLink}
              onClick={() => {
                cardIntentAttemptedRef.current = false;
                cardIntentInFlightRef.current = false;
                setIntentError(null);
                setScreen('account');
              }}
              type="button"
            >
              Back
            </button>
            <div className={styles.imageWrapper}>
              <Image
                src={MEMBERSHIP_IMAGE}
                alt="VIP Membership card"
                width={1008}
                height={619}
                className={styles.membershipImage}
              />
            </div>
            <div className={styles.textContent}>
              <span className={styles.badge}>Already a Member</span>
              <h2 id="membership-checkout-title" className={styles.title}>
                You already have one, are you sure you want another one?
              </h2>
              <p className={styles.description}>
                Digital memberships can be traded and exchanged to other accounts and inventories.
              </p>
              <div className={styles.duplicateActions}>
                <button
                  type="button"
                  className={`${styles.ctaButton} ${styles.ctaButtonBuy}`}
                  onClick={() => setScreen('purchase')}
                >
                  <span>Buy another membership</span>
                </button>
                <button
                  type="button"
                  className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}
                  onClick={() => setScreen('account')}
                >
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Screen 2: Purchase ────────────────────────────────────────── */}
        {screen === 'purchase' && (
          <div className={styles.content}>
            <button
              className={styles.backLink}
              onClick={() => setScreen('account')}
              type="button"
            >
              Back
            </button>
            <div className={styles.imageWrapper}>
              <Image
                src={EXXIE_IMAGE}
                alt="Exxie"
                width={1068}
                height={1473}
                className={styles.exxieImage}
              />
            </div>
            <div className={styles.textContent}>
              <span className={styles.badge}>Step 2 of 2</span>
              <h2 id="membership-checkout-title" className={styles.title}>Checkout</h2>
              <p className={styles.description}>
                VIP Membership. Lifetime access, charged once.
              </p>

              <CheckoutSummary />

              {/* Payment method picker — card path is only offered when Stripe
                  is configured; the crypto path always works. */}
              {CARD_PAYMENTS_ENABLED && (
                <div className={styles.methodToggle}>
                  <button
                    type="button"
                    className={`${styles.methodOption} ${method === 'card' ? styles.methodOptionActive : ''}`}
                    onClick={() => setMethod('card')}
                    aria-pressed={method === 'card'}
                  >
                    <span className={styles.methodLabel}>Card</span>
                    <span className={styles.methodHint}>Secure checkout</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.methodOption} ${method === 'crypto' ? styles.methodOptionActive : ''}`}
                    onClick={() => setMethod('crypto')}
                    aria-pressed={method === 'crypto'}
                  >
                    <span className={styles.methodLabel}>Crypto</span>
                    <span className={styles.methodHint}>USDC or ETH on Base</span>
                  </button>
                </div>
              )}

              {CARD_PAYMENTS_ENABLED && !method && (
                <p className={styles.secureNote}>Choose how you would like to pay.</p>
              )}

              {/* Card path */}
              {method === 'card' && (
                <>
                  {intentError && (
                    <div className={styles.formErrorBlock}>
                      <p className={styles.formError}>{intentError}</p>
                      <button
                        type="button"
                        className={styles.inlineRetryButton}
                        onClick={retryCardIntent}
                        disabled={intentLoading}
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {intentLoading && (
                    <p className={styles.loadingText}>Preparing secure checkout...</p>
                  )}

                  {clientSecret && elementsOptions && stripePromise && (
                    <Elements stripe={stripePromise} options={elementsOptions}>
                      <CheckoutForm onPaid={() => setScreen('transfer')} />
                    </Elements>
                  )}

                  <p className={styles.secureNote}>Payments secured by Stripe.</p>
                </>
              )}

              {/* Crypto path */}
              {method === 'crypto' && (
                <CryptoCheckout
                  authHeaders={authHeaders}
                  onPaid={(oid) => {
                    setOrderId(oid);
                    setScreen('transfer');
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Screen 3: Transfer ────────────────────────────────────────── */}
        {screen === 'transfer' && (
          <div className={styles.content}>
            <div className={styles.textContent}>
              <h2 id="membership-checkout-title" className={styles.title}>
                {transferPhase === 'done'
                  ? 'Welcome, member'
                  : transferPhase === 'failed'
                    ? 'Transfer delayed'
                    : 'Blue is sending your membership'}
              </h2>
              <p className={styles.description}>
                {transferPhase === 'done'
                  ? 'Your VIP Membership NFT is now in your wallet.'
                  : transferPhase === 'failed'
                    ? transferError
                    : 'Payment confirmed. Your membership card is moving from Blue to your wallet.'}
              </p>

              <TransferStage phase={transferPhase} userAvatar={userAvatar} />

              <AnimatePresence>
                {transferPhase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={styles.transferActions}
                  >
                    {txHash && (
                      <a
                        className={styles.txLink}
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View transaction
                      </a>
                    )}
                    <button className={styles.ctaButton} onClick={onClose}>
                      <span>Done</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {transferPhase === 'failed' && (
                <div className={styles.transferActions}>
                  <p className={styles.secureNote}>
                    Your payment remains recorded. Do not submit another payment.
                  </p>
                  <button className={styles.ctaButton} onClick={retryDelivery}>
                    <span>Retry delivery</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Dev-only: screen jumper ───────────────────────────────────── */}
        {devMode && (
          <div
            style={{
              position: 'absolute',
              left: 8,
              bottom: 8,
              right: 8,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              padding: '6px 8px',
              borderRadius: 6,
              background: 'rgba(0,0,0,0.78)',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: 10, color: '#9aa', alignSelf: 'center', marginRight: 4 }}>
              dev
            </span>
            {([
              ['Intro', 'intro'],
              ['Duplicate', 'duplicate-warning'],
              ['Purchase', 'purchase'],
              ['Transfer · working', 'transfer'],
              ['Transfer · done', 'transfer:done'],
              ['Transfer · failed', 'transfer:failed'],
            ] as const).map(([label, target]) => (
              <button
                key={target}
                type="button"
                onClick={() => devJump(target)}
                style={{
                  fontSize: 11,
                  padding: '3px 7px',
                  borderRadius: 4,
                  border: '1px solid #444',
                  background: '#1c1c22',
                  color: '#dde',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
    </ModalShell>
  );
};

export default ProMembershipModal;
