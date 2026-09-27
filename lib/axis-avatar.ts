/**
 * Deterministic Humanoid Grok-Bot Avatar Generator
 *
 * Implements the prompt specification:
 * - Minimal 2D bot face with cream skin and subtle horizontal oval cheek blush.
 * - Eyes: Two parallel solid black vertical capsules (ratio 3:1).
 * - No mouth, no nose, no eyebrows, no iris, no sclera, no reflections.
 * - Front-facing humanistic anime bot with big chunks of hair, pastel flat coloring,
 *   minimal clean shading, and 50 distinct traits across 6 modular categories:
 *   - 10 Backgrounds (solid charcoal and thematic tones)
 *   - 8 Hairstyles (long flowing locks, bob, ponytail, hime cut, shag, twin tails, wavy, pixie)
 *   - 8 Hair Colors (cobalt blue, platinum, lilac, blonde, raven, pink, mint, auburn)
 *   - 8 Cyber Headsets & Ear Units (mecha ear-unit, boom comms, elf ear, halo, visor clip, DJ pod, neural port, cat sensor)
 *   - 8 Outfits (scientist lab coat, cyber trench, school blazer, hoodie, scholar robe, turtleneck, flight suit, varsity)
 *   - 8 Accessories & Jewelry (gold star necklace, diamond pendant, padlock choker, barcode, gold medallion, lanyard, pearls, key)
 *
 * Total unique combinations: 10 * 8 * 8 * 8 * 8 * 8 = 327,680.
 * A deterministic PRNG ensures identical seeds always produce identical avatars.
 */

const AVATAR_ROUTE = '/api/avatars/render';
const DICEBEAR_HOST = 'api.dicebear.com';

export const BACKGROUND_TRAITS = [
  'Attachment Emerald',
  'Big Five Purple',
  'Strengths Blue',
  'Moral Cyan',
  'Academy Blue',
  'Rainbow Rose',
  'Rainbow Orange',
  'Rainbow Gold',
  'Studio Violet',
  'Charcoal Night',
] as const;

export const SKIN_TONE_TRAITS = [
  'Fair Porcelain',
  'Peach Cream',
  'Warm Honey',
  'Amber Bronze',
  'Rich Caramel',
  'Deep Espresso',
  'Cyber Lilac',
  'Cyber Mint',
] as const;

export const HAIRSTYLE_TRAITS = [
  'Long Flowing Locks',
  'Layered Anime Bob',
  'High Anime Ponytail',
  'Sleek Hime Cut',
  'Messy Anime Shag',
  'Twin Anime Tails',
  'Wavy Shoulder Cut',
  'Pixie Undercut',
] as const;

export const HAIR_COLOR_TRAITS = [
  'Electric Cobalt',
  'Platinum Silver',
  'Cyber Lilac',
  'Golden Blonde',
  'Midnight Raven',
  'Sakura Pink',
  'Mint Jade',
  'Sunset Auburn',
] as const;

export const HEADSET_TRAITS = [
  'Academy Mecha Ear-Unit',
  'Cyber Comms Boom Mic',
  'Pointed Cyber Elf Ear',
  'Floating Halo Emitter',
  'Tactical Visor Clip',
  'Studio DJ Monitor Pod',
  'Neural Interface Socket',
  'Cat-Ear Frequency Sensor',
] as const;

export const OUTFIT_TRAITS = [
  'Scientist Lab Coat',
  'High-Collar Cyber Trench',
  'Academy Uniform Blazer',
  'Streetwear Cyber Hoodie',
  'Scholar Academic Robe',
  'Ribbed Knit Turtleneck',
  'Astronaut Flight Suit',
  'Varsity Letterman Jacket',
] as const;

export const ACCESSORY_TRAITS = [
  'Gold Star Necklace & Hoop',
  'Blue Diamond Crystal Pendant',
  'Padlock Chain Choker',
  'Cyber Barcode Neck Tattoo',
  'Gold Medallion & Ear Cuff',
  'Academy Research ID Lanyard',
  'Pearl Choker & Pearl Stud',
  'Key Pendant & Safety Pin',
] as const;

// Backward-compatible category aliases
export const CHASSIS_TRAITS = HAIRSTYLE_TRAITS;
export const VISOR_TRAITS = HAIR_COLOR_TRAITS;
export const HEADGEAR_TRAITS = HEADSET_TRAITS;

export interface AxisAvatarParams {
  backgroundIndex: number;
  skinToneIndex: number;
  hairstyleIndex: number;
  hairColorIndex: number;
  headsetIndex: number;
  outfitIndex: number;
  accessoryIndex: number;
  // Backward-compatible indices
  chassisIndex: number;
  visorIndex: number;
  headgearIndex: number;
  traits: {
    background: (typeof BACKGROUND_TRAITS)[number];
    skinTone: (typeof SKIN_TONE_TRAITS)[number];
    hairstyle: (typeof HAIRSTYLE_TRAITS)[number];
    hairColor: (typeof HAIR_COLOR_TRAITS)[number];
    headset: (typeof HEADSET_TRAITS)[number];
    outfit: (typeof OUTFIT_TRAITS)[number];
    accessory: (typeof ACCESSORY_TRAITS)[number];
    // Backward-compatible trait fields
    chassis: string;
    visor: string;
    headgear: string;
  };
}

export function buildCustomAvatarSeed(params: {
  backgroundIndex: number;
  skinToneIndex: number;
  hairstyleIndex: number;
  hairColorIndex: number;
  headsetIndex: number;
  outfitIndex: number;
  accessoryIndex: number;
}): string {
  return `c_${params.backgroundIndex}_${params.skinToneIndex}_${params.hairstyleIndex}_${params.hairColorIndex}_${params.headsetIndex}_${params.outfitIndex}_${params.accessoryIndex}`;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function getAxisAvatarParams(seed: string): AxisAvatarParams {
  if (seed.startsWith('c_')) {
    const parts = seed.split('_').slice(1).map((v) => parseInt(v, 10));
    if (parts.length >= 7 && parts.every((n) => !Number.isNaN(n))) {
      const backgroundIndex = Math.abs(parts[0]) % BACKGROUND_TRAITS.length;
      const skinToneIndex = Math.abs(parts[1]) % SKIN_TONE_TRAITS.length;
      const hairstyleIndex = Math.abs(parts[2]) % HAIRSTYLE_TRAITS.length;
      const hairColorIndex = Math.abs(parts[3]) % HAIR_COLOR_TRAITS.length;
      const headsetIndex = Math.abs(parts[4]) % HEADSET_TRAITS.length;
      const outfitIndex = Math.abs(parts[5]) % OUTFIT_TRAITS.length;
      const accessoryIndex = Math.abs(parts[6]) % ACCESSORY_TRAITS.length;

      return {
        backgroundIndex,
        skinToneIndex,
        hairstyleIndex,
        hairColorIndex,
        headsetIndex,
        outfitIndex,
        accessoryIndex,
        chassisIndex: hairstyleIndex,
        visorIndex: hairColorIndex,
        headgearIndex: headsetIndex,
        traits: {
          background: BACKGROUND_TRAITS[backgroundIndex],
          skinTone: SKIN_TONE_TRAITS[skinToneIndex],
          hairstyle: HAIRSTYLE_TRAITS[hairstyleIndex],
          hairColor: HAIR_COLOR_TRAITS[hairColorIndex],
          headset: HEADSET_TRAITS[headsetIndex],
          outfit: OUTFIT_TRAITS[outfitIndex],
          accessory: ACCESSORY_TRAITS[accessoryIndex],
          chassis: HAIRSTYLE_TRAITS[hairstyleIndex],
          visor: HAIR_COLOR_TRAITS[hairColorIndex],
          headgear: HEADSET_TRAITS[headsetIndex],
        },
      };
    }
  }

  const random = seededRandom(seed);

  const backgroundIndex = Math.floor(random() * BACKGROUND_TRAITS.length);
  const skinToneIndex = Math.floor(random() * SKIN_TONE_TRAITS.length);
  const hairstyleIndex = Math.floor(random() * HAIRSTYLE_TRAITS.length);
  const hairColorIndex = Math.floor(random() * HAIR_COLOR_TRAITS.length);
  const headsetIndex = Math.floor(random() * HEADSET_TRAITS.length);
  const outfitIndex = Math.floor(random() * OUTFIT_TRAITS.length);
  const accessoryIndex = Math.floor(random() * ACCESSORY_TRAITS.length);

  return {
    backgroundIndex,
    skinToneIndex,
    hairstyleIndex,
    hairColorIndex,
    headsetIndex,
    outfitIndex,
    accessoryIndex,
    chassisIndex: hairstyleIndex,
    visorIndex: hairColorIndex,
    headgearIndex: headsetIndex,
    traits: {
      background: BACKGROUND_TRAITS[backgroundIndex],
      skinTone: SKIN_TONE_TRAITS[skinToneIndex],
      hairstyle: HAIRSTYLE_TRAITS[hairstyleIndex],
      hairColor: HAIR_COLOR_TRAITS[hairColorIndex],
      headset: HEADSET_TRAITS[headsetIndex],
      outfit: OUTFIT_TRAITS[outfitIndex],
      accessory: ACCESSORY_TRAITS[accessoryIndex],
      chassis: HAIRSTYLE_TRAITS[hairstyleIndex],
      visor: HAIR_COLOR_TRAITS[hairColorIndex],
      headgear: HEADSET_TRAITS[headsetIndex],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* PALETTES & COLOR PROFILES                                                  */
/* -------------------------------------------------------------------------- */

export const BACKGROUND_COLORS = [
  '#10B981', // 0: Attachment Emerald
  '#9333EA', // 1: Big Five Purple
  '#4361EE', // 2: Strengths Blue
  '#06B6D4', // 3: Moral Cyan
  '#5168FF', // 4: Academy Blue
  '#FF3366', // 5: Rainbow Rose
  '#FF8800', // 6: Rainbow Orange
  '#FFD000', // 7: Rainbow Gold
  '#7844D0', // 8: Studio Violet
  '#18181B', // 9: Charcoal Night
];

export const SKIN_PALETTES = [
  { base: '#FDE2D2', shadow: '#E8BCA4' }, // 0: Fair Porcelain
  { base: '#F8B185', shadow: '#E89668' }, // 1: Peach Cream (prompt default)
  { base: '#E5A672', shadow: '#C98652' }, // 2: Warm Honey
  { base: '#C67A4B', shadow: '#A85B2E' }, // 3: Amber Bronze
  { base: '#8D5534', shadow: '#6B3B1F' }, // 4: Rich Caramel
  { base: '#523223', shadow: '#3A2014' }, // 5: Deep Espresso
  { base: '#E4D4F4', shadow: '#C4B0DF' }, // 6: Cyber Lilac
  { base: '#D0F0E4', shadow: '#ACDAC6' }, // 7: Cyber Mint
];

export const HAIR_PALETTES = [
  { main: '#2563EB', shadow: '#1D4ED8', highlight: '#60A5FA' }, // 0: Electric Cobalt
  { main: '#E2E8F0', shadow: '#CBD5E1', highlight: '#FFFFFF' }, // 1: Platinum Silver
  { main: '#A855F7', shadow: '#7E22CE', highlight: '#D8B4FE' }, // 2: Cyber Lilac
  { main: '#F59E0B', shadow: '#D97706', highlight: '#FDE68A' }, // 3: Golden Blonde
  { main: '#18181B', shadow: '#09090B', highlight: '#3F3F46' }, // 4: Midnight Raven
  { main: '#F472B6', shadow: '#E11D48', highlight: '#FBCFE8' }, // 5: Sakura Pink
  { main: '#10B981', shadow: '#047857', highlight: '#6EE7B7' }, // 6: Mint Jade
  { main: '#EA580C', shadow: '#C2410C', highlight: '#FDBA74' }, // 7: Sunset Auburn
];

const SKIN_BASE = '#F8B185';
const SKIN_SHADOW = '#E89668';

/* -------------------------------------------------------------------------- */
/* SVG TRAIT RENDERERS                                                        */
/* -------------------------------------------------------------------------- */

function renderBackHair(styleIdx: number, colorIdx: number): string {
  const p = HAIR_PALETTES[colorIdx];

  switch (styleIdx) {
    case 0: // Long Flowing Locks
      return [
        `<path d="M60 90 C45 130 50 180 52 256 L204 256 C206 180 211 130 196 90 C186 50 150 35 128 35 C106 35 70 50 60 90 Z" fill="${p.shadow}"/>`,
        `<path d="M50 120 C42 165 48 215 50 256 L86 256 C80 200 75 155 70 120 Z" fill="${p.main}"/>`,
        `<path d="M206 120 C214 165 208 215 206 256 L170 256 C176 200 181 155 186 120 Z" fill="${p.main}"/>`,
      ].join('');
    case 1: // Layered Anime Bob
      return [
        `<path d="M64 90 C54 130 64 168 76 185 L180 185 C192 168 202 130 192 90 C182 50 150 35 128 35 C106 35 74 50 64 90 Z" fill="${p.shadow}"/>`,
      ].join('');
    case 2: // High Anime Ponytail
      return [
        `<path d="M70 90 C62 130 76 170 90 180 L166 180 C180 170 194 130 186 90 C178 50 150 35 128 35 C106 35 78 50 70 90 Z" fill="${p.shadow}"/>`,
        // High ponytail plume swooping to the side
        `<path d="M148 42 C168 22 208 28 224 55 C236 78 238 120 228 170 C220 128 214 85 198 62 C184 45 162 44 148 42 Z" fill="${p.main}"/>`,
        `<path d="M198 62 C214 85 220 128 228 170 C218 135 210 98 194 70 Z" fill="${p.shadow}"/>`,
      ].join('');
    case 3: // Sleek Hime Cut
      return [
        `<path d="M58 90 C50 135 52 190 54 256 L202 256 C204 190 206 135 198 90 C188 50 150 35 128 35 C106 35 68 50 58 90 Z" fill="${p.shadow}"/>`,
        `<path d="M54 130 L48 256 L78 256 L84 130 Z" fill="${p.main}"/>`,
        `<path d="M202 130 L208 256 L178 256 L172 130 Z" fill="${p.main}"/>`,
      ].join('');
    case 4: // Messy Anime Shag
      return [
        `<path d="M60 90 C48 125 58 160 68 190 L188 190 C198 160 208 125 196 90 C186 50 150 35 128 35 C106 35 70 50 60 90 Z" fill="${p.shadow}"/>`,
        `<polygon points="56,110 42,135 66,138" fill="${p.main}"/>`,
        `<polygon points="52,145 36,172 68,170" fill="${p.main}"/>`,
        `<polygon points="200,110 214,135 190,138" fill="${p.main}"/>`,
        `<polygon points="204,145 220,172 188,170" fill="${p.main}"/>`,
      ].join('');
    case 5: // Twin Anime Tails
      return [
        `<path d="M70 90 C62 125 76 165 90 178 L166 178 C180 165 194 125 186 90 C178 50 150 35 128 35 C106 35 78 50 70 90 Z" fill="${p.shadow}"/>`,
        // Left pigtail
        `<path d="M72 70 C52 75 36 98 32 130 C28 165 32 205 38 245 C42 200 46 160 54 125 C58 105 64 88 72 70 Z" fill="${p.main}"/>`,
        // Right pigtail
        `<path d="M184 70 C204 75 220 98 224 130 C228 165 224 205 218 245 C214 200 210 160 202 125 C198 105 192 88 184 70 Z" fill="${p.main}"/>`,
      ].join('');
    case 6: // Wavy Shoulder Cut
      return [
        `<path d="M58 90 C45 130 48 180 56 225 L200 225 C208 180 211 130 198 90 C188 50 150 35 128 35 C106 35 68 50 58 90 Z" fill="${p.shadow}"/>`,
        `<path d="M52 140 C44 170 54 195 62 225 L88 225 C78 190 74 165 72 140 Z" fill="${p.main}"/>`,
        `<path d="M204 140 C212 170 202 195 194 225 L168 225 C178 190 182 165 184 140 Z" fill="${p.main}"/>`,
      ].join('');
    case 7: // Pixie Undercut
    default:
      return [
        `<path d="M68 90 C60 120 72 150 86 162 L170 162 C184 150 196 120 188 90 C178 50 150 35 128 35 C106 35 78 50 68 90 Z" fill="${p.shadow}"/>`,
      ].join('');
  }
}

function renderOutfit(index: number): string {
  switch (index) {
    case 0: // Scientist Lab Coat & Sweater (Prompt reference)
      return [
        // Inner blue V-neck knit sweater
        '<polygon points="128,218 96,182 160,182" fill="#1D4ED8"/>',
        '<path d="M102 182 L128 214 L154 182" stroke="#172554" stroke-width="3.5" fill="none"/>',
        '<path d="M108 182 L128 208 L148 182" stroke="#2563EB" stroke-width="2" fill="none"/>',
        // White shirt collar
        '<polygon points="128,188 120,182 136,182" fill="#FFFFFF"/>',
        // Crisp white open lab coat shoulders & body
        '<path d="M30 256 L64 186 C78 180 88 182 98 184 L108 256 Z" fill="#FFFFFF"/>',
        '<path d="M226 256 L192 186 C178 180 168 182 158 184 L148 256 Z" fill="#F8FAFC"/>',
        // Wide lapels
        '<polygon points="98,184 76,212 112,228 108,184" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5"/>',
        '<polygon points="158,184 180,212 144,228 148,184" fill="#F1F5F9" stroke="#E2E8F0" stroke-width="1.5"/>',
      ].join('');
    case 1: // High-Collar Cyber Trench
      return [
        '<path d="M32 256 L64 184 L100 176 L112 256 Z" fill="#18181B"/>',
        '<path d="M224 256 L192 184 L156 176 L144 256 Z" fill="#27272A"/>',
        // High stand collar
        '<path d="M96 178 L104 154 L128 164 L128 256" stroke="#38BDF8" stroke-width="2" fill="#18181B"/>',
        '<path d="M160 178 L152 154 L128 164 L128 256" stroke="#38BDF8" stroke-width="2" fill="#27272A"/>',
        '<polygon points="128,168 120,186 136,186" fill="#0284C7"/>',
      ].join('');
    case 2: // Academy Uniform Blazer
      return [
        '<polygon points="128,220 106,182 150,182" fill="#FFFFFF"/>',
        // Red tie
        '<polygon points="125,185 131,185 133,224 128,230 123,224" fill="#DC2626"/>',
        // Navy blazer
        '<path d="M32 256 L64 186 L104 184 L110 256 Z" fill="#1E3A8A"/>',
        '<path d="M224 256 L192 186 L152 184 L146 256 Z" fill="#172554"/>',
        '<polygon points="104,184 84,215 116,230 110,184" fill="#1E3A8A" stroke="#172554" stroke-width="1.5"/>',
        '<polygon points="152,184 172,215 140,230 146,184" fill="#172554" stroke="#1E3A8A" stroke-width="1.5"/>',
      ].join('');
    case 3: // Streetwear Cyber Hoodie
      return [
        '<path d="M32 256 L66 186 C82 178 174 178 190 186 L224 256 Z" fill="#27272A"/>',
        // Thick bunched cowl collar
        '<path d="M88 178 C104 196 152 196 168 178 C174 194 158 208 128 208 C98 208 82 194 88 178 Z" fill="#3F3F46"/>',
        // Drawstrings
        '<line x1="114" y1="204" x2="114" y2="236" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
        '<line x1="142" y1="204" x2="142" y2="232" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
      ].join('');
    case 4: // Scholar Academic Robe
      return [
        '<path d="M32 256 L66 185 C84 176 172 176 190 185 L224 256 Z" fill="#0F172A"/>',
        // Golden velvet stole
        '<path d="M96 178 L90 256 L114 256 L118 188 Z" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<path d="M160 178 L166 256 L142 256 L138 188 Z" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<polygon points="128,186 122,198 134,198" fill="#F8FAFC"/>',
      ].join('');
    case 5: // Ribbed Knit Turtleneck
      return [
        '<path d="M34 256 L68 188 C84 180 172 180 188 188 L222 256 Z" fill="#18181B"/>',
        // Turtleneck collar folds
        '<rect x="108" y="166" width="40" height="24" rx="6" fill="#27272A" stroke="#18181B" stroke-width="1.5"/>',
        '<line x1="112" y1="174" x2="144" y2="174" stroke="#3F3F46" stroke-width="1.5"/>',
        '<line x1="112" y1="182" x2="144" y2="182" stroke="#3F3F46" stroke-width="1.5"/>',
      ].join('');
    case 6: // Astronaut Flight Suit
      return [
        '<path d="M32 256 L66 185 C84 174 172 174 190 185 L224 256 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2"/>',
        '<line x1="128" y1="184" x2="128" y2="256" stroke="#64748B" stroke-width="3"/>',
        '<rect x="78" y="208" width="22" height="20" rx="3" fill="#1E293B"/>',
        '<circle cx="89" cy="218" r="4" fill="#38BDF8"/>',
      ].join('');
    case 7: // Varsity Letterman Jacket
    default:
      return [
        '<path d="M34 256 L68 186 L78 196 L70 256 Z" fill="#F1F5F9"/>',
        '<path d="M222 256 L188 186 L178 196 L186 256 Z" fill="#F1F5F9"/>',
        '<path d="M70 256 L78 196 C92 180 164 180 178 196 L186 256 Z" fill="#1E3A8A"/>',
        '<path d="M86 182 C104 194 152 194 170 182" stroke="#F59E0B" stroke-width="5" stroke-linecap="round" fill="none"/>',
        '<text x="96" y="222" font-family="sans-serif" font-weight="900" font-size="16" fill="#F59E0B">M</text>',
      ].join('');
  }
}

function renderAccessory(index: number): string {
  switch (index) {
    case 0: // Gold Star Necklace & Hoop (Reference image)
      return [
        '<path d="M116 166 Q128 196 140 166" fill="none" stroke="#F59E0B" stroke-width="1.5"/>',
        '<polygon points="128,193 130.5,198 136,199 132,203 133,208.5 128,206 123,208.5 124,203 120,199 125.5,198" fill="#FBBF24" stroke="#D97706" stroke-width="0.75"/>',
        // Gold hoop earring on right ear
        '<ellipse cx="178" cy="126" rx="5" ry="11" fill="none" stroke="#F59E0B" stroke-width="2.2"/>',
      ].join('');
    case 1: // Blue Diamond Crystal Pendant
      return [
        '<path d="M118 166 Q128 194 138 166" fill="none" stroke="#CBD5E1" stroke-width="1.2"/>',
        '<polygon points="128,192 136,199 128,211 120,199" fill="#38BDF8" stroke="#0284C7" stroke-width="1"/>',
        '<line x1="128" y1="192" x2="128" y2="211" stroke="#E0F2FE" stroke-width="0.8"/>',
        '<ellipse cx="178" cy="126" rx="4" ry="4" fill="#38BDF8" stroke="#0284C7" stroke-width="1"/>',
      ].join('');
    case 2: // Padlock Chain Choker
      return [
        '<path d="M112 162 C116 172 140 172 144 162" fill="none" stroke="#94A3B8" stroke-width="3" stroke-dasharray="4 2"/>',
        '<rect x="124" y="168" width="8" height="9" rx="1.5" fill="#CBD5E1" stroke="#64748B" stroke-width="1"/>',
        '<path d="M126 168 L126 165 C126 163 130 163 130 165 L130 168" stroke="#64748B" stroke-width="1.2" fill="none"/>',
      ].join('');
    case 3: // Cyber Barcode Neck Tattoo
      return [
        '<g opacity="0.6">',
        '<line x1="118" y1="152" x2="118" y2="162" stroke="#00F0FF" stroke-width="1"/>',
        '<line x1="120" y1="152" x2="120" y2="162" stroke="#00F0FF" stroke-width="2"/>',
        '<line x1="123" y1="152" x2="123" y2="162" stroke="#00F0FF" stroke-width="1"/>',
        '<line x1="125" y1="152" x2="125" y2="162" stroke="#00F0FF" stroke-width="1.5"/>',
        '</g>',
      ].join('');
    case 4: // Gold Medallion & Ear Cuff
      return [
        '<path d="M116 166 Q128 198 140 166" fill="none" stroke="#F59E0B" stroke-width="2"/>',
        '<circle cx="128" cy="202" r="7" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/>',
        '<polygon points="128,198 131,201 128,206 125,201" fill="#FEF08A"/>',
        // Double ear cuff
        '<line x1="174" y1="106" x2="180" y2="106" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>',
        '<line x1="174" y1="112" x2="180" y2="112" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>',
      ].join('');
    case 5: // Academy Research ID Lanyard
      return [
        '<path d="M112 165 L128 196 L144 165" stroke="#7C3AED" stroke-width="3" fill="none" stroke-linecap="round"/>',
        '<rect x="120" y="198" width="16" height="22" rx="2" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>',
        '<rect x="121" y="199" width="14" height="5" fill="#5168FF"/>',
      ].join('');
    case 6: // Pearl Choker & Pearl Stud
      return [
        '<path d="M114 164 C120 172 136 172 142 164" fill="none" stroke="#F8FAFC" stroke-width="4" stroke-dasharray="4 4" stroke-linecap="round"/>',
        '<circle cx="178" cy="122" r="3" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1"/>',
      ].join('');
    case 7: // Key Pendant & Safety Pin
    default:
      return [
        '<path d="M118 166 Q128 194 138 166" fill="none" stroke="#94A3B8" stroke-width="1.2"/>',
        '<circle cx="128" cy="195" r="3.5" fill="none" stroke="#CBD5E1" stroke-width="1.2"/>',
        '<line x1="128" y1="198" x2="128" y2="208" stroke="#CBD5E1" stroke-width="1.5"/>',
        '<line x1="128" y1="204" x2="132" y2="204" stroke="#CBD5E1" stroke-width="1.2"/>',
        '<line x1="128" y1="207" x2="131" y2="207" stroke="#CBD5E1" stroke-width="1.2"/>',
      ].join('');
  }
}

function renderHeadset(index: number): string {
  switch (index) {
    case 0: // Academy Mecha Ear-Unit (Reference image match!)
      return [
        '<g id="mecha-headset">',
        // White angular chassis plate
        '<path d="M164 64 L186 58 L192 88 L182 94 L170 88 L164 76 Z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>',
        // Gold screw pin
        '<circle cx="176" cy="68" r="2.5" fill="#FBBF24"/>',
        // Orange 'U' Emblem
        '<path d="M174 76 L174 83 L180 83 L180 76" stroke="#EA580C" stroke-width="2.5" fill="none" stroke-linecap="square"/>',
        // Upper-right ring
        '<circle cx="187" cy="92" r="6.5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>',
        '<circle cx="187" cy="92" r="4.5" fill="#F59E0B"/>',
        // Main ear ring disc
        '<circle cx="176" cy="106" r="13" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2"/>',
        '<circle cx="176" cy="106" r="9" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<circle cx="176" cy="106" r="6" fill="#FBBF24"/>',
        '</g>',
      ].join('');
    case 1: // Cyber Comms Boom Mic
      return [
        '<g id="boom-headset">',
        '<circle cx="176" cy="106" r="12" fill="#1E293B" stroke="#38BDF8" stroke-width="2"/>',
        '<circle cx="176" cy="106" r="6" fill="#38BDF8"/>',
        '<path d="M172 110 C165 125 145 135 132 135" stroke="#94A3B8" stroke-width="2" fill="none" stroke-linecap="round"/>',
        '<rect x="126" y="132" width="7" height="5" rx="1.5" fill="#00F0FF"/>',
        '</g>',
      ].join('');
    case 2: // Pointed Cyber Elf Ear
      return [
        '<g id="cyber-elf-ear">',
        '<polygon points="172,98 200,90 174,122" fill="#F8B185"/>',
        '<polygon points="173,101 192,94 174,118" fill="#E89668"/>',
        '<path d="M185 92 L199 90 L188 104" stroke="#F59E0B" stroke-width="2" fill="none"/>',
        '</g>',
      ].join('');
    case 3: // Floating Halo Emitter
      return [
        '<g id="halo-emitter">',
        '<ellipse cx="178" cy="80" rx="14" ry="6" fill="none" stroke="#FBBF24" stroke-width="2.5" transform="rotate(-20 178 80)"/>',
        '<ellipse cx="178" cy="80" rx="14" ry="6" fill="none" stroke="#FFFBEB" stroke-width="1" transform="rotate(-20 178 80)"/>',
        '<circle cx="174" cy="98" r="4" fill="#334155"/>',
      ].join('');
    case 4: // Tactical Visor Clip
      return [
        '<g id="tactical-clip">',
        '<path d="M162 90 L186 92 L188 106 L174 110 Z" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>',
        '<circle cx="180" cy="100" r="3" fill="#EF4444"/>',
        '<line x1="164" y1="92" x2="152" y2="92" stroke="#EF4444" stroke-width="1.5"/>',
        '</g>',
      ].join('');
    case 5: // Studio DJ Monitor Pod
      return [
        '<g id="dj-pod">',
        '<circle cx="176" cy="106" r="15" fill="#FFFFFF" stroke="#94A3B8" stroke-width="2"/>',
        '<circle cx="176" cy="106" r="11" fill="#0F172A"/>',
        '<circle cx="176" cy="106" r="7" fill="#F59E0B"/>',
        '</g>',
      ].join('');
    case 6: // Neural Interface Socket
      return [
        '<g id="neural-socket">',
        '<circle cx="174" cy="98" r="8" fill="#1E293B" stroke="#64748B" stroke-width="1.5"/>',
        '<circle cx="174" cy="98" r="4" fill="#00F0FF"/>',
        '<line x1="174" y1="84" x2="174" y2="90" stroke="#00F0FF" stroke-width="1.5"/>',
        '</g>',
      ].join('');
    case 7: // Cat-Ear Frequency Sensor
    default:
      return [
        '<g id="cat-ear-sensor">',
        '<polygon points="166,66 182,36 188,72" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>',
        '<polygon points="170,64 180,44 184,68" fill="#00F0FF"/>',
        '</g>',
      ].join('');
  }
}

function renderFrontHair(styleIdx: number, colorIdx: number): string {
  const p = HAIR_PALETTES[colorIdx];

  switch (styleIdx) {
    case 0: // Long Flowing Locks (Reference style)
      return [
        // Left side sweeping lock
        `<path d="M72 82 C68 118 78 142 86 162 C88 142 82 122 80 95 C86 108 94 120 102 128 C96 112 92 98 90 82 Z" fill="${p.main}"/>`,
        // Top skull cap & parted fringe
        `<path d="M128 35 C110 35 90 42 78 56 C74 62 70 70 68 80 C74 72 82 66 94 62 C104 60 114 62 120 68 C126 62 134 58 146 58 C158 58 166 64 172 72 C174 60 166 48 156 42 C146 36 138 35 128 35 Z" fill="${p.main}"/>`,
        // Center curtain bangs
        `<path d="M128 45 C122 55 110 68 102 84 C100 94 98 106 96 118 C100 106 106 94 114 84 C118 80 124 74 130 70 Z" fill="${p.shadow}"/>`,
        `<path d="M132 46 C136 60 140 74 142 90 C143 96 142 104 140 112 C144 100 148 88 150 74 C152 64 150 54 146 48 Z" fill="${p.main}"/>`,
        // Forehead highlight arc
        `<path d="M96 58 C108 52 124 52 136 58 C144 62 152 70 156 78 C150 72 142 68 132 66 C122 64 110 66 102 72 Z" fill="${p.highlight}" opacity="0.6"/>`,
        // Right side framing lock
        `<path d="M178 78 C182 98 184 122 188 148 C184 136 182 118 180 98 Z" fill="${p.shadow}"/>`,
      ].join('');
    case 1: // Layered Anime Bob
      return [
        `<path d="M128 35 C108 35 88 44 76 60 C70 70 66 85 66 105 C74 95 84 88 96 82 C104 88 116 92 128 92 C140 92 152 88 160 82 C172 88 182 95 190 105 C190 85 186 70 180 60 C168 44 148 35 128 35 Z" fill="${p.main}"/>`,
        // Cheek framing strands
        `<path d="M72 90 C70 120 78 145 88 165 C88 145 82 125 80 100 Z" fill="${p.shadow}"/>`,
        `<path d="M184 90 C186 120 178 145 168 165 C168 145 174 125 176 100 Z" fill="${p.shadow}"/>`,
        `<path d="M100 55 C116 50 140 50 156 55 C150 64 142 68 128 68 C114 68 106 64 100 55 Z" fill="${p.highlight}" opacity="0.5"/>`,
      ].join('');
    case 2: // High Ponytail Bangs
      return [
        `<path d="M128 35 C108 35 88 44 76 60 C72 75 72 95 76 115 C82 98 92 88 104 84 C112 90 120 92 128 92 C136 92 144 90 152 84 C164 88 174 98 180 115 C184 95 184 75 180 60 C168 44 148 35 128 35 Z" fill="${p.main}"/>`,
        // Wispy curtain bangs
        `<path d="M124 50 L112 92 L120 90 L128 50 Z" fill="${p.shadow}"/>`,
        `<path d="M132 50 L144 92 L136 90 L128 50 Z" fill="${p.main}"/>`,
      ].join('');
    case 3: // Sleek Hime Cut Bangs
      return [
        `<path d="M128 35 C106 35 84 45 74 65 C70 75 68 90 68 108 L188 108 C188 90 186 75 182 65 C172 45 150 35 128 35 Z" fill="${p.main}"/>`,
        // Blunt straight brow fringe
        `<rect x="90" y="74" width="76" height="14" rx="2" fill="${p.shadow}"/>`,
        // Straight sidelocks
        `<rect x="74" y="90" width="12" height="65" rx="3" fill="${p.main}"/>`,
        `<rect x="170" y="90" width="12" height="65" rx="3" fill="${p.main}"/>`,
      ].join('');
    case 4: // Messy Anime Shag Bangs
      return [
        `<path d="M128 35 C108 35 88 44 74 62 C70 72 68 86 68 100 C76 92 86 86 98 84 C104 90 116 94 128 94 C140 94 152 90 158 84 C170 86 180 92 188 100 C188 86 186 72 182 62 C168 44 148 35 128 35 Z" fill="${p.main}"/>`,
        `<polygon points="106,55 96,96 112,86" fill="${p.shadow}"/>`,
        `<polygon points="126,52 120,102 134,88" fill="${p.main}"/>`,
        `<polygon points="146,55 156,96 140,86" fill="${p.shadow}"/>`,
      ].join('');
    case 5: // Twin Tails Bangs
      return [
        `<path d="M128 35 C108 35 86 44 76 62 C72 74 70 88 70 104 C78 94 88 88 102 84 C112 90 120 92 128 92 C136 92 144 90 154 84 C168 88 178 94 186 104 C186 88 184 74 180 62 C170 44 148 35 128 35 Z" fill="${p.main}"/>`,
        `<path d="M128 45 L114 86 L124 84 Z" fill="${p.shadow}"/>`,
        `<path d="M128 45 L142 86 L132 84 Z" fill="${p.main}"/>`,
      ].join('');
    case 6: // Wavy Shoulder Cut Bangs
      return [
        `<path d="M128 35 C106 35 86 44 74 62 C68 74 66 90 66 106 C76 96 88 90 102 86 C112 92 120 94 128 94 C136 94 144 92 154 86 C168 90 180 96 190 106 C190 90 188 74 182 62 C170 44 150 35 128 35 Z" fill="${p.main}"/>`,
        `<path d="M72 88 C70 115 76 138 84 156 C84 138 80 120 78 98 Z" fill="${p.main}"/>`,
        `<path d="M184 88 C186 115 180 138 172 156 C172 138 176 120 178 98 Z" fill="${p.main}"/>`,
      ].join('');
    case 7: // Pixie Undercut Bangs
    default:
      return [
        `<path d="M128 35 C106 35 86 44 74 62 C68 74 66 90 66 106 C76 96 88 90 102 86 C112 92 120 94 128 94 C140 94 152 92 164 86 C176 90 184 96 190 106 C190 90 188 74 182 62 C170 44 150 35 128 35 Z" fill="${p.main}"/>`,
        // Long swooping asymmetrical fringe
        `<path d="M96 52 C104 68 116 88 132 108 C136 100 136 90 134 78 Z" fill="${p.shadow}"/>`,
      ].join('');
  }
}

export function renderAxisAvatarSvg(seedOrParams: string | AxisAvatarParams): string {
  const params = typeof seedOrParams === 'string' ? getAxisAvatarParams(seedOrParams) : seedOrParams;
  const bgColor = BACKGROUND_COLORS[params.backgroundIndex] ?? BACKGROUND_COLORS[0];
  const skin = SKIN_PALETTES[params.skinToneIndex] ?? SKIN_PALETTES[1];
  const skinBase = skin.base;
  const skinShadow = skin.shadow;

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">',
    '<defs>',
    '<clipPath id="avatar-clip"><circle cx="128" cy="128" r="128"/></clipPath>',
    '</defs>',
    '<g clip-path="url(#avatar-clip)">',
    // 1. Background
    `<rect width="256" height="256" fill="${bgColor}"/>`,

    // 2. Back Hair
    renderBackHair(params.hairstyleIndex, params.hairColorIndex),

    // 3. Neck & Shadow
    `<path d="M110 145 L106 205 L150 205 L146 145 Z" fill="${skinShadow}"/>`,
    `<path d="M113 160 L110 205 L146 205 L143 160 Z" fill="${skinBase}"/>`,
    `<polygon points="128,178 122,164 134,164" fill="${skinShadow}" opacity="0.6"/>`,

    // 4. Outfit (Torso)
    renderOutfit(params.outfitIndex),

    // 5. Necklace / Collar Accessory
    renderAccessory(params.accessoryIndex),

    // 6. Head & Face Base
    `<path d="M82 98 C80 128 94 150 128 164 C162 150 176 128 174 98 C174 68 82 68 82 98 Z" fill="${skinBase}"/>`,
    `<path d="M82 98 C82 82 90 70 102 64 C90 74 84 88 84 98 C84 126 96 148 128 162 C114 152 82 128 82 98 Z" fill="${skinShadow}" opacity="0.3"/>`,

    // 7. Ears
    `<path d="M82 102 C75 106 74 116 83 124 Z" fill="${skinBase}"/>`,
    `<polygon points="172,100 196,92 174,120" fill="${skinBase}"/>`,
    `<polygon points="173,103 188,96 174,116" fill="${skinShadow}"/>`,

    // 8. Cyber Headset (Right Temple/Ear)
    renderHeadset(params.headsetIndex),

    // 9. THE PROMPT SIGNATURE BOT FACE: Parallel solid black capsules (3:1) and oval blushes
    '<rect x="100" y="90" width="11" height="33" rx="5.5" fill="#09090B"/>',
    '<rect x="145" y="90" width="11" height="33" rx="5.5" fill="#09090B"/>',
    '<ellipse cx="94" cy="116" rx="9" ry="4.5" fill="#F87171" opacity="0.65"/>',
    '<ellipse cx="162" cy="116" rx="9" ry="4.5" fill="#F87171" opacity="0.65"/>',

    // 10. Front Hair (Bangs & Framing Strands)
    renderFrontHair(params.hairstyleIndex, params.hairColorIndex),
    '</g>',

    // Outer subtle border
    '<circle cx="128" cy="128" r="127" stroke="rgba(255,255,255,0.12)" stroke-width="2" fill="none"/>',
    '</svg>',
  ].join('');
}

export function buildAxisAvatarUrl(seed: string): string {
  return `${AVATAR_ROUTE}?seed=${encodeURIComponent(seed)}`;
}

/**
 * Converts stored DiceBear URLs during the rollout while leaving uploads,
 * Academic Angels, and already-migrated avatar URLs untouched.
 */
export function normalizeAvatarUrl(avatarUrl: string | null, fallbackSeed?: string): string | null {
  if (!avatarUrl) return fallbackSeed ? buildAxisAvatarUrl(fallbackSeed) : null;

  try {
    const url = new URL(avatarUrl, 'https://mentalwealthacademy.world');
    if (url.hostname !== DICEBEAR_HOST) return avatarUrl;
    const seed = url.searchParams.get('seed') || fallbackSeed;
    return seed ? buildAxisAvatarUrl(seed) : null;
  } catch {
    return avatarUrl;
  }
}
