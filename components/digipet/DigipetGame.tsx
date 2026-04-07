'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import type { ChaoBridge, GameSave, ChaoData, FoodType } from '@/lib/digipet/types';
import { FOODS, clamp, uid, getChaoLevel } from '@/lib/digipet/data';
import { deserializeSave, applyOfflineTime } from '@/lib/digipet/save';
import { initAudio, sfx } from '@/lib/digipet/audio';
import styles from './Digipet.module.css';

function freshSave(): GameSave {
  return {
    version: 1,
    chao: [{
      id: uid(), name: 'Zaniah', stats: { swim: 3, fly: 5, run: 4, power: 3, stamina: 4 },
      hp: 100, happiness: 80, age: 0, stage: 'child', type: 'normal',
      color: { r: 200, g: 190, b: 220 },
      genes: { swimGrowth: 1, flyGrowth: 1.2, runGrowth: 1.1, powerGrowth: 0.9, staminaGrowth: 1, colorR: 200, colorG: 190, colorB: 220, personality: 'curious', sparkle: false },
      personality: 'curious', sparkle: false, x: 0, y: 0,
    }],
    eggs: [],
    inventory: { food: { orange: 3, blue: 2, pink: 1 }, items: {} },
    purchasedColors: [0], gardenItems: [],
    totalPlayTime: 0, lastSaveTime: Date.now(),
    settings: { musicEnabled: true, sfxEnabled: true },
  };
}

function mood(c: ChaoData) {
  if (c.hp < 20) return 'Starving';
  if (c.happiness < 20) return 'Sad';
  if (c.hp < 40) return 'Hungry';
  if (c.happiness >= 80 && c.hp >= 80) return 'Ecstatic';
  if (c.happiness >= 60) return 'Happy';
  return 'Content';
}

export default function DigipetGame() {
  const [save, setSave] = useState<GameSave | null>(null);
  const [shards, setShards] = useState(0);
  const [feedOpen, setFeedOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [tapAnim, setTapAnim] = useState(false);
  const bridge = useRef<ChaoBridge>(null!);
  const toastT = useRef<ReturnType<typeof setTimeout>>();
  const audioOk = useRef(false);

  useEffect(() => {
    bridge.current = {
      getShards: async () => { try { const r = await fetch('/api/me'); const j = await r.json(); return j.user?.shardCount ?? 0; } catch { return 0; } },
      spendShards: async (a, r) => { try { const res = await fetch('/api/digipet/spend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: a, reason: r }) }); const j = await res.json(); if (res.ok && j.ok) { window.dispatchEvent(new Event('shardsUpdated')); return { ok: true, newBalance: j.newBalance }; } } catch {} return { ok: false, newBalance: 0 }; },
      earnShards: async (a, r) => { try { const res = await fetch('/api/digipet/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: a, reason: r }) }); const j = await res.json(); if (res.ok && j.ok) { window.dispatchEvent(new Event('shardsUpdated')); return { ok: true, newBalance: j.newBalance }; } } catch {} return { ok: false, newBalance: 0 }; },
      saveGame: async (d) => { fetch('/api/digipet/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) }).catch(() => {}); },
      loadGame: async () => { try { const r = await fetch('/api/digipet/load'); if (!r.ok) return null; const j = await r.json(); return j.data ?? null; } catch { return null; } },
    };
    (async () => {
      const [sh, raw] = await Promise.all([bridge.current.getShards(), bridge.current.loadGame()]);
      setShards(sh);
      let s = raw ? deserializeSave(raw) : null;
      if (!s || !s.chao.length) s = freshSave();
      applyOfflineTime(s);
      setSave(s);
      bridge.current.saveGame(JSON.stringify(s));
    })();
  }, []);

  // Decay + save
  useEffect(() => {
    const id = setInterval(() => setSave(p => {
      if (!p) return p;
      const n: GameSave = { ...p, lastSaveTime: Date.now(), chao: p.chao.map(c => ({ ...c, hp: clamp(c.hp - 0.4, 0, 100), happiness: clamp(c.happiness - 0.15, 0, 100), age: c.age + 1 })) };
      bridge.current.saveGame(JSON.stringify(n));
      return n;
    }), 30000);
    return () => clearInterval(id);
  }, []);

  // Shard sync
  useEffect(() => {
    const r = () => bridge.current.getShards().then(setShards).catch(() => {});
    window.addEventListener('shardsUpdated', r);
    const id = setInterval(r, 60000);
    return () => { window.removeEventListener('shardsUpdated', r); clearInterval(id); };
  }, []);

  const audio = useCallback(() => { if (!audioOk.current) { initAudio(); audioOk.current = true; } }, []);
  const pet = save?.chao[0] ?? null;
  const doSave = (s: GameSave) => { setSave(s); bridge.current.saveGame(JSON.stringify(s)); };
  const notify = (m: string) => { setToast(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2200); };

  function feed(ft: FoodType) {
    audio();
    if (!save || !pet) return;
    const food = FOODS[ft];
    const cnt = save.inventory.food[ft] || 0;
    if (cnt <= 0) { sfx('error'); notify('None left!'); return; }
    const inv = { ...save.inventory.food }; inv[ft] = cnt - 1; if (!inv[ft]) delete inv[ft];
    const p = { ...pet, hp: clamp(pet.hp + food.hpRestore, 0, 100), happiness: clamp(pet.happiness + food.happinessBoost, 0, 100) };
    const s = { ...p.stats };
    for (const [k, v] of Object.entries(food.statBoost)) {
      if (v) { const g = p.genes[`${k}Growth` as keyof typeof p.genes] as number; s[k as keyof typeof s] += Math.round(v * g); }
    }
    p.stats = s;
    sfx('feed');
    doSave({ ...save, chao: [p, ...save.chao.slice(1)], inventory: { ...save.inventory, food: inv } });
    notify(`Fed ${food.name}!`);
    setFeedOpen(false);
  }

  function play() {
    audio(); if (!save || !pet) return;
    sfx('pet');
    doSave({ ...save, chao: [{ ...pet, happiness: clamp(pet.happiness + 5, 0, 100) }, ...save.chao.slice(1)] });
    setTapAnim(true); setTimeout(() => setTapAnim(false), 500);
  }

  // ── Render ──────────────────────
  if (!save || !pet) return <div className={styles.page}><div className={styles.loadWrap}><div className={styles.spinner} /></div></div>;

  const lv = getChaoLevel(pet.stats);
  const m = mood(pet);
  const foods = Object.entries(save.inventory.food).filter(([, n]) => n && n > 0);

  return (
    <div className={styles.page} onClick={audio}>
      {/* Shard count - subtle top right */}
      <div className={styles.shardPill}>{shards} shards</div>

      {/* Pet */}
      <div className={styles.petWrap} onClick={play}>
        <Image src="/digipet/pet.gif" alt={pet.name} width={280} height={280}
          className={`${styles.pet} ${tapAnim ? styles.petTap : ''}`} unoptimized draggable={false} priority />
      </div>

      {/* Name + status */}
      <div className={styles.info}>
        <h1 className={styles.name}>{pet.name}</h1>
        <p className={styles.sub}>Lv.{lv} &middot; {m}</p>
      </div>

      {/* HP / Joy bars */}
      <div className={styles.bars}>
        <div className={styles.bar}>
          <span className={styles.barLbl}>HP</span>
          <div className={styles.barTrack}><div className={styles.barHp} style={{ width: `${pet.hp}%` }} /></div>
        </div>
        <div className={styles.bar}>
          <span className={styles.barLbl}>Joy</span>
          <div className={styles.barTrack}><div className={styles.barJoy} style={{ width: `${pet.happiness}%` }} /></div>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Two buttons */}
      <div className={styles.actions}>
        <button className={styles.btn} onClick={(e) => { e.stopPropagation(); audio(); sfx('click'); setFeedOpen(!feedOpen); }}>
          Feed
        </button>
        <button className={styles.btn} onClick={(e) => { e.stopPropagation(); play(); }}>
          Play
        </button>
      </div>

      {/* Feed drawer */}
      {feedOpen && (
        <div className={styles.drawer}>
          <div className={styles.drawerHandle} />
          {foods.length === 0 ? (
            <p className={styles.drawerEmpty}>No food yet. Earn shards from daily quests!</p>
          ) : (
            <div className={styles.foodList}>
              {foods.map(([t, c]) => {
                const f = FOODS[t]; if (!f) return null;
                return (
                  <button key={t} className={styles.foodItem} onClick={() => feed(t as FoodType)}>
                    <span className={styles.foodDot} style={{ background: f.color }} />
                    <span className={styles.foodLabel}>{f.name}</span>
                    <span className={styles.foodCount}>x{c}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
