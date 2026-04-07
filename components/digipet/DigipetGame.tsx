'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import type { ChaoBridge, GameSave, ChaoData, FoodType } from '@/lib/digipet/types';
import { FOODS, clamp, uid, getChaoLevel } from '@/lib/digipet/data';
import { deserializeSave, applyOfflineTime } from '@/lib/digipet/save';
import { initAudio, sfx } from '@/lib/digipet/audio';
import styles from './Digipet.module.css';

interface FloatMsg { id: string; text: string; color: string; }

/** Create a ready-to-go save with one pet (no eggs) */
function newSave(): GameSave {
  return {
    version: 1,
    chao: [{
      id: uid(), name: 'Alien', stats: { swim: 3, fly: 5, run: 4, power: 3, stamina: 4 },
      hp: 100, happiness: 80, age: 0, stage: 'child', type: 'normal',
      color: { r: 93, g: 173, b: 162 }, genes: {
        swimGrowth: 1.0, flyGrowth: 1.2, runGrowth: 1.1, powerGrowth: 0.9, staminaGrowth: 1.0,
        colorR: 93, colorG: 173, colorB: 162, personality: 'curious', sparkle: false,
      },
      personality: 'curious', sparkle: false, x: 0, y: 0,
    }],
    eggs: [],
    inventory: { food: { orange: 3, blue: 2 }, items: {} },
    purchasedColors: [0], gardenItems: [],
    totalPlayTime: 0, lastSaveTime: Date.now(),
    settings: { musicEnabled: true, sfxEnabled: true },
  };
}

function getMood(c: ChaoData) {
  if (c.hp < 20) return { emoji: '\uD83D\uDE35', label: 'Starving' };
  if (c.happiness < 20) return { emoji: '\uD83D\uDE22', label: 'Sad' };
  if (c.hp < 40) return { emoji: '\uD83E\uDD7A', label: 'Hungry' };
  if (c.happiness >= 80 && c.hp >= 80) return { emoji: '\uD83E\uDD29', label: 'Ecstatic' };
  if (c.happiness >= 60) return { emoji: '\uD83D\uDE0A', label: 'Happy' };
  if (c.happiness < 40) return { emoji: '\uD83D\uDE14', label: 'Meh' };
  return { emoji: '\uD83D\uDE42', label: 'Content' };
}

type View = 'home' | 'feed' | 'shop';

export default function DigipetGame() {
  const [loading, setLoading] = useState(true);
  const [save, setSave] = useState<GameSave | null>(null);
  const [shards, setShards] = useState(0);
  const [view, setView] = useState<View>('home');
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<FloatMsg[]>([]);
  const [petBounce, setPetBounce] = useState(false);

  const bridge = useRef<ChaoBridge>(null!);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const audioInited = useRef(false);

  // ── Bridge ──────────────────────────────────────────────
  useEffect(() => {
    bridge.current = {
      getShards: async () => { const r = await fetch('/api/me'); const j = await r.json(); return j.user?.shardCount ?? 0; },
      spendShards: async (amount, reason) => { const r = await fetch('/api/digipet/spend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, reason }) }); const j = await r.json(); if (r.ok && j.ok) { window.dispatchEvent(new Event('shardsUpdated')); return { ok: true, newBalance: j.newBalance }; } return { ok: false, newBalance: 0 }; },
      earnShards: async (amount, reason) => { const r = await fetch('/api/digipet/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, reason }) }); const j = await r.json(); if (r.ok && j.ok) { window.dispatchEvent(new Event('shardsUpdated')); return { ok: true, newBalance: j.newBalance }; } return { ok: false, newBalance: 0 }; },
      saveGame: async (data) => { fetch('/api/digipet/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data }) }).catch(() => {}); },
      loadGame: async () => { const r = await fetch('/api/digipet/load'); if (!r.ok) return null; const j = await r.json(); return j.data ?? null; },
    };
  }, []);

  // ── Load ────────────────────────────────────────────────
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const [sh, raw] = await Promise.all([bridge.current.getShards(), bridge.current.loadGame()]);
        if (dead) return;
        setShards(sh);
        let s: GameSave | null = raw ? deserializeSave(raw) : null;
        if (!s || s.chao.length === 0) s = newSave();
        applyOfflineTime(s);
        setSave(s);
        bridge.current.saveGame(JSON.stringify(s));
      } catch { if (!dead) setSave(newSave()); }
      setLoading(false);
    })();
    return () => { dead = true; };
  }, []);

  // ── Decay + save every 30s ──────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setSave(prev => {
        if (!prev) return prev;
        const next: GameSave = { ...prev, lastSaveTime: Date.now(), chao: prev.chao.map(c => ({ ...c, hp: clamp(c.hp - 0.4, 0, 100), happiness: clamp(c.happiness - 0.15, 0, 100), age: c.age + 1 })) };
        bridge.current.saveGame(JSON.stringify(next));
        return next;
      });
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Shard refresh ───────────────────────────────────────
  useEffect(() => {
    const r = () => { bridge.current.getShards().then(setShards).catch(() => {}); };
    window.addEventListener('shardsUpdated', r);
    const id = setInterval(r, 60000);
    return () => { window.removeEventListener('shardsUpdated', r); clearInterval(id); };
  }, []);

  const ensureAudio = useCallback(() => { if (!audioInited.current) { initAudio(); audioInited.current = true; } }, []);

  const pet = save?.chao[0] ?? null;

  function doSave(s: GameSave) { setSave(s); bridge.current.saveGame(JSON.stringify(s)); }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  function showFloat(text: string, color: string) {
    const id = uid();
    setFloats(prev => [...prev, { id, text, color }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1400);
  }

  // ── Actions ─────────────────────────────────────────────
  function feedPet(foodType: FoodType) {
    ensureAudio();
    if (!save || !pet) return;
    const food = FOODS[foodType];
    const count = save.inventory.food[foodType] || 0;
    if (count <= 0) { sfx('error'); showToast('None left!'); return; }

    const inv = { ...save.inventory.food };
    inv[foodType] = count - 1;
    if (inv[foodType] === 0) delete inv[foodType];

    const p = { ...save.chao[0] };
    const s = { ...p.stats };
    const msgs: string[] = [];
    for (const [k, v] of Object.entries(food.statBoost)) {
      if (v && v > 0) {
        const growth = p.genes[`${k}Growth` as keyof typeof p.genes] as number;
        const boost = Math.round(v * growth);
        s[k as keyof typeof s] += boost;
        msgs.push(`+${boost} ${k}`);
      }
    }
    p.stats = s;
    p.hp = clamp(p.hp + food.hpRestore, 0, 100);
    p.happiness = clamp(p.happiness + food.happinessBoost, 0, 100);
    sfx('feed');
    doSave({ ...save, chao: [p, ...save.chao.slice(1)], inventory: { ...save.inventory, food: inv } });
    if (msgs.length) showFloat(msgs.join('  '), food.color);
    else showFloat(`+${food.hpRestore} HP`, '#66bb6a');
  }

  function playWithPet() {
    ensureAudio();
    if (!save || !pet) return;
    sfx('pet');
    const p = { ...save.chao[0], happiness: clamp(save.chao[0].happiness + 3, 0, 100) };
    doSave({ ...save, chao: [p, ...save.chao.slice(1)] });
    showFloat('+3 Joy', '#a78bfa');
    setPetBounce(true);
    setTimeout(() => setPetBounce(false), 600);
  }

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

  // ── Render ──────────────────────────────────────────────

  if (loading || !save || !pet) {
    return (
      <div className={styles.page}>
        <div className={styles.center}>
          <div className={styles.loader} />
          <p className={styles.loadText}>Waking up your pet...</p>
        </div>
      </div>
    );
  }

  const level = getChaoLevel(pet.stats);
  const mood = getMood(pet);
  const foodEntries = Object.entries(save.inventory.food).filter(([, n]) => n && n > 0);

  // ── Feed View ───────────────────────────────────────────
  if (view === 'feed') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => setView('home')}>&#8592; Back</button>
          <div className={styles.shardBadge}>&#9671; {shards}</div>
        </div>
        <h2 className={styles.viewTitle}>Feed {pet.name}</h2>
        {foodEntries.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No food! Buy some first.</p>
            <button className={styles.actionBtnAlt} onClick={() => setView('shop')}>Open Shop</button>
          </div>
        ) : (
          <div className={styles.itemList}>
            {foodEntries.map(([type, count]) => {
              const food = FOODS[type];
              return food ? (
                <div key={type} className={styles.itemCard}>
                  <div className={styles.itemDot} style={{ background: food.color }} />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{food.name}</span>
                    <span className={styles.itemSub}>x{count}</span>
                  </div>
                  <button className={styles.itemBtn} onClick={() => feedPet(type as FoodType)}>Feed</button>
                </div>
              ) : null;
            })}
          </div>
        )}
        {toast && <div className={styles.toast}>{toast}</div>}
        {floats.map(f => <div key={f.id} className={styles.floatText} style={{ color: f.color }}>{f.text}</div>)}
      </div>
    );
  }

  // ── Shop View ───────────────────────────────────────────
  if (view === 'shop') {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => setView('home')}>&#8592; Back</button>
          <div className={styles.shardBadge}>&#9671; {shards}</div>
        </div>
        <h2 className={styles.viewTitle}>Shop</h2>
        <div className={styles.itemList}>
          {Object.values(FOODS).map(food => (
            <div key={food.type} className={styles.itemCard}>
              <div className={styles.itemDot} style={{ background: food.color }} />
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{food.name}</span>
                <span className={styles.itemSub}>&#9671; {food.price}</span>
              </div>
              <button className={styles.itemBtnBuy} onClick={() => buyFood(food.type)} disabled={shards < food.price}>Buy</button>
            </div>
          ))}
        </div>
        {toast && <div className={styles.toast}>{toast}</div>}
      </div>
    );
  }

  // ── Home View ───────────────────────────────────────────
  return (
    <div className={styles.page} onClick={ensureAudio}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div />
        <div className={styles.shardBadge}>&#9671; {shards} Shards</div>
      </div>

      {/* Pet */}
      <div className={styles.petWrap} onClick={playWithPet}>
        <Image
          src="/digipet/alien_animated.gif"
          alt={pet.name}
          width={220}
          height={220}
          className={`${styles.petImg} ${petBounce ? styles.petTap : ''}`}
          unoptimized
          draggable={false}
          priority
        />
      </div>

      {/* Info */}
      <div className={styles.infoBlock}>
        <span className={styles.petName}>{pet.name}</span>
        <span className={styles.petMeta}>Lv.{level} &middot; {mood.emoji} {mood.label}</span>
      </div>

      {/* Bars */}
      <div className={styles.bars}>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>HP</span>
          <div className={styles.barTrack}><div className={styles.barFillHp} style={{ width: `${pet.hp}%` }} /></div>
          <span className={styles.barVal}>{Math.round(pet.hp)}</span>
        </div>
        <div className={styles.barRow}>
          <span className={styles.barLabel}>Joy</span>
          <div className={styles.barTrack}><div className={styles.barFillJoy} style={{ width: `${pet.happiness}%` }} /></div>
          <span className={styles.barVal}>{Math.round(pet.happiness)}</span>
        </div>
      </div>

      {/* Spacer → thumb zone */}
      <div style={{ flex: 1, minHeight: 16 }} />

      {/* Buttons */}
      <div className={styles.btnRow}>
        <button className={styles.btnFeed} onClick={() => { ensureAudio(); sfx('click'); setView('feed'); }}>
          <span className={styles.btnEmoji}>&#127822;</span> Feed
        </button>
        <button className={styles.btnPlay} onClick={playWithPet}>
          <span className={styles.btnEmoji}>&#128149;</span> Play
        </button>
      </div>
      <button className={styles.btnShop} onClick={() => { ensureAudio(); sfx('click'); setView('shop'); }}>
        &#128722; Shop
      </button>

      {toast && <div className={styles.toast}>{toast}</div>}
      {floats.map(f => <div key={f.id} className={styles.floatText} style={{ color: f.color }}>{f.text}</div>)}
    </div>
  );
}
