/**
 * Avatar System with Deterministic Selection
 *
 * Generates unique avatars for each user from two sources:
 * - Academic Angels: ERC-721 NFTs (token IDs 1-550) with IPFS metadata
 *   Contract: 0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F on Base
 * - Lil Nouns: Procedurally generated via @nouns/assets + @nouns/sdk
 *
 * Uses deterministic seeded RNG (Mulberry32) for stable assignment.
 * The same user seed will ALWAYS return the same 6 avatars.
 */

import { ImageData, getNounData } from '@nouns/assets';
import { buildSVG } from '@nouns/sdk';

// Academic Angels NFT config
const ANGELS_CONTRACT = '0x39f259B58A9aB02d42bC3DF5836bA7fc76a8880F';
const ANGELS_METADATA_BASE = 'https://nftstorage.link/ipfs/QmWag7KqqDs7yyXzzPxg3xS3jWGgZcPRd2YAS7Whd1L6Xd';
const IPFS_GATEWAY = 'https://nftstorage.link/ipfs/';
const TOTAL_ANGELS = 550;

// Trait counts from @nouns/assets
const BODY_COUNT = ImageData.images.bodies.length;
const ACCESSORY_COUNT = ImageData.images.accessories.length;
const HEAD_COUNT = ImageData.images.heads.length;
const GLASSES_COUNT = ImageData.images.glasses.length;
const BACKGROUND_COLORS = ImageData.bgcolors;

// Number of avatars to assign per user
const AVATARS_PER_USER = 6;
const NOUNS_PER_USER = 3;
const ANGELS_PER_USER = 3;

/**
 * Avatar interface representing a single avatar
 */
export interface Avatar {
  id: string;           // Unique avatar identifier (e.g., "angel_042" or "noun_00_11_042_200_06")
  image_url: string;    // IPFS gateway URL or SVG data URI
  metadata_url: string; // IPFS metadata URL (angels) or empty (nouns)
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
 * Converts an ipfs:// URI to an HTTPS gateway URL
 */
function ipfsToHttp(ipfsUri: string): string {
  if (ipfsUri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + ipfsUri.slice(7);
  }
  return ipfsUri;
}

// In-memory cache for angel metadata (tokenId -> image URL)
const angelImageCache = new Map<number, string>();

/**
 * Fetches the image URL for an Academic Angel token from IPFS metadata
 */
async function fetchAngelImageUrl(tokenId: number): Promise<string> {
  const cached = angelImageCache.get(tokenId);
  if (cached) return cached;

  const metadataUrl = `${ANGELS_METADATA_BASE}/${tokenId}`;
  const res = await fetch(metadataUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch angel metadata for token ${tokenId}: ${res.statusText}`);
  }
  const metadata = await res.json();
  const imageUrl = ipfsToHttp(metadata.image);
  angelImageCache.set(tokenId, imageUrl);
  return imageUrl;
}

/**
 * Deterministically picks 3 unique angel token IDs for a user (from 1-550)
 */
function pickAngelTokenIds(rng: () => number): number[] {
  const ids = new Set<number>();
  while (ids.size < ANGELS_PER_USER) {
    const id = Math.floor(rng() * TOTAL_ANGELS) + 1; // 1-550
    ids.add(id);
  }
  return Array.from(ids);
}

/**
 * Gets deterministically assigned avatars for a user.
 * Mix of 3 Academic Angels (from on-chain NFTs) + 3 Lil Nouns = 6 total.
 *
 * Same user seed always returns the same 6 avatars.
 */
export async function getAssignedAvatars(userSeed: string): Promise<Avatar[]> {
  const seed = stringToSeed(userSeed);
  const rng = mulberry32(seed);

  const avatars: Avatar[] = [];

  // Pick 3 unique Academic Angel token IDs (from 550 total)
  const angelTokenIds = pickAngelTokenIds(rng);

  // Fetch angel image URLs from IPFS in parallel
  const angelImages = await Promise.all(
    angelTokenIds.map(async (tokenId) => {
      try {
        const imageUrl = await fetchAngelImageUrl(tokenId);
        return { tokenId, imageUrl };
      } catch (err) {
        console.error(`Failed to fetch angel #${tokenId}, using metadata URL as fallback:`, err);
        return { tokenId, imageUrl: `${ANGELS_METADATA_BASE}/${tokenId}` };
      }
    })
  );

  for (const { tokenId, imageUrl } of angelImages) {
    const padded = String(tokenId).padStart(3, '0');
    avatars.push({
      id: `angel_${padded}`,
      image_url: imageUrl,
      metadata_url: `${ANGELS_METADATA_BASE}/${tokenId}`,
    });
  }

  // Generate 3 unique Lil Nouns
  const seenIds = new Set<string>();
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

  // Sort angels first, then nouns
  avatars.sort((a, b) => a.id.localeCompare(b.id));
  return avatars;
}

/**
 * Validates that an avatar ID is in the user's assigned set
 */
export async function isAvatarValidForUser(userSeed: string, avatarId: string): Promise<boolean> {
  const assignedAvatars = await getAssignedAvatars(userSeed);
  return assignedAvatars.some(avatar => avatar.id === avatarId);
}

/**
 * Gets a single avatar by its ID (e.g., "noun_00_11_042_200_06" or "angel_042")
 */
export async function getAvatarByAvatarId(avatarId: string): Promise<Avatar | null> {
  // Academic Angel format: angel_NNN (3-digit, 1-550)
  const angelMatch = avatarId.match(/^angel_(\d{2,3})$/);
  if (angelMatch) {
    const tokenId = parseInt(angelMatch[1], 10);
    if (tokenId < 1 || tokenId > TOTAL_ANGELS) return null;
    try {
      const imageUrl = await fetchAngelImageUrl(tokenId);
      return {
        id: avatarId,
        image_url: imageUrl,
        metadata_url: `${ANGELS_METADATA_BASE}/${tokenId}`,
      };
    } catch (err) {
      console.error(`Failed to fetch angel avatar ${avatarId}:`, err);
      return null;
    }
  }

  // Lil Noun format
  const match = avatarId.match(/^noun_(\d{2})_(\d{2})_(\d{3})_(\d{3})_(\d{2})$/);
  if (!match) {
    // Legacy format — return null to trigger re-selection
    if (avatarId.startsWith('avatar_')) return null;
    return null;
  }

  const nounSeed: NounSeed = {
    background: parseInt(match[1], 10),
    body: parseInt(match[2], 10),
    accessory: parseInt(match[3], 10),
    head: parseInt(match[4], 10),
    glasses: parseInt(match[5], 10),
  };

  // Validate ranges
  if (nounSeed.background >= BACKGROUND_COLORS.length ||
      nounSeed.body >= BODY_COUNT ||
      nounSeed.accessory >= ACCESSORY_COUNT ||
      nounSeed.head >= HEAD_COUNT ||
      nounSeed.glasses >= GLASSES_COUNT) {
    return null;
  }

  return {
    id: avatarId,
    image_url: buildAvatarSvgDataUri(nounSeed),
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
  TOTAL_ANGELS,
  ANGELS_CONTRACT,
} as const;
