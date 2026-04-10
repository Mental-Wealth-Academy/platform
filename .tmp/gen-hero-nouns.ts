import fs from 'node:fs';
import { ImageData, getNounData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';

const BODY_COUNT = ImageData.images.bodies.length;
const ACCESSORY_COUNT = ImageData.images.accessories.length;
const HEAD_COUNT = ImageData.images.heads.length;
const GLASSES_COUNT = ImageData.images.glasses.length;
const BACKGROUND_COLORS = ImageData.bgcolors;

function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

function generateSeed(rng: () => number) {
  return {
    background: Math.floor(rng() * BACKGROUND_COLORS.length),
    body: Math.floor(rng() * BODY_COUNT),
    accessory: Math.floor(rng() * ACCESSORY_COUNT),
    head: Math.floor(rng() * HEAD_COUNT),
    glasses: Math.floor(rng() * GLASSES_COUNT),
  };
}

const rng = mulberry32(stringToSeed('community-hero-strip'));
for (let i = 0; i < 3; i++) {
  const seed = generateSeed(rng);
  const { parts, background } = getNounData(seed);
  const svg = buildSVG(parts, ImageData.palette, background);
  fs.writeFileSync(`public/uploads/hero-noun-${i + 1}.svg`, svg);
}
