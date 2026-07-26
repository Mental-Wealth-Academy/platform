'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import type { ExternalProvider } from '@ethersproject/providers';
import { ShopPageSkeleton } from '@/components/skeleton/Skeleton';
import { ensureBaseChain, type Eip1193Provider } from '@/lib/ensure-base-chain';
import { fetchDiamondBalance } from '@/lib/diamonds-balance';
import { getDiamondPrice } from '@/lib/shop-catalog';
import { useSound } from '@/hooks/useSound';
import { getDiamondsTokenAddress, getRpcUrl, BURN_ADDRESS } from '@/lib/chain-config';
import styles from './page.module.css';

const DIAMONDS_TOKEN_ADDRESS = getDiamondsTokenAddress();
const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

type PayPhase = 'idle' | 'burning' | 'verifying' | 'done';

type BadgeType = 'new' | 'limited' | 'exclusive' | 'free' | 'sold-out';

interface ShopItem {
  id: string;
  title: string;
  sub: string;
  desc: string;
  price: string;
  image: string;
  category: string;
  badge?: BadgeType;
}

const shopItems: ShopItem[] = [
  {
    id: 'orbiters-book',
    title: 'Orbiters of The Horizon',
    sub: 'By Jhinn Bay',
    desc: 'The official publication of the Ethereal Horizon. A spiritual commitment and a loving surrender to the small daily actions of orbiters that compounds into world peace.',
    price: '35 USDC',
    image: '/images/orbits-book-cover.png',
    category: 'Stationery',
    badge: 'new',
  },
  {
    id: 'shirt',
    title: 'The Academy Shirt',
    sub: 'Official MWA Uniform',
    desc: 'Heavyweight cotton tee in midnight navy with the embroidered Academy crest on the chest. Boxy unisex cut, ribbed crew neck, runs true to size.',
    price: '42 USDC',
    image: 'https://i.imgur.com/S3AMvJA.png',
    category: 'Uniforms',
    badge: 'exclusive',
  },
  {
    id: 'journal',
    title: 'Magazine 01',
    sub: 'Leather-bound, grid pages',
    desc: 'A 200-page leather field journal with dot-grid pages, gilded edges, and the Academy sigil debossed on the cover. Includes a ribbon bookmark and pen loop. Built for notes, reflections, and research sketches.',
    price: '45 USDC',
    image: 'https://i.imgur.com/57ahVVX.png',
    category: 'Stationery',
    badge: 'new',
  },
  {
    id: 'hoodie',
    title: 'Cipher Hoodie',
    sub: 'Heavyweight 400gsm',
    desc: 'Oversized heavyweight hoodie in washed obsidian. Features a subtle glitch-pattern inner lining and "MENTAL WEALTH" debossed on the back yoke. Double-layered hood, kangaroo pocket with hidden zip.',
    price: '85 USDC',
    image: 'https://i.imgur.com/TPujE2j.png',
    category: 'Uniforms',
    badge: 'sold-out',
  },
  {
    id: 'pin-set',
    title: 'Scholar Pin Set',
    sub: 'Enamel × Gold, Set of 5',
    desc: 'Five hard enamel pins representing the five disciplines: Cognition, Wealth, Health, Creativity, and Sovereignty. Each features micro-engraved serial numbers. Collect all five to unlock a hidden curriculum quest.',
    price: '28 USDC',
    image: 'https://i.imgur.com/yUCxnDX.png',
    category: 'Accessories',
    badge: 'sold-out',
  },
  {
    id: 'lanyard',
    title: 'Scholar Lanyard',
    sub: 'Woven jacquard, breakaway clip',
    desc: 'Jacquard-woven lanyard with repeating Academy pattern. Breakaway safety clip and detachable badge holder. Required for campus access during intensive cohorts.',
    price: '14 USDC',
    image: '/images/shop/scholar-lanyard.png',
    category: 'Accessories',
  },
  {
    id: 'notebook',
    title: 'Thesis Notebook',
    sub: 'A5, ruled, 120gsm paper',
    desc: 'Premium A5 notebook with ivory 120gsm ruled pages, lay-flat binding, and a cover embossed with the Academy\'s founding equation. For your most important ideas.',
    price: '16 USDC',
    image: '/images/shop/thesis-notebook.png',
    category: 'Stationery',
  },
  {
    id: 'scholar-satchel',
    title: 'Scholar Satchel',
    sub: 'Weatherproof canvas & leather',
    desc: 'Structured messenger bag designed for text volumes, e-slates, and research gear. Features padded tablet compartment and magnetic brass latches.',
    price: '72 USDC',
    image: '/images/shop/scholar-satchel.png',
    category: 'Accessories',
    badge: 'exclusive',
  },
  {
    id: 'fountain-pen',
    title: 'Quantum Brass Fountain Pen',
    sub: 'Precision 0.5mm nib',
    desc: 'Crafted from solid brushed brass with micro-etched discipline sigils. Features a precision nib tuned for rapid lecture notes and daily field note reflections.',
    price: '35 USDC',
    image: '/images/shop/fountain-pen.png',
    category: 'Stationery',
    badge: 'new',
  },
  {
    id: 'scholar-slate',
    title: 'Scholar e-Paper Slate',
    sub: '10.3" glare-free digital notebook',
    desc: 'Paper-like e-ink display with zero lag for notes, textbooks, and guide research. Synchronizes automatically with your Academy curriculum notebook.',
    price: '195 USDC',
    image: '/images/shop/scholar-slate.png',
    category: 'Tech',
    badge: 'limited',
  },
  {
    id: 'study-lamp',
    title: 'Spectral Focus Study Lamp',
    sub: 'Circadian spectrum LED',
    desc: 'Minimalist navy and gold study lamp engineered with circadian spectrum tuning to prevent eye fatigue during late-night research sessions.',
    price: '68 USDC',
    image: '/images/shop/study-lamp.png',
    category: 'Tech',
  },
  {
    id: 'chronos-timer',
    title: 'Chronos Sand Timer',
    sub: '15-minute focus interval',
    desc: 'Hand-blown borosilicate glass filled with fine obsidian sand. Built for timing 15-minute daily field note sessions and deep focus sprints.',
    price: '24 USDC',
    image: '/images/shop/chronos-timer.png',
    category: 'Stationery',
  },
  {
    id: 'desk-mat',
    title: 'Topology Grid Desk Mat',
    sub: '900×400mm micro-weave cloth',
    desc: 'Extra-large desk pad featuring the Academy\'s prerequisite DAG map printed in subtle cyan ink. Water-resistant surface with stitched edges.',
    price: '32 USDC',
    image: '/images/shop/desk-mat.png',
    category: 'Accessories',
  },
  {
    id: 'card-vault',
    title: 'Titanium Card Vault',
    sub: 'RFID-blocking titanium',
    desc: 'Precision CNC-machined titanium card case for your scholar ID and keycards. Features a quick-slide thumb ejector and engraved Academy crest.',
    price: '40 USDC',
    image: '/images/shop/card-vault.png',
    category: 'Tech',
  },
  {
    id: 'commencement-stole',
    title: 'Commencement Stole',
    sub: 'Silk weave with gold embroidery',
    desc: 'Archival navy silk stole worn during term milestones and research presentations. Features gold thread accents representing cohort achievements.',
    price: '48 USDC',
    image: '/images/shop/commencement-stole.png',
    category: 'Uniforms',
    badge: 'exclusive',
  },
  {
    id: 'holographic-beaker',
    title: 'Resonance Crystal Beaker',
    sub: 'Iridescent borosilicate lab flask',
    desc: 'Handcrafted holographic glass flask that shifts color in ambient light. Used in the Academy chemistry & materials science cohorts.',
    price: '38 USDC',
    image: '/images/shop/holographic-beaker.png',
    category: 'Tech',
    badge: 'new',
  },
  {
    id: 'prism-cube',
    title: 'Optical Dispersion Prism',
    sub: 'K9 crystal spectrum cube',
    desc: 'Solid optical glass cube designed for studying refraction and light wave physics. Projects sharp rainbow spectra across your study desk.',
    price: '26 USDC',
    image: '/images/shop/prism-cube.png',
    category: 'Stationery',
  },
  {
    id: 'leather-tool-roll',
    title: 'Field Researcher Tool Roll',
    sub: 'Terracotta full-grain leather',
    desc: 'Rich warm cognac leather roll with slots for fountain pens, calipers, slide rules, and note refills. Hand-stitched with brass button studs.',
    price: '54 USDC',
    image: '/images/shop/leather-tool-roll.png',
    category: 'Accessories',
    badge: 'exclusive',
  },
  {
    id: 'astrolabe',
    title: 'Brass Meridian Planisphere',
    sub: 'Engraved celestial computer',
    desc: 'Intricately laser-etched antique brass planisphere for mapping celestial coordinates, star positions, and navigational math.',
    price: '64 USDC',
    image: '/images/shop/astrolabe.png',
    category: 'Stationery',
  },
  {
    id: 'botanical-press',
    title: 'Scholar Herbarium Press',
    sub: 'Solid oak & brass wingnuts',
    desc: 'Traditional wooden specimen press with heavy absorbent blotter cards for preserving field specimens and botanical observations.',
    price: '34 USDC',
    image: '/images/shop/botanical-press.png',
    category: 'Stationery',
  },
  {
    id: 'sound-bowl',
    title: 'Frequency Resonance Bowl',
    sub: 'Hand-hammered 432Hz brass',
    desc: 'Tuned singing bowl crafted from seven-metal alloy. Used to mark the beginning and end of deep focus research blocks.',
    price: '46 USDC',
    image: '/images/shop/sound-bowl.png',
    category: 'Accessories',
  },
  {
    id: 'mechanical-pencil',
    title: 'Draftsman Mechanical Pencil',
    sub: '0.5mm matte emerald aluminum',
    desc: 'Precision knurled aluminum mechanical pencil in deep forest emerald. Balanced weight distribution for geometric diagrams and technical drafting.',
    price: '28 USDC',
    image: '/images/shop/mechanical-pencil.png',
    category: 'Stationery',
    badge: 'new',
  },
  {
    id: 'varsity-cardigan',
    title: 'Varsity Knit Cardigan',
    sub: 'Cream & burgundy wool blend',
    desc: 'Classic collegiate varsity cardigan in warm ivory with burgundy trim and Chenille Academy crest patch. Heavyweight rib knit.',
    price: '95 USDC',
    image: '/images/shop/varsity-cardigan.png',
    category: 'Uniforms',
    badge: 'exclusive',
  },
  {
    id: 'levitating-globe',
    title: 'Levitating Orbital Globe',
    sub: 'Illuminated electromagnetic sphere',
    desc: 'Self-levitating orbital globe that floats and rotates above a matte slate base. Soft ambient halo lighting for desktop study.',
    price: '110 USDC',
    image: '/images/shop/levitating-globe.png',
    category: 'Tech',
    badge: 'limited',
  },
  {
    id: 'scholar-bottle',
    title: 'Thermo Vacuum Flask',
    sub: 'Matte sage insulated steel',
    desc: 'Double-wall vacuum flask in matte sage green with laser-engraved Academy seal. Keeps drinks icy cold for 24 hours during long library sessions.',
    price: '32 USDC',
    image: '/images/shop/scholar-bottle.png',
    category: 'Accessories',
  },
];

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
  const { authenticated } = usePrivy();
  const { address, isConnected, connector } = useAccount();
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [payItem, setPayItem] = useState<ShopItem | null>(null);
  const [payPhase, setPayPhase] = useState<PayPhase>('idle');
  const [payError, setPayError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!payItem || !address) { setBalance(null); return; }
    let cancelled = false;
    fetchDiamondBalance(address).then((b) => { if (!cancelled) setBalance(b); });
    return () => { cancelled = true; };
  }, [payItem, address]);

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
              onClick={() => { if (isSoldOut) return; play('click'); setSelectedItem(item); }}
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
          <div className={styles.detailOverlay} onClick={() => setSelectedItem(null)}>
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
                <div className={styles.detailActions}>
                  <button
                    className={styles.detailMintButton}
                    onClick={() => selectedItem.badge !== 'sold-out' && play('click')}
                    onMouseEnter={() => selectedItem.badge !== 'sold-out' && play('hover')}
                    disabled={selectedItem.badge === 'sold-out'}
                  >
                    {selectedItem.badge === 'sold-out' ? 'Sold Out' : 'Mint Now'}
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
              onClick={() => setSelectedItem(null)}
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
