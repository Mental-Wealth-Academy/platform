'use client';

import React, { useState, useEffect } from 'react';
import styles from './RecentlyFunded.module.css';

interface FundedItem {
  id: string;
  name: string;
  amount: string;
  timestamp: string;
  avatar?: string;
}

export default function RecentlyFunded() {
  const [items, setItems] = useState<FundedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunded = async () => {
      try {
        const res = await fetch('/api/treasury/recently-funded', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items?.slice(0, 3) || []);
        }
      } catch (error) {
        console.error('Failed to fetch recently funded items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunded();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Recently Funded</h3>
        <div className={styles.items}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${styles.item} ${styles.skeleton}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Recently Funded</h3>
      <div className={styles.items}>
        {items.map(item => (
          <div key={item.id} className={styles.item}>
            {item.avatar && (
              <div className={styles.avatar} style={{ backgroundImage: `url(${item.avatar})` }} />
            )}
            <div className={styles.content}>
              <div className={styles.name}>{item.name}</div>
              <div className={styles.amount}>{item.amount}</div>
            </div>
            <div className={styles.time}>{item.timestamp}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
