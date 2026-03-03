/**
 * Avatar System with Deterministic Selection (Lil Nouns)
 *
 * Generates unique Lil Noun avatars for each user using:
 * - @nouns/assets for trait data (bodies, accessories, heads, glasses)
 * - @nouns/sdk for SVG rendering (buildSVG)
 * - Deterministic seeded RNG (Mulberry32) for stable assignment
 *
 * The same user seed will ALWAYS return the same 5 avatars.
 * No on-chain calls or IPFS needed — everything is computed locally.
 */

import { ImageData, getNounData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';

// Trait counts from @nouns/assets
const BODY_COUNT = ImageData.images.bodies.length;
const ACCESSORY_COUNT = ImageData.images.accessories.length;
const HEAD_COUNT = ImageData.images.heads.length;
const GLASSES_COUNT = ImageData.images.glasses.length;
const BACKGROUND_COLORS = ImageData.bgcolors;

// Number of avatars to assign per user
const AVATARS_PER_USER = 5;

/**
 * Avatar interface representing a single avatar
 */
export interface Avatar {
  id: string;           // Unique avatar identifier (e.g., "noun_00_11_042_200_06")
  image_url: string;    // SVG data URI
  metadata_url: string; // Empty (no metadata needed)
}

/**
 * Noun seed matching @nouns/assets NounSeed interface
 */
interface NounSeed {
  background: number;
  body: number;
  accessory: number;
  head: number;
  glasses: number;
}

/**
 * Mulberry32 - A fast, high-quality 32-bit seeded PRNG
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Converts a string to a 32-bit integer hash (djb2 variant)
 */
function stringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

/**
 * Generates a deterministic NounSeed from a numeric RNG
 */
function generateSeed(rng: () => number): NounSeed {
  return {
    background: Math.floor(rng() * BACKGROUND_COLORS.length),
    body: Math.floor(rng() * BODY_COUNT),
    accessory: Math.floor(rng() * ACCESSORY_COUNT),
    head: Math.floor(rng() * HEAD_COUNT),
    glasses: Math.floor(rng() * GLASSES_COUNT),
  };
}

/**
 * Builds an SVG data URI from a NounSeed
 */
function buildAvatarSvgDataUri(seed: NounSeed): string {
  const { parts, background } = getNounData(seed);
  const svg = buildSVG(parts, ImageData.palette, background);
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Creates a stable ID from a seed
 */
function seedToId(seed: NounSeed): string {
  const bg = String(seed.background).padStart(2, '0');
  const bo = String(seed.body).padStart(2, '0');
  const ac = String(seed.accessory).padStart(3, '0');
  const he = String(seed.head).padStart(3, '0');
  const gl = String(seed.glasses).padStart(2, '0');
  return `noun_${bg}_${bo}_${ac}_${he}_${gl}`;
}

/**
 * Gets exactly 5 deterministically assigned Lil Noun avatars for a user
 *
 * Same user seed always returns the same 5 avatars.
 */
export function getAssignedAvatars(userSeed: string): Avatar[] {
  const seed = stringToSeed(userSeed);
  const rng = mulberry32(seed);

  // Generate 5 unique seeds
  const seenIds = new Set<string>();
  const avatars: Avatar[] = [];

  while (avatars.length < AVATARS_PER_USER) {
    const nounSeed = generateSeed(rng);
    const id = seedToId(nounSeed);

    if (seenIds.has(id)) continue;
    seenIds.add(id);

    avatars.push({
      id,
      image_url: buildAvatarSvgDataUri(nounSeed),
      metadata_url: '',
    });
  }

  // Sort by ID for consistent ordering
  avatars.sort((a, b) => a.id.localeCompare(b.id));
  return avatars;
}

/**
 * Validates that an avatar ID is in the user's assigned set
 */
export function isAvatarValidForUser(userSeed: string, avatarId: string): boolean {
  const assignedAvatars = getAssignedAvatars(userSeed);
  return assignedAvatars.some(avatar => avatar.id === avatarId);
}

/**
 * Gets a single avatar by its ID (e.g., "noun_00_11_042_200_06")
 */
export function getAvatarByAvatarId(avatarId: string): Avatar | null {
  const match = avatarId.match(/^noun_(\d{2})_(\d{2})_(\d{3})_(\d{3})_(\d{2})$/);
  if (!match) {
    // Legacy IPFS avatar format — return null to trigger re-selection
    if (avatarId.startsWith('avatar_')) return null;
    return null;
  }

  const seed: NounSeed = {
    background: parseInt(match[1], 10),
    body: parseInt(match[2], 10),
    accessory: parseInt(match[3], 10),
    head: parseInt(match[4], 10),
    glasses: parseInt(match[5], 10),
  };

  // Validate ranges
  if (seed.background >= BACKGROUND_COLORS.length ||
      seed.body >= BODY_COUNT ||
      seed.accessory >= ACCESSORY_COUNT ||
      seed.head >= HEAD_COUNT ||
      seed.glasses >= GLASSES_COUNT) {
    return null;
  }

  return {
    id: avatarId,
    image_url: buildAvatarSvgDataUri(seed),
    metadata_url: '',
  };
}

/**
 * Constants exported for use in other modules
 */
export const AVATAR_CONFIG = {
  BODY_COUNT,
  ACCESSORY_COUNT,
  HEAD_COUNT,
  GLASSES_COUNT,
  AVATARS_PER_USER,
} as const;
