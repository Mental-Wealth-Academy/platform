'use client';

/* eslint-disable @next/next/no-img-element */
import SideNavigation from '@/components/side-navigation/SideNavigation';
import { useSound } from '@/hooks/useSound';
import styles from './page.module.css';

export default function ShopPage() {
  const { play } = useSound();

  return (
    <div className={styles.pageLayout}>
      <SideNavigation />
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.productGrid}>
            {[
              { alt: 'Magazine', src: 'https://i.imgur.com/57ahVVX.png', preview: 'https://i.imgur.com/yImR5DJ.png', borderless: false },
              { alt: 'Item 2', src: 'https://i.imgur.com/TPujE2j.png', preview: 'https://i.imgur.com/yUCxnDX.png', borderless: false },
              { alt: 'T-Shirt', src: 'https://i.imgur.com/S3AMvJA.png', preview: 'https://i.imgur.com/fO2vF5f.png', borderless: true },
              { alt: 'Angel Investor', src: '/images/angel-investing.png', preview: '/images/angel-investing.png', borderless: false },
            ].map((item) => (
              <div
                key={item.alt}
                className={`${styles.productItem} ${item.borderless ? styles.productItemBorderless : ''}`}
                onMouseEnter={() => play('hover')}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  className={styles.productImg}
                />
                <img
                  src={item.preview}
                  alt={`${item.alt} preview`}
                  className={styles.productPreview}
                />
                <div className={styles.hoverOverlay}>
                  <button
                    className={styles.buyBtn}
                    onClick={() => play('click')}
                    type="button"
                  >
                    Mint
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
