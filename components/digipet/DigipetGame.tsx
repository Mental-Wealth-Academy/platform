'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ChaoBridge, GameSave, ChaoData, FoodType, ChaoType, ChaoStage,
} from '@/lib/digipet/types';
import {
  FOODS, EVO_THRESHOLD_1, EVO_THRESHOLD_2,
  clamp, uid, getChaoLevel, getDominantType,
} from '@/lib/digipet/data';
import { getDefaultSave, deserializeSave, applyOfflineTime, hatchEgg } from '@/lib/digipet/save';
import { initAudio, sfx } from '@/lib/digipet/audio';
import styles from './Digipet.module.css';

type View = 'garden' | 'feed' | 'shop';

interface FloatMsg { id: string; text: string; color: string; }

export default function DigipetGame() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<GameSave | null>(null);
  const [shards, setShards] = useState(0);
  const [view, setView] = useState<View>('garden');
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<FloatMsg[]>([]);
  const [eggTaps, setEggTaps] = useState(0);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const bridge = useRef<ChaoBridge>(null!);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const audioInited = useRef(false);

  // ── Bridge setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    bridge.current = {
      getShards: async () => {
        const r = await fetch('/api/me');
        const j = await r.json();
        return j.user?.shardCount ?? 0;
      },
      spendShards: async (amount: number, reason: string) => {
        const r = await fetch('/api/digipet/spend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, reason }),
        });
        const j = await r.json();
        if (r.ok && j.ok) {
          window.dispatchEvent(new Event('shardsUpdated'));
          return { ok: true, newBalance: j.newBalance as number };
        }
        return { ok: false, newBalance: 0 };
      },
      earnShards: async (amount: number, reason: string) => {
        const r = await fetch('/api/digipet/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, reason }),
        });
        const j = await r.json();
        if (r.ok && j.ok) {
          window.dispatchEvent(new Event('shardsUpdated'));
          return { ok: true, newBalance: j.newBalance as number };
        }
        return { ok: false, newBalance: 0 };
      },
      saveGame: async (data: string) => {
        fetch('/api/digipet/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
        }).catch(() => {});
      },
      loadGame: async () => {
        const r = await fetch('/api/digipet/load');
        if (!r.ok) return null;
        const j = await r.json();
        return j.data ?? null;
      },
    };
  }, []);

  // ── Load save ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sh, raw] = await Promise.all([
          bridge.current.getShards(),
          bridge.current.loadGame(),
        ]);
        if (cancelled) return;
        setShards(sh);
        let s: GameSave;
        if (raw) {
          const parsed = deserializeSave(raw);
          s = parsed || getDefaultSave();
        } else {
          s = getDefaultSave();
        }
        applyOfflineTime(s);
        setSave(s);
        setLoading(false);
      } catch (e) {
        console.error('Digipet load error:', e);
        if (!cancelled) setError('Failed to load your pet data.');
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Hunger / happiness decay + auto-save ───────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setSave(prev => {
        if (!prev) return prev;
        const next: GameSave = {
          ...prev,
          lastSaveTime: Date.now(),
          chao: prev.chao.map(c => ({
            ...c,
            hp: clamp(c.hp - 0.4, 0, 100),
            happiness: clamp(c.happiness - 0.15, 0, 100),
            age: c.age + 1,
          })),
        };
        bridge.current.saveGame(JSON.stringify(next));
        return next;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Refresh shards periodically ────────────────────────────────────────────
  useEffect(() => {
    const refresh = () => { bridge.current.getShards().then(s => setShards(s)).catch(() => {}); };
    window.addEventListener('shardsUpdated', refresh);
    const id = setInterval(refresh, 60000);
    return () => { window.removeEventListener('shardsUpdated', refresh); clearInterval(id); };
  }, []);

  // ── Audio on first interaction ─────────────────────────────────────────────
  const ensureAudio = useCallback(() => {
    if (!audioInited.current) { initAudio(); audioInited.current = true; }
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const pet: ChaoData | null = save?.chao[0] ?? null;

  function doSave(s: GameSave) {
    setSave(s);
    bridge.current.saveGame(JSON.stringify(s));
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const showFloat = useCallback((text: string, color: string) => {
    const id = uid();
    setFloats(prev => [...prev, { id, text, color }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1400);
  }, []);

  function getMood(c: ChaoData): { emoji: string; label: string } {
    if (c.hp < 20) return { emoji: '\uD83D\uDE35', label: 'Starving' };
    if (c.happiness < 20) return { emoji: '\uD83D\uDE22', label: 'Sad' };
    if (c.hp < 40) return { emoji: '\uD83E\uDD7A', label: 'Hungry' };
    if (c.happiness >= 80 && c.hp >= 80) return { emoji: '\uD83E\uDD29', label: 'Ecstatic' };
    if (c.happiness >= 60) return { emoji: '\uD83D\uDE0A', label: 'Happy' };
    if (c.happiness < 40) return { emoji: '\uD83D\uDE14', label: 'Meh' };
    return { emoji: '\uD83D\uDE42', label: 'Content' };
  }

  // ── Evolution check ────────────────────────────────────────────────────────
  function checkEvolution(p: ChaoData): ChaoData | null {
    const mx = Math.max(p.stats.swim, p.stats.fly, p.stats.run, p.stats.power, p.stats.stamina);
    if (p.stage === 'child' && mx >= EVO_THRESHOLD_1) {
      return { ...p, stage: 'evolved1' as ChaoStage, type: getDominantType(p.stats) as ChaoType };
    }
    if (p.stage === 'evolved1' && mx >= EVO_THRESHOLD_2) {
      return { ...p, stage: 'evolved2' as ChaoStage, type: getDominantType(p.stats) as ChaoType };
    }
    return null;
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
  function feedPet(foodType: FoodType) {
    ensureAudio();
    if (!save || !pet) return;
    const food = FOODS[foodType];
    if (!food) return;
    const count = save.inventory.food[foodType] || 0;
    if (count <= 0) { sfx('error'); showToast('None left!'); return; }

    const inv = { ...save.inventory.food };
    inv[foodType] = count - 1;
    if (inv[foodType] === 0) delete inv[foodType];

    const chao = [...save.chao];
    const p = { ...chao[0] };
    const s = { ...p.stats };
    const boostMsgs: string[] = [];
    for (const [k, v] of Object.entries(food.statBoost)) {
      const key = k as keyof typeof s;
      if (v && v > 0) {
        const growth = p.genes[`${key}Growth` as keyof typeof p.genes] as number;
        const boost = Math.round(v * growth);
        s[key] += boost;
        boostMsgs.push(`+${boost} ${key}`);
      }
    }
    p.stats = s;
    p.hp = clamp(p.hp + food.hpRestore, 0, 100);
    p.happiness = clamp(p.happiness + food.happinessBoost, 0, 100);
    chao[0] = p;

    const evolved = checkEvolution(p);
    if (evolved) {
      chao[0] = evolved;
      sfx('evolve');
      showToast(`${evolved.name} evolved to ${evolved.stage}!`);
    } else {
      sfx('feed');
    }

    const next = { ...save, chao, inventory: { ...save.inventory, food: inv } };
    doSave(next);
    if (boostMsgs.length > 0) showFloat(boostMsgs.join('  '), food.color);
    else showFloat(`+${food.hpRestore} HP`, '#66bb6a');
  }

  // ── Play (pet interaction) ─────────────────────────────────────────────────
  function playWithPet() {
    ensureAudio();
    if (!save || !pet) return;
    sfx('pet');
    const chao = [...save.chao];
    const p = { ...chao[0] };
    p.happiness = clamp(p.happiness + 3, 0, 100);
    chao[0] = p;
    doSave({ ...save, chao });
    showFloat('+3 Joy', '#a78bfa');
  }

  // ── Egg hatching ───────────────────────────────────────────────────────────
  function tapEgg() {
    ensureAudio();
    if (!save || save.eggs.length === 0) return;

    const eggs = [...save.eggs];
    const egg = { ...eggs[0] };
    egg.hatchProgress = clamp(egg.hatchProgress + 2 + Math.random() * 3, 0, 100);
    eggs[0] = egg;
    setEggTaps(t => t + 1);

    if (egg.hatchProgress < 50) { sfx('tap'); }
    else if (egg.hatchProgress < 100) { sfx('egg_crack'); }

    if (egg.hatchProgress >= 100) {
      const name = window.prompt('Name your new pet!', 'Bubbles');
      if (!name) { eggs[0] = { ...eggs[0], hatchProgress: 95 }; doSave({ ...save, eggs }); return; }
      const nextSave = { ...save, eggs };
      const newChao = hatchEgg(nextSave, egg.id, name.trim() || 'Bubbles');
      if (newChao) {
        sfx('hatch');
        showToast(`${newChao.name} hatched!`);
      }
      doSave(nextSave);
      setEggTaps(0);
    } else {
      doSave({ ...save, eggs });
    }
  }

  // ── Buy food ───────────────────────────────────────────────────────────────
  async function buyFood(type: FoodType) {
    ensureAudio();
    const food = FOODS[type];
    if (!food || !save) return;
    const result = await bridge.current.spendShards(food.price, `Buy ${food.name}`);
    if (!result.ok) { sfx('error'); showToast('Not enough shards!'); return; }
    sfx('buy');
    setShards(result.newBalance);
    const inv = { ...save.inventory.food };
    inv[type] = (inv[type] || 0) + 1;
    doSave({ ...save, inventory: { ...save.inventory, food: inv } });
    showToast(`Bought ${food.name}`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !save) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.loader} />
          <p className={styles.loadingText}>Loading your pet...</p>
        </div>
      </div>
    );
  }

  const hasPet = save.chao.length > 0;
  const hasEggs = save.eggs.length > 0;
  const petLevel = pet ? getChaoLevel(pet.stats) : 0;
  const mood = pet ? getMood(pet) : null;
  const foodEntries = Object.entries(save.inventory.food).filter(([, n]) => n && n > 0);

  // ── Egg View ───────────────────────────────────────────────────────────────
  if (!hasPet && hasEggs) {
    const egg = save.eggs[0];
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <div />
          <div className={styles.shardBadge}>{'\u25C7'} {shards}</div>
        </div>
        <div className={styles.eggContainer}>
          <h2 className={styles.eggTitle}>Your egg is waiting...</h2>
          <p className={styles.eggSubtitle}>Tap to hatch!</p>
          <button className={styles.eggButton} onClick={tapEgg} type="button">
            <span className={styles.eggEmoji}>{'\uD83E\uDD5A'}</span>
          </button>
          <div className={styles.progressOuter}>
            <div
              className={styles.progressInner}
              style={{ width: `${Math.round(egg.hatchProgress)}%` }}
            />
          </div>
          <span className={styles.progressLabel}>{Math.round(egg.hatchProgress)}%</span>
          {eggTaps > 0 && <p className={styles.eggTapCount}>Taps: {eggTaps}</p>}
        </div>
        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    );
  }

  // ── No pet, no eggs (rare) ─────────────────────────────────────────────────
  if (!hasPet && !hasEggs) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <p className={styles.errorText}>No pet found. Try refreshing.</p>
        </div>
      </div>
    );
  }

  // ── Feed sheet ─────────────────────────────────────────────────────────────
  if (view === 'feed') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => setView('garden')} type="button">
            {'\u2190'} Back
          </button>
          <div className={styles.shardBadge}>{'\u25C7'} {shards}</div>
        </div>
        <div className={styles.sheetContent}>
          <h2 className={styles.sheetTitle}>Feed {pet!.name}</h2>
          {foodEntries.length === 0 ? (
            <div className={styles.emptyFood}>
              <p className={styles.emptyFoodText}>No food in your bag!</p>
              <button className={styles.shopBtnLarge} onClick={() => setView('shop')} type="button">
                {'\uD83D\uDED2'} Get Food
              </button>
            </div>
          ) : (
            <div className={styles.foodGrid}>
              {foodEntries.map(([type, count]) => {
                const food = FOODS[type];
                if (!food) return null;
                return (
                  <div key={type} className={styles.foodCard}>
                    <div className={styles.foodDot} style={{ background: food.color }} />
                    <div className={styles.foodInfo}>
                      <span className={styles.foodName}>{food.name}</span>
                      <span className={styles.foodCount}>x{count}</span>
                    </div>
                    <button
                      className={styles.foodFeedBtn}
                      onClick={() => feedPet(type as FoodType)}
                      type="button"
                    >
                      Feed
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {toast && <div className={styles.toast}>{toast}</div>}
        {floats.map(f => (
          <div key={f.id} className={styles.floatText} style={{ color: f.color }}>{f.text}</div>
        ))}
      </div>
    );
  }

  // ── Shop view ──────────────────────────────────────────────────────────────
  if (view === 'shop') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => setView('garden')} type="button">
            {'\u2190'} Back
          </button>
          <div className={styles.shardBadge}>{'\u25C7'} {shards}</div>
        </div>
        <div className={styles.sheetContent}>
          <h2 className={styles.sheetTitle}>Shop</h2>
          <div className={styles.foodGrid}>
            {Object.values(FOODS).map(food => (
              <div key={food.type} className={styles.foodCard}>
                <div className={styles.foodDot} style={{ background: food.color }} />
                <div className={styles.foodInfo}>
                  <span className={styles.foodName}>{food.name}</span>
                  <span className={styles.foodPrice}>{'\u25C7'} {food.price}</span>
                </div>
                <button
                  className={styles.foodBuyBtn}
                  onClick={() => buyFood(food.type)}
                  type="button"
                >
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>
        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    );
  }

  // ── Garden (main view) ─────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Decorative blobs */}
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />

      {/* Top bar */}
      <div className={styles.topBar}>
        <div />
        <div className={styles.shardBadge}>{'\u25C7'} {shards} Shards</div>
      </div>

      {/* Pet area */}
      <div className={styles.petSection}>
        <div id="pet-area" className={styles.petArea} onClick={playWithPet}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/digipet/alien_animated.gif"
            alt={pet!.name}
            className={styles.petSprite}
            draggable={false}
          />
        </div>
      </div>

      {/* Name + mood */}
      <div className={styles.nameRow}>
        <span className={styles.petName}>{pet!.name}</span>
        <span className={styles.petLevel}>{'\u2605'} Lv.{petLevel}</span>
      </div>
      <div className={styles.moodRow}>
        <span className={styles.moodEmoji}>{mood!.emoji}</span>
        <span className={styles.moodLabel}>{mood!.label}</span>
      </div>

      {/* Status bars */}
      <div className={styles.barsWrap}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>HP</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles.barHp}`}
              style={{ width: `${Math.round(pet!.hp)}%` }}
            />
          </div>
          <span className={styles.barValue}>{Math.round(pet!.hp)}</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>Joy</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles.barJoy}`}
              style={{ width: `${Math.round(pet!.happiness)}%` }}
            />
          </div>
          <span className={styles.barValue}>{Math.round(pet!.happiness)}</span>
        </div>
      </div>

      {/* Spacer pushes actions into thumb zone */}
      <div className={styles.actionsSpacer} />

      {/* Action buttons */}
      <div className={styles.actionsRow}>
        <button className={styles.btnFeed} onClick={() => { ensureAudio(); sfx('click'); setView('feed'); }} type="button">
          <span className={styles.btnIcon}>{'\uD83C\uDF4E'}</span>
          <span className={styles.btnText}>Feed</span>
        </button>
        <button className={styles.btnPlay} onClick={playWithPet} type="button">
          <span className={styles.btnIcon}>{'\uD83D\uDC95'}</span>
          <span className={styles.btnText}>Play</span>
        </button>
      </div>

      {/* Shop button */}
      <div className={styles.shopRow}>
        <button className={styles.btnShop} onClick={() => { ensureAudio(); sfx('click'); setView('shop'); }} type="button">
          {'\uD83D\uDED2'} Shop
        </button>
      </div>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Float text */}
      {floats.map(f => (
        <div key={f.id} className={styles.floatText} style={{ color: f.color }}>{f.text}</div>
      ))}
    </div>
  );
}
