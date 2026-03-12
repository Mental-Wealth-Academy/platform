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
              { alt: 'JC-10 Black', src: 'https://yeezy.com/cdn-cgi/image/width=1024,height=1024,quality=100,compression=fast,slow-connection-quality=80,fit=pad,gravity=center,background=transparent,format=avif/https://cdn.swell.store/yzy-prod/694d83925095a200120c13c0/a15e70f2904c7fdb11f10bbe48f3f5b1/JC-10-BLACK-1.png', preview: 'https://yeezy.com/cdn-cgi/image/width=1024,height=1024,quality=100,compression=fast,slow-connection-quality=80,fit=pad,gravity=center,background=transparent,format=avif/https://cdn.swell.store/yzy-prod/694d83925095a200120c13c0/a15e70f2904c7fdb11f10bbe48f3f5b1/JC-10-BLACK-1.png', borderless: true },
              { alt: 'JC-10 Black 2', src: 'https://yeezy.com/cdn-cgi/image/width=1024,height=1024,quality=100,compression=fast,slow-connection-quality=80,fit=pad,gravity=center,background=transparent,format=avif/https://cdn.swell.store/yzy-prod/694d83925095a200120c13c0/a15e70f2904c7fdb11f10bbe48f3f5b1/JC-10-BLACK-1.png', preview: 'https://yeezy.com/cdn-cgi/image/width=1024,height=1024,quality=100,compression=fast,slow-connection-quality=80,fit=pad,gravity=center,background=transparent,format=avif/https://cdn.swell.store/yzy-prod/694d83925095a200120c13c0/a15e70f2904c7fdb11f10bbe48f3f5b1/JC-10-BLACK-1.png', borderless: true },
              { alt: 'HD-01 Black', src: 'https://yeezy.com/cdn-cgi/image/width=1024,height=1024,quality=100,compression=fast,slow-connection-quality=80,fit=pad,gravity=center,background=transparent,format=avif/https://cdn.swell.store/yzy-prod/6949ed1f80c01300127beab9/b64116f133b7f192bb91b291e8dd14c7/HD-01-B-1.png', preview: 'https://yeezy.com/cdn-cgi/image/width=1024,height=1024,quality=100,compression=fast,slow-connection-quality=80,fit=pad,gravity=center,background=transparent,format=avif/https://cdn.swell.store/yzy-prod/6949ed1f80c01300127beab9/b64116f133b7f192bb91b291e8dd14c7/HD-01-B-1.png', borderless: true },
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
