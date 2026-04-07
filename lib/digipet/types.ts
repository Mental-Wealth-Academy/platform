export type ChaoStage = 'egg' | 'child' | 'evolved1' | 'evolved2';
export type ChaoType = 'normal' | 'swim' | 'fly' | 'run' | 'power';
export type Personality = 'curious' | 'active' | 'shy' | 'lazy';
export type ChaoState = 'idle' | 'wander' | 'sit' | 'sleep' | 'eat' | 'play' | 'happy' | 'sad' | 'hatching';
export type FoodType = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange' | 'rainbow';
export type ItemType = 'ball' | 'trumpet' | 'tv' | 'rocking_horse';

export interface ChaoStats {
  swim: number; fly: number; run: number; power: number; stamina: number;
}

export interface ChaoGenes {
  swimGrowth: number; flyGrowth: number; runGrowth: number;
  powerGrowth: number; staminaGrowth: number;
  colorR: number; colorG: number; colorB: number;
  personality: Personality; sparkle: boolean;
}

export interface ChaoColor { r: number; g: number; b: number; }

export interface ChaoData {
  id: string; name: string; stats: ChaoStats;
  hp: number; happiness: number; age: number;
  stage: ChaoStage; type: ChaoType;
  color: ChaoColor; genes: ChaoGenes;
  personality: Personality; sparkle: boolean;
  x: number; y: number;
}

export interface EggData {
  id: string; genes: ChaoGenes; color: ChaoColor;
  hatchProgress: number; x: number; y: number;
}

/** Game save — shards live on the user's platform account, NOT here */
export interface GameSave {
  version: number;
  chao: ChaoData[];
  eggs: EggData[];
  inventory: {
    food: Partial<Record<FoodType, number>>;
    items: Partial<Record<ItemType, number>>;
  };
  purchasedColors: number[];
  gardenItems: { type: ItemType; x: number; y: number }[];
  totalPlayTime: number;
  lastSaveTime: number;
  settings: { musicEnabled: boolean; sfxEnabled: boolean; };
}

export interface FoodInfo {
  type: FoodType; name: string; price: number; color: string;
  statBoost: Partial<ChaoStats>; hpRestore: number; happinessBoost: number;
}

export interface ItemInfo {
  type: ItemType; name: string; price: number;
  happinessBoost: number; description: string;
}

export interface RaceConfig {
  name: string; difficulty: number; requiredLevel: number;
  coinReward: number; terrain: (keyof ChaoStats)[];
}

export interface ColorOption {
  name: string; r: number; g: number; b: number; price: number;
}

/** Bridge between Phaser game and the MWA platform */
export interface ChaoBridge {
  getShards(): Promise<number>;
  spendShards(amount: number, reason: string): Promise<{ ok: boolean; newBalance: number }>;
  earnShards(amount: number, reason: string): Promise<{ ok: boolean; newBalance: number }>;
  saveGame(data: string): Promise<void>;
  loadGame(): Promise<string | null>;
}
