'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ChaoBridge, GameSave, ChaoData, EggData, FoodType, ItemType,
  ChaoType, ChaoStage, ChaoStats, ChaoColor, RaceConfig,
} from '@/lib/digipet/types';
import {
  FOODS, ITEMS, RACES, COLORS,
  EVO_THRESHOLD_1, EVO_THRESHOLD_2, MAX_CHAO,
  clamp, uid, getChaoLevel, getDominantType, breedGenes,
} from '@/lib/digipet/data';
import { getDefaultSave, deserializeSave, applyOfflineTime, hatchEgg } from '@/lib/digipet/save';
import { renderPet, renderEgg } from '@/lib/digipet/pet-renderer';
import { initAudio, sfx } from '@/lib/digipet/audio';
import styles from './Digipet.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'garden' | 'feed' | 'stats' | 'shop' | 'games' | 'bounce' | 'catch' | 'race' | 'breed';
type ShopTab = 'food' | 'items' | 'colors';
type RacePhase = 'list' | 'running' | 'result';

interface FloatMsg { id: string; text: string; color: string; x: number; y: number; }

// ─── Stat colors ─────────────────────────────────────────────────────────────

const STAT_COLORS: Record<string, string> = {
  swim: '#3498db', fly: '#f1c40f', run: '#2ecc71', power: '#e74c3c', stamina: '#9b59b6',
};
const HP_COLOR = '#2ecc71';
const JOY_COLOR = '#f1c40f';

// ─── Component ───────────────────────────────────────────────────────────────

export default function DigipetGame() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<GameSave | null>(null);
  const [shards, setShards] = useState(0);
  const [view, setView] = useState<View>('garden');
  const [selectedPetIdx, setSelectedPetIdx] = useState(0);
  const [shopTab, setShopTab] = useState<ShopTab>('food');
  const [toast, setToast] = useState<string | null>(null);
  const [floats, setFloats] = useState<FloatMsg[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [eggTaps, setEggTaps] = useState(0);
  const [racePhase, setRacePhase] = useState<RacePhase>('list');
  const [activeRace, setActiveRace] = useState<RaceConfig | null>(null);
  const [racePlayer, setRacePlayer] = useState(0);
  const [raceCPU, setRaceCPU] = useState(0);
  const [raceWon, setRaceWon] = useState(false);
  const [raceSeg, setRaceSeg] = useState(0);
  const [breedSel, setBreedSel] = useState<[number, number]>([-1, -1]);
  const [heartsVisible, setHeartsVisible] = useState(false);
  const [minigameScore, setMinigameScore] = useState(0);
  const [minigameOver, setMinigameOver] = useState(false);
  const [minigameReward, setMinigameReward] = useState(0);

  // Refs
  const bridge = useRef<ChaoBridge>(null!);
  const petCanvasRef = useRef<HTMLCanvasElement>(null);
  const eggCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const animRef = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const minigameCanvasRef = useRef<HTMLCanvasElement>(null);
  const minigameLoopRef = useRef(0);
  const minigameStateRef = useRef<any>(null);
  const raceTimerRef = useRef<ReturnType<typeof setInterval>>();
  const breedCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const audioInited = useRef(false);

  // ─── Bridge setup ──────────────────────────────────────────────────────────

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

  // ─── Init: load save ──────────────────────────────────────────────────────

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

  // ─── Init audio on first tap ──────────────────────────────────────────────

  const ensureAudio = useCallback(() => {
    if (!audioInited.current) {
      initAudio();
      audioInited.current = true;
    }
  }, []);

  // ─── Pet animation loop ───────────────────────────────────────────────────

  useEffect(() => {
    if (!save) return;
    let last = 0;
    const animate = (ts: number) => {
      if (ts - last > 500) {
        last = ts;
        frameRef.current = frameRef.current === 0 ? 1 : 0;
        const pet = save.chao[selectedPetIdx];
        if (petCanvasRef.current && pet) {
          renderPet(petCanvasRef.current, pet.color, pet.stage, pet.type, frameRef.current, 4);
        }
        const egg = save.eggs[0];
        if (eggCanvasRef.current && egg && save.chao.length === 0) {
          renderEgg(eggCanvasRef.current, egg.color, egg.hatchProgress, 5);
        }
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [save, selectedPetIdx]);

  // ─── Decay + auto-save every 30s ─────────────────────────────────────────

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

  // ─── Refresh shards periodically ─────────────────────────────────────────

  useEffect(() => {
    const refresh = () => { bridge.current.getShards().then(s => setShards(s)).catch(() => {}); };
    window.addEventListener('shardsUpdated', refresh);
    const id = setInterval(refresh, 60000);
    return () => { window.removeEventListener('shardsUpdated', refresh); clearInterval(id); };
  }, []);

  // ─── Toast helper ─────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  // ─── Floating text helper ─────────────────────────────────────────────────

  const showFloat = useCallback((text: string, color: string) => {
    const id = uid();
    setFloats(prev => [...prev, { id, text, color, x: 50, y: 35 }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 1300);
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const selectedPet: ChaoData | null = save?.chao[selectedPetIdx] ?? null;

  function doSave(s: GameSave) {
    setSave(s);
    bridge.current.saveGame(JSON.stringify(s));
  }

  // ─── Evolution check ──────────────────────────────────────────────────────

  function checkEvolution(pet: ChaoData): ChaoData | null {
    const mx = Math.max(pet.stats.swim, pet.stats.fly, pet.stats.run, pet.stats.power, pet.stats.stamina);
    if (pet.stage === 'child' && mx >= EVO_THRESHOLD_1) {
      return { ...pet, stage: 'evolved1' as ChaoStage, type: getDominantType(pet.stats) as ChaoType };
    }
    if (pet.stage === 'evolved1' && mx >= EVO_THRESHOLD_2) {
      return { ...pet, stage: 'evolved2' as ChaoStage, type: getDominantType(pet.stats) as ChaoType };
    }
    return null;
  }

  // ─── Feed ─────────────────────────────────────────────────────────────────

  function feedPet(foodType: FoodType) {
    ensureAudio();
    if (!save) return;
    const food = FOODS[foodType];
    if (!food) return;
    const count = save.inventory.food[foodType] || 0;
    if (count <= 0) { sfx('error'); showToast('None left!'); return; }

    const inv = { ...save.inventory.food };
    inv[foodType] = count - 1;
    if (inv[foodType] === 0) delete inv[foodType];

    const chao = [...save.chao];
    const pet = { ...chao[selectedPetIdx] };
    const g = pet.genes;
    const s = { ...pet.stats };

    const boostMsgs: string[] = [];
    const applyBoost = (stat: keyof ChaoStats, growth: number) => {
      const base = food.statBoost[stat];
      if (base) {
        const gain = Math.round(base * growth * 10) / 10;
        s[stat] = clamp(s[stat] + gain, 0, 99);
        const label = String(stat);
        boostMsgs.push(`+${gain.toFixed(1)} ${label.charAt(0).toUpperCase() + label.slice(1)}`);
      }
    };
    applyBoost('swim', g.swimGrowth);
    applyBoost('fly', g.flyGrowth);
    applyBoost('run', g.runGrowth);
    applyBoost('power', g.powerGrowth);
    applyBoost('stamina', g.staminaGrowth);

    pet.stats = s;
    pet.hp = clamp(pet.hp + food.hpRestore, 0, 100);
    pet.happiness = clamp(pet.happiness + food.happinessBoost, 0, 100);
    chao[selectedPetIdx] = pet;

    const evolved = checkEvolution(pet);
    if (evolved) {
      chao[selectedPetIdx] = evolved;
      sfx('evolve');
      showToast(`${evolved.name} evolved to ${evolved.stage}!`);
    } else {
      sfx('feed');
    }

    const next = { ...save, chao, inventory: { ...save.inventory, food: inv } };
    doSave(next);

    if (boostMsgs.length > 0) showFloat(boostMsgs.join('  '), food.color);
    else showFloat(`+${food.hpRestore} HP`, HP_COLOR);
  }

  // ─── Pet interaction ──────────────────────────────────────────────────────

  function petPet() {
    ensureAudio();
    if (!save || !selectedPet) return;
    sfx('pet');
    const chao = [...save.chao];
    const pet = { ...chao[selectedPetIdx] };
    pet.happiness = clamp(pet.happiness + 3, 0, 100);
    chao[selectedPetIdx] = pet;
    doSave({ ...save, chao });
    showFloat('+3 Joy', JOY_COLOR);
  }

  // ─── Egg hatching ─────────────────────────────────────────────────────────

  function tapEgg() {
    ensureAudio();
    if (!save || save.eggs.length === 0) return;

    const eggs = [...save.eggs];
    const egg = { ...eggs[0] };
    egg.hatchProgress = clamp(egg.hatchProgress + 5, 0, 100);
    eggs[0] = egg;
    setEggTaps(prev => prev + 1);

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
        setSelectedPetIdx(nextSave.chao.length - 1);
      }
      doSave(nextSave);
      setEggTaps(0);
    } else {
      doSave({ ...save, eggs });
    }
  }

  // ─── Shop buying ──────────────────────────────────────────────────────────

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

  async function buyItem(type: ItemType) {
    ensureAudio();
    const item = ITEMS[type];
    if (!item || !save) return;
    const result = await bridge.current.spendShards(item.price, `Buy ${item.name}`);
    if (!result.ok) { sfx('error'); showToast('Not enough shards!'); return; }
    sfx('buy');
    setShards(result.newBalance);
    const inv = { ...save.inventory.items };
    inv[type] = (inv[type] || 0) + 1;
    if (selectedPet) {
      const chao = [...save.chao];
      const pet = { ...chao[selectedPetIdx] };
      pet.happiness = clamp(pet.happiness + item.happinessBoost, 0, 100);
      chao[selectedPetIdx] = pet;
      doSave({ ...save, chao, inventory: { ...save.inventory, items: inv } });
    } else {
      doSave({ ...save, inventory: { ...save.inventory, items: inv } });
    }
    showToast(`Bought ${item.name}`);
  }

  async function buyColor(idx: number) {
    ensureAudio();
    const c = COLORS[idx];
    if (!c || !save) return;
    if (save.purchasedColors.includes(idx)) {
      if (!selectedPet) return;
      const chao = [...save.chao];
      const pet = { ...chao[selectedPetIdx] };
      pet.color = { r: c.r, g: c.g, b: c.b };
      chao[selectedPetIdx] = pet;
      doSave({ ...save, chao });
      sfx('happy');
      showToast(`Applied ${c.name}`);
      return;
    }
    const result = await bridge.current.spendShards(c.price, `Buy color ${c.name}`);
    if (!result.ok) { sfx('error'); showToast('Not enough shards!'); return; }
    sfx('buy');
    setShards(result.newBalance);
    const purchasedColors = [...save.purchasedColors, idx];
    doSave({ ...save, purchasedColors });
    showToast(`Unlocked ${c.name}`);
  }

  // ─── Race ─────────────────────────────────────────────────────────────────

  function startRace(race: RaceConfig) {
    ensureAudio();
    if (!selectedPet) return;
    const lvl = getChaoLevel(selectedPet.stats);
    if (lvl < race.requiredLevel) { sfx('error'); showToast(`Need level ${race.requiredLevel}!`); return; }
    sfx('click');
    setActiveRace(race);
    setRacePhase('running');
    setRacePlayer(0);
    setRaceCPU(0);
    setRaceSeg(0);

    let playerProg = 0;
    let cpuProg = 0;
    let seg = 0;
    const totalSegs = race.terrain.length;

    if (raceTimerRef.current) clearInterval(raceTimerRef.current);
    raceTimerRef.current = setInterval(() => {
      seg = Math.min(Math.floor(playerProg / (100 / totalSegs)), totalSegs - 1);
      const terrain = race.terrain[seg];
      const stat = selectedPet.stats[terrain] || 1;
      const speed = 0.8 + (stat / 99) * 2.2;
      const cpuSpeed = 0.8 + race.difficulty * 0.25;

      playerProg = Math.min(playerProg + speed, 100);
      cpuProg = Math.min(cpuProg + cpuSpeed + (Math.random() - 0.4) * 0.5, 100);

      setRacePlayer(playerProg);
      setRaceCPU(cpuProg);
      setRaceSeg(seg);

      if (playerProg >= 100 || cpuProg >= 100) {
        clearInterval(raceTimerRef.current!);
        const won = playerProg >= cpuProg;
        setRaceWon(won);
        setRacePhase('result');
        if (won) {
          sfx('win');
          bridge.current.earnShards(race.coinReward, `Won ${race.name}`).then(r => {
            if (r.ok) setShards(r.newBalance);
          });
        } else {
          sfx('sad');
        }
      }
    }, 200);
  }

  // ─── Breed ────────────────────────────────────────────────────────────────

  const evolvedPets = save ? save.chao.filter(c => c.stage === 'evolved1' || c.stage === 'evolved2') : [];

  function toggleBreedSelect(chaoIdx: number) {
    ensureAudio();
    sfx('tap');
    setBreedSel(prev => {
      if (prev[0] === chaoIdx) return [-1, prev[1]];
      if (prev[1] === chaoIdx) return [prev[0], -1];
      if (prev[0] === -1) return [chaoIdx, prev[1]];
      if (prev[1] === -1) return [prev[0], chaoIdx];
      return [chaoIdx, prev[1]];
    });
  }

  function doBreed() {
    ensureAudio();
    if (!save) return;
    const [a, b] = breedSel;
    if (a < 0 || b < 0 || a === b) return;
    const p1 = save.chao[a];
    const p2 = save.chao[b];
    if (!p1 || !p2) return;
    if (save.chao.length + save.eggs.length >= MAX_CHAO) {
      sfx('error'); showToast('Garden is full!'); return;
    }

    sfx('breed');
    const genes = breedGenes(p1.genes, p2.genes);
    const egg: EggData = {
      id: uid(), genes,
      color: { r: genes.colorR, g: genes.colorG, b: genes.colorB },
      hatchProgress: 0, x: 240, y: 180,
    };
    const next = { ...save, eggs: [...save.eggs, egg] };
    doSave(next);
    setHeartsVisible(true);
    setTimeout(() => setHeartsVisible(false), 2500);
    showToast('An egg appeared!');
    setBreedSel([-1, -1]);
  }

  // ─── Bounce Game ──────────────────────────────────────────────────────────

  function startBounce() {
    ensureAudio();
    setView('bounce');
    setMinigameOver(false);
    setMinigameScore(0);
    setMinigameReward(0);

    requestAnimationFrame(() => {
      const canvas = minigameCanvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width;
      const H = canvas.height;

      const petColor = selectedPet ? `rgb(${selectedPet.color.r},${selectedPet.color.g},${selectedPet.color.b})` : '#5dade2';

      const state = {
        x: W / 2, y: H - 100, vy: -8, vx: 0,
        coins: [] as { x: number; y: number; collected: boolean }[],
        platforms: [] as { x: number; y: number; w: number }[],
        spikes: [] as { x: number; y: number }[],
        scrollY: 0, score: 0, gameOver: false, dir: 0,
        highestY: H - 100,
      };
      minigameStateRef.current = state;

      for (let i = 0; i < 20; i++) {
        const px = Math.random() * (W - 80) + 10;
        const py = H - 80 - i * 55;
        state.platforms.push({ x: px, y: py, w: 60 + Math.random() * 30 });
        if (Math.random() < 0.4) state.coins.push({ x: px + 30, y: py - 25, collected: false });
        if (i > 8 && Math.random() < 0.15) state.spikes.push({ x: Math.random() * (W - 20), y: py + 10 });
      }

      const handleTouch = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        if (touch) {
          state.dir = touch.clientX < W / 2 ? -1 : 1;
        }
      };
      const handleTouchEnd = () => { state.dir = 0; };
      canvas.addEventListener('touchstart', handleTouch, { passive: false });
      canvas.addEventListener('touchmove', handleTouch, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('mousedown', (e) => { state.dir = e.offsetX < W / 2 ? -1 : 1; });
      canvas.addEventListener('mouseup', () => { state.dir = 0; });

      let lastT = 0;
      const loop = (ts: number) => {
        if (state.gameOver) return;
        const dt = lastT ? Math.min((ts - lastT) / 1000, 0.05) : 0.016;
        lastT = ts;

        state.vx = state.dir * 200;
        state.vy += 600 * dt;
        state.x += state.vx * dt;
        state.y += state.vy * dt;

        if (state.x < -10) state.x = W + 10;
        if (state.x > W + 10) state.x = -10;

        if (state.vy > 0) {
          for (const p of state.platforms) {
            const py = p.y - state.scrollY;
            if (state.y >= py - 12 && state.y <= py + 6 && state.x > p.x - 10 && state.x < p.x + p.w + 10) {
              state.vy = -350 - Math.min(state.score * 0.3, 100);
              state.y = py - 12;
              sfx('bounce');
              break;
            }
          }
        }

        const screenY = state.y - state.scrollY;
        if (screenY < H * 0.4) {
          state.scrollY = state.y - H * 0.4;
        }

        if (state.y < state.highestY) {
          state.score += Math.floor((state.highestY - state.y) / 10);
          state.highestY = state.y;
          setMinigameScore(state.score);
        }

        for (const c of state.coins) {
          if (c.collected) continue;
          const cy = c.y - state.scrollY;
          if (Math.abs(state.x - c.x) < 18 && Math.abs((state.y - state.scrollY) - cy) < 18) {
            c.collected = true;
            state.score += 10;
            setMinigameScore(state.score);
            sfx('coin');
          }
        }

        for (const sp of state.spikes) {
          const sy = sp.y - state.scrollY;
          if (Math.abs(state.x - sp.x) < 14 && Math.abs((state.y - state.scrollY) - sy) < 14) {
            state.gameOver = true;
          }
        }

        if (state.y - state.scrollY > H + 40) {
          state.gameOver = true;
        }

        const topPlatY = Math.min(...state.platforms.map(p => p.y));
        if (topPlatY > state.scrollY - H) {
          for (let i = 0; i < 5; i++) {
            const ny = topPlatY - 55 - i * 55;
            const nx = Math.random() * (W - 80) + 10;
            state.platforms.push({ x: nx, y: ny, w: 60 + Math.random() * 30 });
            if (Math.random() < 0.4) state.coins.push({ x: nx + 30, y: ny - 25, collected: false });
            if (Math.random() < 0.18) state.spikes.push({ x: Math.random() * (W - 20), y: ny + 10 });
          }
        }

        state.platforms = state.platforms.filter(p => p.y - state.scrollY < H + 200);
        state.coins = state.coins.filter(c => c.y - state.scrollY < H + 200);
        state.spikes = state.spikes.filter(s => s.y - state.scrollY < H + 200);

        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, W, H);

        for (const p of state.platforms) {
          const py = p.y - state.scrollY;
          ctx.fillStyle = '#1b3a5c';
          ctx.fillRect(p.x, py, p.w, 8);
          ctx.fillStyle = '#254a6e';
          ctx.fillRect(p.x + 2, py, p.w - 4, 4);
        }

        for (const c of state.coins) {
          if (c.collected) continue;
          const cy = c.y - state.scrollY;
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(c.x, cy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffec8b';
          ctx.beginPath();
          ctx.arc(c.x - 2, cy - 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const sp of state.spikes) {
          const sy = sp.y - state.scrollY;
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.moveTo(sp.x - 8, sy + 8);
          ctx.lineTo(sp.x, sy - 8);
          ctx.lineTo(sp.x + 8, sy + 8);
          ctx.fill();
        }

        const drawY = state.y - state.scrollY;
        ctx.fillStyle = petColor;
        ctx.beginPath();
        ctx.arc(state.x, drawY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(state.x - 5, drawY - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(state.x + 5, drawY - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(state.x - 4, drawY - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(state.x + 6, drawY - 2, 2, 0, Math.PI * 2); ctx.fill();

        if (state.gameOver) {
          endMinigame(state.score);
          return;
        }

        minigameLoopRef.current = requestAnimationFrame(loop);
      };

      minigameLoopRef.current = requestAnimationFrame(loop);
    });
  }

  // ─── Catch Game ───────────────────────────────────────────────────────────

  function startCatch() {
    ensureAudio();
    setView('catch');
    setMinigameOver(false);
    setMinigameScore(0);
    setMinigameReward(0);

    requestAnimationFrame(() => {
      const canvas = minigameCanvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      const ctx = canvas.getContext('2d')!;
      const W = canvas.width;
      const H = canvas.height;

      const petColor = selectedPet ? `rgb(${selectedPet.color.r},${selectedPet.color.g},${selectedPet.color.b})` : '#5dade2';

      const state = {
        catcherX: W / 2, score: 0, lives: 3, gameOver: false, spawnTimer: 0,
        items: [] as { x: number; y: number; vy: number; type: 'coin' | 'bomb' }[],
      };
      minigameStateRef.current = state;

      const handleMove = (clientX: number) => { state.catcherX = clamp(clientX, 24, W - 24); };
      canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (e.touches[0]) handleMove(e.touches[0].clientX); }, { passive: false });
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (e.touches[0]) handleMove(e.touches[0].clientX); }, { passive: false });
      canvas.addEventListener('mousemove', (e) => { handleMove(e.offsetX); });

      let lastT = 0;
      const loop = (ts: number) => {
        if (state.gameOver) return;
        const dt = lastT ? Math.min((ts - lastT) / 1000, 0.05) : 0.016;
        lastT = ts;

        state.spawnTimer += dt;
        const spawnRate = Math.max(0.4, 1.2 - state.score * 0.008);
        if (state.spawnTimer > spawnRate) {
          state.spawnTimer = 0;
          const isBomb = Math.random() < Math.min(0.15 + state.score * 0.003, 0.4);
          state.items.push({
            x: 20 + Math.random() * (W - 40),
            y: -10,
            vy: 120 + Math.min(state.score * 2, 200),
            type: isBomb ? 'bomb' : 'coin',
          });
        }

        for (const item of state.items) {
          item.y += item.vy * dt;
        }

        const catcherY = H - 40;
        for (let i = state.items.length - 1; i >= 0; i--) {
          const item = state.items[i];
          if (item.y > catcherY - 12 && item.y < catcherY + 20 && Math.abs(item.x - state.catcherX) < 28) {
            if (item.type === 'coin') {
              state.score += 1;
              setMinigameScore(state.score);
              sfx('coin');
            } else {
              state.lives -= 1;
              sfx('error');
              if (state.lives <= 0) { state.gameOver = true; }
            }
            state.items.splice(i, 1);
            continue;
          }
          if (item.y > H + 20) {
            state.items.splice(i, 1);
          }
        }

        ctx.fillStyle = '#0d1b2a';
        ctx.fillRect(0, 0, W, H);

        for (const item of state.items) {
          if (item.type === 'coin') {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(item.x, item.y, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffec8b';
            ctx.beginPath(); ctx.arc(item.x - 2, item.y - 2, 4, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.arc(item.x, item.y, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(item.x - 3, item.y - 6, 6, 3);
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(item.x, item.y - 10); ctx.lineTo(item.x + 4, item.y - 15); ctx.stroke();
          }
        }

        ctx.fillStyle = '#1b3a5c';
        ctx.fillRect(state.catcherX - 28, catcherY + 8, 56, 6);
        ctx.fillStyle = petColor;
        ctx.beginPath(); ctx.arc(state.catcherX, catcherY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(state.catcherX - 5, catcherY - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(state.catcherX + 5, catcherY - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.arc(state.catcherX - 4, catcherY - 2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(state.catcherX + 6, catcherY - 2, 2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#e74c3c';
        ctx.font = '16px monospace';
        for (let i = 0; i < state.lives; i++) {
          ctx.fillText('\u2665', W - 30 - i * 22, 28);
        }

        if (state.gameOver) {
          endMinigame(state.score);
          return;
        }

        minigameLoopRef.current = requestAnimationFrame(loop);
      };

      minigameLoopRef.current = requestAnimationFrame(loop);
    });
  }

  // ─── End minigame ─────────────────────────────────────────────────────────

  function endMinigame(score: number) {
    const reward = Math.max(1, Math.floor(score / 10));
    setMinigameReward(reward);
    setMinigameOver(true);
    bridge.current.earnShards(reward, `Minigame: ${view}`).then(r => {
      if (r.ok) setShards(r.newBalance);
    });
    if (save && selectedPet) {
      const chao = [...save.chao];
      const pet = { ...chao[selectedPetIdx] };
      const statKeys: (keyof ChaoStats)[] = ['swim', 'fly', 'run', 'power', 'stamina'];
      const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
      const gain = Math.min(Math.floor(score / 15) + 1, 5);
      pet.stats = { ...pet.stats, [randomStat]: clamp(pet.stats[randomStat] + gain, 0, 99) };
      chao[selectedPetIdx] = pet;
      doSave({ ...save, chao });
    }
  }

  function exitMinigame() {
    cancelAnimationFrame(minigameLoopRef.current);
    minigameStateRef.current = null;
    setView('garden');
    setMinigameOver(false);
  }

  // ─── View nav helper ──────────────────────────────────────────────────────

  function goView(v: View) {
    ensureAudio();
    sfx('click');
    if (raceTimerRef.current) clearInterval(raceTimerRef.current);
    setView(v);
    if (v === 'race') { setRacePhase('list'); setActiveRace(null); }
    if (v === 'breed') { setBreedSel([-1, -1]); }
    setFeedOpen(false);
  }

  // ─── Render breed canvas helper ───────────────────────────────────────────

  function breedCanvasRefCb(chaoId: string) {
    return (el: HTMLCanvasElement | null) => {
      if (el) breedCanvasRefs.current.set(chaoId, el);
    };
  }

  useEffect(() => {
    if (view !== 'breed' || !save) return;
    for (const pet of save.chao) {
      const c = breedCanvasRefs.current.get(pet.id);
      if (c) renderPet(c, pet.color, pet.stage, pet.type, 0, 2);
    }
  }, [view, save, breedSel]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>{error}</div>
      </div>
    );
  }

  if (loading || !save) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading Digipet...</span>
        </div>
      </div>
    );
  }

  const hasPets = save.chao.length > 0;
  const hasEggs = save.eggs.length > 0;
  const pet = selectedPet;
  const petLevel = pet ? getChaoLevel(pet.stats) : 0;
  const canBreed = evolvedPets.length >= 2;

  // ─── Minigame views ──────────────────────────────────────────────────────

  if (view === 'bounce' || view === 'catch') {
    return (
      <div className={styles.wrapper}>
        <div className={`${styles.container} ${styles.noScroll}`}>
          <div className={styles.minigameWrap}>
            <div className={styles.minigameHeader}>
              <button className={styles.minigameBackBtn} onClick={exitMinigame}>&larr;</button>
              <span className={styles.minigameTitle}>{view === 'bounce' ? 'Pet Bounce' : 'Pet Catch'}</span>
              <span className={styles.minigameScore}>{minigameScore}</span>
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <canvas ref={minigameCanvasRef} className={styles.minigameCanvas} />
              {minigameOver && (
                <div className={styles.minigameOver}>
                  <div className={styles.minigameOverTitle}>Game Over!</div>
                  <div className={styles.minigameOverScore}>Score: {minigameScore}</div>
                  <div className={styles.minigameOverReward}>+{minigameReward} Shards earned</div>
                  <button className={styles.minigamePlayBtn} onClick={() => {
                    if (view === 'bounce') startBounce(); else startCatch();
                  }}>Play Again</button>
                  <button className={styles.minigamePlayBtn} style={{ background: 'transparent', color: '#5dade2', border: '1px solid #5dade2' }} onClick={exitMinigame}>Back</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main layout ──────────────────────────────────────────────────────────

  return (
    <div className={styles.wrapper} onClick={ensureAudio}>
      <div className={styles.container}>
        {/* Header bar: Back + Shards */}
        <div className={styles.topBar}>
          <button className={styles.headerBackBtn} onClick={() => router.push('/home')}>
            &larr;
          </button>
          <div className={styles.shardBadge}>
            <span className={styles.shardIcon}>{'\u25C7'}</span>
            <span>{shards}</span>
          </div>
        </div>

        {/* ─── Garden View ─────────────────────────────────────────── */}
        {view === 'garden' && (
          <>
            <div className={styles.gardenArea}>
              {hasPets && pet ? (
                <>
                  {/* Pet stage with green garden background */}
                  <div className={styles.gardenBg}>
                    <div className={styles.petStage}>
                      {save.chao.length > 1 && (
                        <button
                          className={`${styles.petNav} ${styles.petNavLeft}`}
                          onClick={() => { sfx('tap'); setSelectedPetIdx(i => (i - 1 + save.chao.length) % save.chao.length); }}
                        >&larr;</button>
                      )}
                      <div className={styles.petCanvasWrap} onClick={petPet}>
                        <canvas ref={petCanvasRef} width={128} height={160} />
                      </div>
                      {save.chao.length > 1 && (
                        <button
                          className={`${styles.petNav} ${styles.petNavRight}`}
                          onClick={() => { sfx('tap'); setSelectedPetIdx(i => (i + 1) % save.chao.length); }}
                        >&rarr;</button>
                      )}
                    </div>
                  </div>

                  {/* Pet info */}
                  <div className={styles.petInfo}>
                    <p className={styles.petName}>
                      {pet.name}
                      {pet.sparkle && <span className={styles.sparkleBadge}>{'\u2726'}</span>}
                    </p>
                    <p className={styles.petLevel}>
                      {'\u2605'} Lv.{petLevel}
                      <span className={styles.petMeta}>
                        &nbsp;&middot; {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
                      </span>
                    </p>
                  </div>

                  {/* Status bars */}
                  <div className={styles.statusBars}>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>HP</span>
                      <div className={styles.statusBarOuter}>
                        <div className={styles.statusBarInner} style={{ width: `${pet.hp}%`, background: `linear-gradient(90deg, ${HP_COLOR}, #58d68d)` }} />
                      </div>
                      <span className={styles.statusValue}>{Math.round(pet.hp)}</span>
                    </div>
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>Joy</span>
                      <div className={styles.statusBarOuter}>
                        <div className={styles.statusBarInner} style={{ width: `${pet.happiness}%`, background: `linear-gradient(90deg, ${JOY_COLOR}, #f9e584)` }} />
                      </div>
                      <span className={styles.statusValue}>{Math.round(pet.happiness)}</span>
                    </div>
                  </div>

                  {/* Pet action buttons */}
                  <div className={styles.petActions}>
                    <button className={styles.actionBtn} onClick={() => { sfx('click'); setFeedOpen(true); }}>
                      <span className={styles.actionBtnIcon}>{'\uD83C\uDF4E'}</span>
                      <span className={styles.actionBtnLabel}>Feed</span>
                    </button>
                    <button className={styles.actionBtn} onClick={petPet}>
                      <span className={styles.actionBtnIcon}>{'\uD83D\uDC95'}</span>
                      <span className={styles.actionBtnLabel}>Pet</span>
                    </button>
                    <button className={styles.actionBtn} onClick={() => goView('stats')}>
                      <span className={styles.actionBtnIcon}>{'\uD83D\uDCCA'}</span>
                      <span className={styles.actionBtnLabel}>Stats</span>
                    </button>
                    {canBreed && (
                      <button className={styles.actionBtn} onClick={() => goView('breed')}>
                        <span className={styles.actionBtnIcon}>{'\u2764\uFE0F'}</span>
                        <span className={styles.actionBtnLabel}>Breed</span>
                      </button>
                    )}
                  </div>

                  {/* Egg notice */}
                  {hasEggs && (
                    <div className={styles.eggNotice}>
                      {save.eggs.length} egg{save.eggs.length > 1 ? 's' : ''} waiting to hatch!
                    </div>
                  )}
                </>
              ) : hasEggs ? (
                /* ─── Egg view for new users ─── */
                <div className={styles.eggArea}>
                  <div className={styles.gardenBg}>
                    <div className={styles.eggCanvasWrap} onClick={tapEgg}>
                      <canvas
                        ref={eggCanvasRef}
                        width={100}
                        height={120}
                      />
                    </div>
                  </div>
                  <p className={styles.eggTapHint}>Tap the egg to hatch!</p>
                  <div className={styles.hatchBarWrap}>
                    <div className={styles.statusBarOuter}>
                      <div className={styles.statusBarInner} style={{ width: `${save.eggs[0].hatchProgress}%`, background: 'linear-gradient(90deg, #5dade2, #85c1e9)' }} />
                    </div>
                    <span className={styles.hatchPercent}>{Math.round(save.eggs[0].hatchProgress)}%</span>
                  </div>
                  {eggTaps > 0 && (
                    <p className={styles.eggProgress}>
                      Taps: {eggTaps}
                    </p>
                  )}
                </div>
              ) : (
                /* ─── No pets, no eggs (should be rare) ─── */
                <div className={styles.emptyState}>
                  <p className={styles.emptyStateTitle}>No pets yet</p>
                  <p className={styles.emptyStateMsg}>Visit the shop to get started!</p>
                  <button className={styles.emptyShopBtn} onClick={() => goView('shop')}>
                    Open Shop
                  </button>
                </div>
              )}
            </div>

            {/* ─── Bottom navigation bar (always visible) ─── */}
            <div className={styles.bottomNav}>
              <button className={styles.bottomNavBtn} onClick={() => goView('shop')}>
                <span className={styles.bottomNavIcon}>{'\uD83D\uDED2'}</span>
                <span className={styles.bottomNavLabel}>Shop</span>
              </button>
              <button className={styles.bottomNavBtn} onClick={() => goView('games')}>
                <span className={styles.bottomNavIcon}>{'\uD83C\uDFAE'}</span>
                <span className={styles.bottomNavLabel}>Games</span>
              </button>
              <button className={styles.bottomNavBtn} onClick={() => goView('race')}>
                <span className={styles.bottomNavIcon}>{'\uD83C\uDFC1'}</span>
                <span className={styles.bottomNavLabel}>Race</span>
              </button>
            </div>
          </>
        )}

        {/* ─── Feed Bottom Sheet ─────────────────────────────────── */}
        {feedOpen && (
          <>
            <div className={styles.sheetBackdrop} onClick={() => setFeedOpen(false)} />
            <div className={styles.bottomSheet}>
              <div className={styles.sheetHandle} />
              <div className={styles.sheetHeader}>
                <span className={styles.sheetTitle}>Feed</span>
                <button className={styles.sheetClose} onClick={() => setFeedOpen(false)}>&times;</button>
              </div>
              <div className={styles.sheetBody}>
                {Object.entries(save.inventory.food).filter(([, c]) => c && c > 0).length === 0 ? (
                  <div className={styles.emptyFeedMsg}>
                    <p className={styles.emptyMsg}>No food!</p>
                    <button className={styles.emptyShopBtn} onClick={() => { setFeedOpen(false); goView('shop'); }}>
                      Visit Shop
                    </button>
                  </div>
                ) : (
                  Object.entries(save.inventory.food).filter(([, c]) => c && c > 0).map(([type, count]) => {
                    const food = FOODS[type];
                    if (!food) return null;
                    return (
                      <div key={type} className={styles.foodCard}>
                        <div className={styles.foodSwatch} style={{ background: food.color }} />
                        <div className={styles.foodInfo}>
                          <span className={styles.foodName}>{food.name}</span>
                          <span className={styles.foodCount}>x{count}</span>
                        </div>
                        <button className={styles.foodFeedBtn} onClick={() => feedPet(type as FoodType)}>Feed</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* ─── Stats Overlay ─────────────────────────────────────── */}
        {view === 'stats' && pet && (
          <div className={styles.overlay}>
            <div className={styles.overlayHeader}>
              <span className={styles.overlayTitle}>Stats</span>
              <button className={styles.overlayClose} onClick={() => goView('garden')}>&times;</button>
            </div>
            <div className={styles.overlayBody}>
              <div className={styles.statSection}>
                <div className={styles.statSectionTitle}>Identity</div>
                <div className={styles.statMeta}><span>Name</span><span>{pet.name}</span></div>
                <div className={styles.statMeta}><span>Level</span><span>{petLevel}</span></div>
                <div className={styles.statMeta}><span>Stage</span><span>{pet.stage}</span></div>
                <div className={styles.statMeta}><span>Type</span><span>{pet.type}</span></div>
                <div className={styles.statMeta}><span>Personality</span><span>{pet.personality}</span></div>
                <div className={styles.statMeta}><span>Age</span><span>{Math.floor(pet.age)}</span></div>
                {pet.sparkle && <div className={styles.statMeta}><span>Sparkle</span><span>{'\u2726'} Yes</span></div>}
              </div>

              <div className={styles.statSection}>
                <div className={styles.statSectionTitle}>Vitals</div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>HP</span>
                  <div className={styles.statBarOuter}>
                    <div className={styles.statBarInner} style={{ width: `${pet.hp}%`, background: HP_COLOR }} />
                  </div>
                  <span className={styles.statValue}>{Math.round(pet.hp)}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Joy</span>
                  <div className={styles.statBarOuter}>
                    <div className={styles.statBarInner} style={{ width: `${pet.happiness}%`, background: JOY_COLOR }} />
                  </div>
                  <span className={styles.statValue}>{Math.round(pet.happiness)}</span>
                </div>
              </div>

              <div className={styles.statSection}>
                <div className={styles.statSectionTitle}>Abilities</div>
                {(['swim', 'fly', 'run', 'power', 'stamina'] as (keyof ChaoStats)[]).map(stat => {
                  const val = pet.stats[stat];
                  const growthKey = `${stat}Growth` as keyof typeof pet.genes;
                  const growth = pet.genes[growthKey] as number;
                  return (
                    <div key={stat} className={styles.statRow}>
                      <span className={styles.statLabel}>{stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                      <div className={styles.statBarOuter}>
                        <div className={styles.statBarInner} style={{ width: `${(val / 99) * 100}%`, background: STAT_COLORS[stat] }} />
                      </div>
                      <span className={styles.statValue}>{Math.round(val)}</span>
                      <span className={styles.statGrowth}>x{growth.toFixed(1)}</span>
                    </div>
                  );
                })}
              </div>

              {pet.stage === 'child' && (
                <p className={styles.evoHint}>Next evolution at level {EVO_THRESHOLD_1}!</p>
              )}
              {pet.stage === 'evolved1' && (
                <p className={styles.evoHint}>Final evolution at level {EVO_THRESHOLD_2}!</p>
              )}
              {pet.stage === 'evolved2' && (
                <p className={styles.evoHint}>Fully evolved!</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Shop View ─────────────────────────────────────────── */}
        {view === 'shop' && (
          <div className={styles.overlay}>
            <div className={styles.shopHeader}>
              <button className={styles.shopBackBtn} onClick={() => goView('garden')}>&larr;</button>
              <span className={styles.shopTitle}>Shop</span>
              <span className={styles.shopShards}>{'\u25C7'} {shards}</span>
            </div>
            <div className={styles.tabBar}>
              {(['food', 'items', 'colors'] as ShopTab[]).map(t => (
                <button
                  key={t}
                  className={`${styles.tab} ${shopTab === t ? styles.tabActive : ''}`}
                  onClick={() => { sfx('tap'); setShopTab(t); }}
                >{t}</button>
              ))}
            </div>
            <div className={styles.shopGrid}>
              {shopTab === 'food' && Object.values(FOODS).map(food => (
                <div key={food.type} className={styles.shopCard}>
                  <div className={styles.shopCardSwatch} style={{ background: food.color }} />
                  <span className={styles.shopCardName}>{food.name}</span>
                  <span className={styles.shopCardPrice}>{'\u25C7'} {food.price}</span>
                  <button className={styles.shopBuyBtn} onClick={() => buyFood(food.type)} disabled={shards < food.price}>
                    Buy
                  </button>
                </div>
              ))}
              {shopTab === 'items' && Object.values(ITEMS).map(item => (
                <div key={item.type} className={styles.shopCard}>
                  <span className={styles.shopCardName}>{item.name}</span>
                  <span className={styles.shopCardDesc}>{item.description}</span>
                  <span className={styles.shopCardPrice}>{'\u25C7'} {item.price}</span>
                  <button className={styles.shopBuyBtn} onClick={() => buyItem(item.type)} disabled={shards < item.price}>
                    Buy
                  </button>
                </div>
              ))}
              {shopTab === 'colors' && COLORS.map((c, idx) => {
                const owned = save.purchasedColors.includes(idx);
                const isRainbow = c.r < 0;
                return (
                  <div key={idx} className={styles.shopCard}>
                    <div className={styles.shopCardSwatch} style={{
                      background: isRainbow ? 'linear-gradient(135deg, #e74c3c, #f1c40f, #2ecc71, #3498db, #9b59b6)' : `rgb(${c.r},${c.g},${c.b})`,
                    }} />
                    <span className={styles.shopCardName}>{c.name}</span>
                    {owned ? (
                      <>
                        <span className={styles.shopOwned}>Owned</span>
                        {hasPets && !isRainbow && (
                          <button className={styles.shopBuyBtn} onClick={() => buyColor(idx)}>
                            Apply
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className={styles.shopCardPrice}>{'\u25C7'} {c.price}</span>
                        <button className={styles.shopBuyBtn} onClick={() => buyColor(idx)} disabled={shards < c.price}>
                          Buy
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Games View ────────────────────────────────────────── */}
        {view === 'games' && (
          <div className={styles.overlay}>
            <div className={styles.overlayHeader}>
              <span className={styles.overlayTitle}>Games</span>
              <button className={styles.overlayClose} onClick={() => goView('garden')}>&times;</button>
            </div>
            <div className={styles.overlayBody}>
              <div className={styles.gamesGrid}>
                <div className={styles.gameCard}>
                  <span className={styles.gameCardTitle}>Pet Bounce</span>
                  <span className={styles.gameCardDesc}>Jump between platforms, collect coins, avoid spikes! Tap left or right to move.</span>
                  <button className={styles.gameCardPlayBtn} onClick={startBounce}>Play</button>
                </div>
                <div className={styles.gameCard}>
                  <span className={styles.gameCardTitle}>Pet Catch</span>
                  <span className={styles.gameCardDesc}>Catch falling coins and dodge bombs! Drag to move your catcher.</span>
                  <button className={styles.gameCardPlayBtn} onClick={startCatch}>Play</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Race View ─────────────────────────────────────────── */}
        {view === 'race' && (
          <div className={styles.overlay}>
            <div className={styles.overlayHeader}>
              <span className={styles.overlayTitle}>Race</span>
              <button className={styles.overlayClose} onClick={() => { if (raceTimerRef.current) clearInterval(raceTimerRef.current); goView('garden'); }}>&times;</button>
            </div>
            <div className={styles.overlayBody}>
              {racePhase === 'list' && (
                <div className={styles.raceList}>
                  {!hasPets && <p className={styles.emptyMsg}>You need a pet to race!</p>}
                  {hasPets && RACES.map((race, i) => {
                    const locked = petLevel < race.requiredLevel;
                    return (
                      <div
                        key={i}
                        className={`${styles.raceCard} ${locked ? styles.raceCardDisabled : ''}`}
                        onClick={() => !locked && startRace(race)}
                      >
                        <div className={styles.raceCardInfo}>
                          <span className={styles.raceCardName}>{race.name}</span>
                          <span className={styles.raceCardMeta}>
                            Difficulty: {'*'.repeat(race.difficulty)} &middot; Req Lv.{race.requiredLevel}
                          </span>
                        </div>
                        <span className={styles.raceCardReward}>{'\u25C7'} {race.coinReward}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {racePhase === 'running' && activeRace && (
                <div className={styles.raceProgress}>
                  <div className={styles.raceTrack}>
                    <span className={styles.raceTrackLabel}>{pet?.name || 'You'}</span>
                    <div className={styles.raceTrackBar}>
                      <div className={styles.raceTrackFill} style={{ width: `${racePlayer}%`, background: '#5dade2' }} />
                    </div>
                  </div>
                  <div className={styles.raceTrack}>
                    <span className={styles.raceTrackLabel}>CPU</span>
                    <div className={styles.raceTrackBar}>
                      <div className={styles.raceTrackFill} style={{ width: `${raceCPU}%`, background: '#e74c3c' }} />
                    </div>
                  </div>
                  <p className={styles.raceTerrain}>
                    Terrain: {activeRace.terrain[raceSeg]?.toUpperCase() || '...'} (Seg {raceSeg + 1}/{activeRace.terrain.length})
                  </p>
                </div>
              )}

              {racePhase === 'result' && activeRace && (
                <div className={styles.raceResult}>
                  <p className={styles.raceResultTitle} style={{ color: raceWon ? '#ffd700' : '#e74c3c' }}>
                    {raceWon ? 'You Won!' : 'You Lost'}
                  </p>
                  {raceWon && (
                    <p className={styles.raceResultReward}>+{activeRace.coinReward} Shards earned!</p>
                  )}
                  <button className={styles.minigamePlayBtn} onClick={() => setRacePhase('list')}>
                    Back to Races
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Breed View ────────────────────────────────────────── */}
        {view === 'breed' && (
          <div className={styles.overlay}>
            <div className={styles.overlayHeader}>
              <span className={styles.overlayTitle}>Breed</span>
              <button className={styles.overlayClose} onClick={() => goView('garden')}>&times;</button>
            </div>
            <div className={styles.overlayBody}>
              <div className={styles.breedArea}>
                <p className={styles.breedInstruction}>Select two evolved pets to breed</p>
                <div className={styles.breedGrid}>
                  {save.chao.map((c, idx) => {
                    const isEvolved = c.stage === 'evolved1' || c.stage === 'evolved2';
                    const isSelected = breedSel[0] === idx || breedSel[1] === idx;
                    return (
                      <div
                        key={c.id}
                        className={`${styles.breedPetCard} ${isSelected ? styles.breedPetSelected : ''}`}
                        onClick={() => isEvolved && toggleBreedSelect(idx)}
                        style={{ opacity: isEvolved ? 1 : 0.35 }}
                      >
                        <canvas ref={breedCanvasRefCb(c.id)} width={64} height={80} />
                        <span className={styles.breedPetName}>{c.name}</span>
                      </div>
                    );
                  })}
                </div>

                {breedSel[0] >= 0 && breedSel[1] >= 0 && breedSel[0] !== breedSel[1] && (
                  <div className={styles.breedPreview}>
                    <p className={styles.breedPreviewTitle}>Offspring Preview</p>
                    <p className={styles.breedPreviewInfo}>
                      Parents: {save.chao[breedSel[0]]?.name} + {save.chao[breedSel[1]]?.name}
                    </p>
                    <p className={styles.breedPreviewInfo}>
                      Genes will be a mix of both parents
                    </p>
                  </div>
                )}

                <button
                  className={styles.breedBtn}
                  disabled={breedSel[0] < 0 || breedSel[1] < 0 || breedSel[0] === breedSel[1]}
                  onClick={doBreed}
                >
                  Breed
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Floating texts ────────────────────────────────────── */}
        {floats.map(f => (
          <div key={f.id} className={styles.floatingText} style={{ left: `${f.x}%`, top: `${f.y}%`, color: f.color }}>
            {f.text}
          </div>
        ))}

        {/* ─── Toast ─────────────────────────────────────────────── */}
        {toast && <div className={styles.toast}>{toast}</div>}

        {/* ─── Hearts overlay (breed) ────────────────────────────── */}
        {heartsVisible && (
          <div className={styles.heartsOverlay}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                className={styles.heart}
                style={{
                  left: `${15 + Math.random() * 70}%`,
                  top: `${40 + Math.random() * 30}%`,
                  animationDelay: `${Math.random() * 0.8}s`,
                  fontSize: `${18 + Math.random() * 16}px`,
                }}
              >{'\u2764\uFE0F'}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
