import type { FoodInfo, ItemInfo, RaceConfig, ChaoGenes, Personality, ColorOption, ChaoStats } from './types';

export const GW = 480;
export const GH = 320;

export const FOODS: Record<string, FoodInfo> = {
  red:     { type: 'red',     name: 'Red Fruit',     price: 5,  color: '#e74c3c', statBoost: { power: 3 },   hpRestore: 15, happinessBoost: 5 },
  blue:    { type: 'blue',    name: 'Blue Fruit',    price: 5,  color: '#3498db', statBoost: { swim: 3 },    hpRestore: 15, happinessBoost: 5 },
  green:   { type: 'green',   name: 'Green Fruit',   price: 5,  color: '#2ecc71', statBoost: { run: 3 },     hpRestore: 15, happinessBoost: 5 },
  yellow:  { type: 'yellow',  name: 'Yellow Fruit',  price: 5,  color: '#f1c40f', statBoost: { fly: 3 },     hpRestore: 15, happinessBoost: 5 },
  purple:  { type: 'purple',  name: 'Purple Fruit',  price: 5,  color: '#9b59b6', statBoost: { stamina: 3 }, hpRestore: 15, happinessBoost: 5 },
  pink:    { type: 'pink',    name: 'Pink Fruit',    price: 8,  color: '#e91e8c', statBoost: {},             hpRestore: 10, happinessBoost: 20 },
  orange:  { type: 'orange',  name: 'Orange Fruit',  price: 4,  color: '#e67e22', statBoost: {},             hpRestore: 40, happinessBoost: 5 },
  rainbow: { type: 'rainbow', name: 'Rainbow Fruit', price: 50, color: '#ff69b4', statBoost: { swim: 2, fly: 2, run: 2, power: 2, stamina: 2 }, hpRestore: 30, happinessBoost: 15 },
};

export const ITEMS: Record<string, ItemInfo> = {
  ball:          { type: 'ball',          name: 'Ball',          price: 10, happinessBoost: 10, description: 'A bouncy ball to play with' },
  trumpet:       { type: 'trumpet',       name: 'Trumpet',       price: 15, happinessBoost: 12, description: 'Makes happy music' },
  tv:            { type: 'tv',            name: 'Television',    price: 30, happinessBoost: 15, description: 'Pet loves watching TV' },
  rocking_horse: { type: 'rocking_horse', name: 'Rocking Horse', price: 20, happinessBoost: 12, description: 'Giddyup!' },
};

export const RACES: RaceConfig[] = [
  { name: 'Beginner Circuit',   difficulty: 1,  requiredLevel: 0,  coinReward: 5,  terrain: ['run', 'run', 'run', 'power'] },
  { name: 'Forest Trail',       difficulty: 2,  requiredLevel: 5,  coinReward: 10, terrain: ['run', 'fly', 'run', 'power'] },
  { name: 'Ocean Dash',         difficulty: 3,  requiredLevel: 10, coinReward: 15, terrain: ['swim', 'swim', 'run', 'fly'] },
  { name: 'Mountain Challenge', difficulty: 5,  requiredLevel: 20, coinReward: 25, terrain: ['power', 'fly', 'run', 'power'] },
  { name: 'Sky Marathon',       difficulty: 7,  requiredLevel: 35, coinReward: 40, terrain: ['fly', 'fly', 'swim', 'power'] },
  { name: "Champion's Road",    difficulty: 10, requiredLevel: 50, coinReward: 80, terrain: ['swim', 'fly', 'run', 'power'] },
];

export const COLORS: ColorOption[] = [
  { name: 'Sky Blue',      r: 91,  g: 155, b: 213, price: 0 },
  { name: 'Mint Green',    r: 46,  g: 204, b: 113, price: 20 },
  { name: 'Sunset Orange', r: 230, g: 126, b: 34,  price: 20 },
  { name: 'Rose Pink',     r: 233, g: 30,  b: 99,  price: 20 },
  { name: 'Lavender',      r: 155, g: 89,  b: 182, price: 20 },
  { name: 'Crimson',       r: 192, g: 57,  b: 43,  price: 30 },
  { name: 'Gold',          r: 241, g: 196, b: 15,  price: 30 },
  { name: 'Silver',        r: 189, g: 195, b: 199, price: 30 },
  { name: 'Ocean Blue',    r: 41,  g: 128, b: 185, price: 30 },
  { name: 'Forest',        r: 39,  g: 174, b: 96,  price: 30 },
  { name: 'Snow White',    r: 236, g: 240, b: 241, price: 50 },
  { name: 'Midnight',      r: 44,  g: 62,  b: 80,  price: 50 },
  { name: 'Ruby',          r: 192, g: 57,  b: 43,  price: 50 },
  { name: 'Emerald',       r: 0,   g: 177, b: 106, price: 50 },
  { name: 'Rainbow',       r: -1,  g: -1,  b: -1,  price: 100 },
];

export const EVO_THRESHOLD_1 = 25;
export const EVO_THRESHOLD_2 = 60;
export const HUNGER_RATE = 0.4;
export const HAPPINESS_DECAY = 0.15;
export const GAME_MINUTE_MS = 30000;
export const MAX_CHAO = 8;

export function uid(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
export function generateDefaultGenes(): ChaoGenes {
  const p: Personality[] = ['curious', 'active', 'shy', 'lazy'];
  return {
    swimGrowth: 0.8 + Math.random() * 0.8, flyGrowth: 0.8 + Math.random() * 0.8,
    runGrowth: 0.8 + Math.random() * 0.8, powerGrowth: 0.8 + Math.random() * 0.8,
    staminaGrowth: 0.8 + Math.random() * 0.8,
    colorR: 91 + Math.floor(Math.random() * 40 - 20), colorG: 155 + Math.floor(Math.random() * 40 - 20),
    colorB: 213 + Math.floor(Math.random() * 40 - 20),
    personality: p[Math.floor(Math.random() * 4)], sparkle: Math.random() < 0.05,
  };
}
export function breedGenes(p1: ChaoGenes, p2: ChaoGenes): ChaoGenes {
  const pick = <T,>(a: T, b: T): T => Math.random() < 0.5 ? a : b;
  const avg = (a: number, b: number) => (a + b) / 2 + (Math.random() * 0.2 - 0.1);
  const mc = (a: number, b: number) => clamp(Math.round(avg(a, b) + (Math.random() * 30 - 15)), 0, 255);
  return {
    swimGrowth: clamp(avg(p1.swimGrowth, p2.swimGrowth), 0.3, 2.5),
    flyGrowth: clamp(avg(p1.flyGrowth, p2.flyGrowth), 0.3, 2.5),
    runGrowth: clamp(avg(p1.runGrowth, p2.runGrowth), 0.3, 2.5),
    powerGrowth: clamp(avg(p1.powerGrowth, p2.powerGrowth), 0.3, 2.5),
    staminaGrowth: clamp(avg(p1.staminaGrowth, p2.staminaGrowth), 0.3, 2.5),
    colorR: mc(p1.colorR, p2.colorR), colorG: mc(p1.colorG, p2.colorG), colorB: mc(p1.colorB, p2.colorB),
    personality: pick(p1.personality, p2.personality),
    sparkle: (p1.sparkle && p2.sparkle) ? true : (p1.sparkle || p2.sparkle) ? Math.random() < 0.25 : Math.random() < 0.03,
  };
}
export function getChaoLevel(s: ChaoStats): number { return Math.floor((s.swim + s.fly + s.run + s.power + s.stamina) / 5); }
export function getDominantType(s: ChaoStats): string {
  const e: [string, number][] = [['swim', s.swim], ['fly', s.fly], ['run', s.run], ['power', s.power]];
  e.sort((a, b) => b[1] - a[1]);
  if (e[0][1] - e[1][1] < 5) return 'normal';
  return e[0][0];
}
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => clamp(c, 0, 255).toString(16).padStart(2, '0')).join('');
}
export function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return rgbToHex(Math.min(255, r + amt), Math.min(255, g + amt), Math.min(255, b + amt));
}
export function darken(hex: string, amt: number): string { return lighten(hex, -amt); }
