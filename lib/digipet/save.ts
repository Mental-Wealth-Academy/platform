import type { GameSave, ChaoData, EggData } from './types';
import { uid, generateDefaultGenes } from './data';

export function getDefaultSave(): GameSave {
  const genes = generateDefaultGenes();
  const egg: EggData = {
    id: uid(), genes,
    color: { r: genes.colorR, g: genes.colorG, b: genes.colorB },
    hatchProgress: 0, x: 240, y: 180,
  };
  return {
    version: 1,
    chao: [], eggs: [egg],
    inventory: { food: { orange: 3 }, items: {} },
    purchasedColors: [0],
    gardenItems: [],
    totalPlayTime: 0,
    lastSaveTime: Date.now(),
    settings: { musicEnabled: true, sfxEnabled: true },
  };
}

export function deserializeSave(raw: string): GameSave | null {
  try {
    const data = JSON.parse(raw) as GameSave;
    if (!data.version) return null;
    data.inventory = data.inventory || { food: {}, items: {} };
    data.inventory.food = data.inventory.food || {};
    data.inventory.items = data.inventory.items || {};
    data.purchasedColors = data.purchasedColors || [0];
    data.gardenItems = data.gardenItems || [];
    data.settings = data.settings || { musicEnabled: true, sfxEnabled: true };
    return data;
  } catch { return null; }
}

export function applyOfflineTime(save: GameSave): void {
  const now = Date.now();
  const elapsed = now - save.lastSaveTime;
  const gameMinutes = elapsed / 30000;
  const hungerLost = Math.min(gameMinutes * 0.4, 40);
  for (const chao of save.chao) {
    chao.hp = Math.max(0, chao.hp - hungerLost);
    chao.happiness = Math.max(0, chao.happiness - gameMinutes * 0.1);
    chao.age += gameMinutes;
  }
  save.lastSaveTime = now;
}

export function hatchEgg(save: GameSave, eggId: string, name: string): ChaoData | null {
  const idx = save.eggs.findIndex(e => e.id === eggId);
  if (idx === -1) return null;
  const egg = save.eggs[idx];
  save.eggs.splice(idx, 1);
  const chao: ChaoData = {
    id: uid(), name,
    stats: { swim: 1, fly: 1, run: 1, power: 1, stamina: 1 },
    hp: 80, happiness: 60, age: 0,
    stage: 'child', type: 'normal',
    color: egg.color, genes: egg.genes,
    personality: egg.genes.personality,
    sparkle: egg.genes.sparkle,
    x: egg.x, y: egg.y,
  };
  save.chao.push(chao);
  return chao;
}
