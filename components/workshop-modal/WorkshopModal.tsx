'use client';

import { useState, useEffect } from 'react';
import styles from './WorkshopModal.module.css';

interface Workshop {
  id: string;
  title: string;
  description: string;
  date: string;
  host: string;
}

interface Seat {
  index: number;
  occupant: string | null;
}

interface WorkshopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WORKSHOPS: Workshop[] = [
  {
    id: 'creative-recovery',
    title: 'Creative Recovery',
    description: 'A guided session on unblocking creative energy through journaling and breathwork.',
    date: 'Every Monday, 6 PM',
    host: 'Jhinova Bay',
  },
  {
    id: 'onchain-basics',
    title: 'On-Chain Basics',
    description: 'Learn how wallets, tokens, and governance work — no technical background needed.',
    date: 'Every Wednesday, 7 PM',
    host: 'MWA Team',
  },
  {
    id: 'mental-wealth-circle',
    title: 'Mental Wealth Circle',
    description: 'A peer-led wellness check-in and discussion on building healthy habits.',
    date: 'Every Friday, 5 PM',
    host: 'Community Led',
  },
];

const TOTAL_SEATS = 20;

export default function WorkshopModal({ isOpen, onClose }: WorkshopModalProps) {
  const [activeWorkshop, setActiveWorkshop] = useState(0);
  const [seats, setSeats] = useState<Record<string, Seat[]>>({});
  const [registering, setRegistering] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Initialize seats for each workshop
    const initial: Record<string, Seat[]> = {};
    WORKSHOPS.forEach((w) => {
      initial[w.id] = Array.from({ length: TOTAL_SEATS }, (_, i) => ({
        index: i,
        occupant: null,
      }));
    });
    setSeats(initial);

    // Fetch wallet
    fetch('/api/me', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.walletAddress) setWalletAddress(data.user.walletAddress);
      })
      .catch(() => {});

    // Fetch existing registrations
    WORKSHOPS.forEach((w) => {
      fetch(`/api/workshop/seats?workshopId=${w.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.seats) {
            setSeats((prev) => ({ ...prev, [w.id]: data.seats }));
          }
        })
        .catch(() => {});
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const workshop = WORKSHOPS[activeWorkshop];
  const currentSeats = seats[workshop.id] || [];
  const filledCount = currentSeats.filter((s) => s.occupant).length;
  const userSeat = currentSeats.findIndex(
    (s) => s.occupant && walletAddress && s.occupant.toLowerCase() === walletAddress.toLowerCase()
  );

  const handleSeatClick = async (seatIndex: number) => {
    const seat = currentSeats[seatIndex];
    if (seat.occupant) return; // Already taken
    if (userSeat >= 0) return; // User already registered

    setRegistering(seatIndex);
    try {
      const res = await fetch('/api/workshop/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workshopId: workshop.id, seatIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.seats) {
          setSeats((prev) => ({ ...prev, [workshop.id]: data.seats }));
        } else {
          // Optimistic update
          setSeats((prev) => ({
            ...prev,
            [workshop.id]: prev[workshop.id].map((s, i) =>
              i === seatIndex ? { ...s, occupant: walletAddress || 'you' } : s
            ),
          }));
        }
      }
    } catch {
      // silent fail
    } finally {
      setRegistering(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 className={styles.modalTitle}>Workshops</h2>
        <p className={styles.modalSub}>Choose a session and claim your seat</p>

        {/* Workshop Tabs */}
        <div className={styles.tabs}>
          {WORKSHOPS.map((w, i) => (
            <button
              key={w.id}
              className={`${styles.tab} ${activeWorkshop === i ? styles.tabActive : ''}`}
              onClick={() => setActiveWorkshop(i)}
            >
              {w.title}
            </button>
          ))}
        </div>

        {/* Workshop Info */}
        <div className={styles.workshopInfo}>
          <h3 className={styles.workshopTitle}>{workshop.title}</h3>
          <p className={styles.workshopDesc}>{workshop.description}</p>
          <div className={styles.workshopMeta}>
            <span>{workshop.date}</span>
            <span className={styles.metaDot} />
            <span>Host: {workshop.host}</span>
          </div>
        </div>

        {/* Seat Counter */}
        <div className={styles.seatCounter}>
          <span className={styles.seatCountLabel}>
            {filledCount}/{TOTAL_SEATS} seats filled
          </span>
          <div className={styles.seatBar}>
            <div
              className={styles.seatBarFill}
              style={{ width: `${(filledCount / TOTAL_SEATS) * 100}%` }}
            />
          </div>
        </div>

        {/* Classroom Grid */}
        <div className={styles.classroom}>
          {/* Teacher area */}
          <div className={styles.teacherArea}>
            <div className={styles.teacherDesk} />
            <span className={styles.teacherLabel}>HOST</span>
          </div>

          {/* Seats */}
          <div className={styles.seatGrid}>
            {currentSeats.map((seat, i) => {
              const isMine = i === userSeat;
              const isTaken = !!seat.occupant;
              const isRegistering = registering === i;

              return (
                <button
                  key={i}
                  className={`${styles.seat} ${isTaken ? styles.seatTaken : styles.seatOpen} ${isMine ? styles.seatMine : ''} ${isRegistering ? styles.seatRegistering : ''}`}
                  onClick={() => handleSeatClick(i)}
                  disabled={isTaken || userSeat >= 0 || isRegistering}
                  title={
                    isMine
                      ? 'Your seat'
                      : isTaken
                        ? 'Taken'
                        : userSeat >= 0
                          ? 'Already registered'
                          : 'Click to register'
                  }
                >
                  <span className={styles.seatIcon}>
                    {isMine ? 'You' : isTaken ? '' : i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendOpen}`} />
            <span>Open</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendTaken}`} />
            <span>Taken</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendMine}`} />
            <span>Your Seat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
