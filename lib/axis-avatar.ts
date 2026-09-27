/**
 * Deterministic Grok-Bot Avatar Generator featuring 50 distinct traits
 * across 6 categories:
 * - 10 Backgrounds & Atmospheres
 * - 8 Head Chassis & Helmets
 * - 8 Visor Displays & Expressions
 * - 8 Antennas & Headgear
 * - 8 Outfits & Torso Suits
 * - 8 Badges, Neckwear & Accessories
 *
 * Total unique combinations: 10 * 8 * 8 * 8 * 8 * 8 = 327,680.
 * A deterministic seeded PRNG ensures the same seed always renders the exact same avatar.
 */

const AVATAR_ROUTE = '/api/avatars/render';
const DICEBEAR_HOST = 'api.dicebear.com';

export const BACKGROUND_TRAITS = [
  'Electric Blue Lab',
  'Cyber Matrix Grid',
  'Cosmic Nebula',
  'Synthwave Sunset',
  'Chalkboard Lab',
  'Terminal Phosphor',
  'Hologram Cyan',
  'Warm Sunrise',
  'Lavender Dream',
  'Clean Minimal Studio',
] as const;

export const CHASSIS_TRAITS = [
  'Classic CRT Monitor',
  'Astronaut Bubble Dome',
  'Sleek Cyber Pod',
  'Retro Handheld Gameboy',
  'Stealth Hexagon Helmet',
  'Plasma Orb Sphere',
  'Vintage 70s TV',
  'Chamfered Metallic Cube',
] as const;

export const VISOR_TRAITS = [
  'Happy Cyan LEDs',
  'Radiant Star Eyes',
  'Neon Heart Visor',
  'Cyber Scanner Beam',
  'Nerd Digital Glasses',
  'Playful Winking Smirk',
  'Zen Emerald Slits',
  'Matrix Cascade Stream',
] as const;

export const HEADGEAR_TRAITS = [
  'Spring Energy Orb',
  'Satellite Dish',
  'Mecha Cat Ears',
  'Golden Hologram Halo',
  'Studio DJ Headphones',
  'Tesla Electrodes',
  'Steampunk Goggles',
  'Propeller Beanie',
] as const;

export const OUTFIT_TRAITS = [
  'Scientist Lab Coat',
  'Astronaut Spacesuit',
  'Cyber Hoodie',
  'Scholar Academic Robe',
  'Varsity Letterman Jacket',
  'Stealth Mech Armor',
  'Formal Tuxedo',
  'Mechanic Boiler Suit',
] as const;

export const ACCESSORY_TRAITS = [
  'Diamond Credential Badge',
  'Arc Reactor Core',
  'Dapper Red Bowtie',
  'Cozy Striped Scarf',
  'Streetwear Gold Cuban Chain',
  'Binary Cyber Tie',
  'Research Fellow ID Lanyard',
  'High-Collar Cape Clasp',
] as const;

export interface AxisAvatarParams {
  backgroundIndex: number;
  chassisIndex: number;
  visorIndex: number;
  headgearIndex: number;
  outfitIndex: number;
  accessoryIndex: number;
  traits: {
    background: (typeof BACKGROUND_TRAITS)[number];
    chassis: (typeof CHASSIS_TRAITS)[number];
    visor: (typeof VISOR_TRAITS)[number];
    headgear: (typeof HEADGEAR_TRAITS)[number];
    outfit: (typeof OUTFIT_TRAITS)[number];
    accessory: (typeof ACCESSORY_TRAITS)[number];
  };
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
  const random = seededRandom(seed);

  const backgroundIndex = Math.floor(random() * BACKGROUND_TRAITS.length);
  const chassisIndex = Math.floor(random() * CHASSIS_TRAITS.length);
  const visorIndex = Math.floor(random() * VISOR_TRAITS.length);
  const headgearIndex = Math.floor(random() * HEADGEAR_TRAITS.length);
  const outfitIndex = Math.floor(random() * OUTFIT_TRAITS.length);
  const accessoryIndex = Math.floor(random() * ACCESSORY_TRAITS.length);

  return {
    backgroundIndex,
    chassisIndex,
    visorIndex,
    headgearIndex,
    outfitIndex,
    accessoryIndex,
    traits: {
      background: BACKGROUND_TRAITS[backgroundIndex],
      chassis: CHASSIS_TRAITS[chassisIndex],
      visor: VISOR_TRAITS[visorIndex],
      headgear: HEADGEAR_TRAITS[headgearIndex],
      outfit: OUTFIT_TRAITS[outfitIndex],
      accessory: ACCESSORY_TRAITS[accessoryIndex],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* SVG TRAIT RENDERERS                                                        */
/* -------------------------------------------------------------------------- */

function renderBackground(index: number): string {
  switch (index) {
    case 0: // Electric Blue Lab
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-0)"/>',
        '<circle cx="128" cy="128" r="112" stroke="#5168FF" stroke-opacity=".18" stroke-width="1.5" fill="none"/>',
        '<circle cx="128" cy="128" r="82" stroke="#5168FF" stroke-opacity=".12" stroke-width="1" stroke-dasharray="4 4" fill="none"/>',
        '<line x1="128" y1="12" x2="128" y2="244" stroke="#5168FF" stroke-opacity=".08" stroke-width="1"/>',
        '<line x1="12" y1="128" x2="244" y2="128" stroke="#5168FF" stroke-opacity=".08" stroke-width="1"/>',
      ].join('');
    case 1: // Cyber Matrix Grid
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-1)"/>',
        '<path d="M20 148 L236 148 M34 178 L222 178 M56 208 L200 208 M84 236 L172 236" stroke="#00F0FF" stroke-opacity=".15" stroke-width="1"/>',
        '<line x1="128" y1="140" x2="128" y2="256" stroke="#00F0FF" stroke-opacity=".2" stroke-width="1"/>',
        '<line x1="128" y1="140" x2="60" y2="256" stroke="#00F0FF" stroke-opacity=".16" stroke-width="1"/>',
        '<line x1="128" y1="140" x2="196" y2="256" stroke="#00F0FF" stroke-opacity=".16" stroke-width="1"/>',
        '<circle cx="80" cy="60" r="1.5" fill="#00F0FF" opacity=".6"/>',
        '<circle cx="178" cy="74" r="1" fill="#00F0FF" opacity=".5"/>',
        '<circle cx="50" cy="110" r="1.5" fill="#00F0FF" opacity=".4"/>',
      ].join('');
    case 2: // Cosmic Nebula
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-2)"/>',
        '<circle cx="70" cy="80" r="46" fill="#A855F7" opacity=".18" filter="url(#gb-blur)"/>',
        '<circle cx="180" cy="150" r="54" fill="#EC4899" opacity=".14" filter="url(#gb-blur)"/>',
        '<path d="M48 64 Q52 68 56 68 Q52 68 48 72 Q48 68 44 68 Q48 68 48 64 Z" fill="#FFF" opacity=".8"/>',
        '<path d="M204 76 Q207 79 210 79 Q207 79 204 82 Q204 79 201 79 Q204 79 204 76 Z" fill="#FFD700" opacity=".85"/>',
        '<path d="M58 140 Q60 142 62 142 Q60 142 58 144 Q58 142 56 142 Q58 142 58 140 Z" fill="#FFF" opacity=".7"/>',
        '<circle cx="172" cy="50" r="1.5" fill="#FFF" opacity=".6"/>',
        '<circle cx="214" cy="140" r="2" fill="#FFB8EB" opacity=".7"/>',
        '<circle cx="36" cy="100" r="1.2" fill="#E9D5FF" opacity=".5"/>',
      ].join('');
    case 3: // Synthwave Sunset
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-3)"/>',
        '<circle cx="128" cy="132" r="56" fill="url(#gb-sun)"/>',
        '<line x1="72" y1="124" x2="184" y2="124" stroke="#12040D" stroke-width="2.5"/>',
        '<line x1="78" y1="134" x2="178" y2="134" stroke="#12040D" stroke-width="3.5"/>',
        '<line x1="88" y1="146" x2="168" y2="146" stroke="#12040D" stroke-width="4.5"/>',
        '<line x1="20" y1="160" x2="236" y2="160" stroke="#00F0FF" stroke-opacity=".3" stroke-width="1.5"/>',
      ].join('');
    case 4: // Chalkboard Lab
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-4)"/>',
        '<circle cx="128" cy="128" r="102" stroke="#E2E8F0" stroke-opacity=".1" stroke-width="1" fill="none"/>',
        '<circle cx="128" cy="128" r="68" stroke="#E2E8F0" stroke-opacity=".08" stroke-width="1" stroke-dasharray="6 6" fill="none"/>',
        '<path d="M46 68 C70 44 110 52 130 74" stroke="#E2E8F0" stroke-opacity=".14" stroke-width="1.2" fill="none"/>',
        '<path d="M148 54 L170 54 M159 46 L159 62" stroke="#E2E8F0" stroke-opacity=".18" stroke-width="1.2"/>',
        '<path d="M42 160 L62 160 M52 152 L52 168" stroke="#E2E8F0" stroke-opacity=".15" stroke-width="1.2"/>',
        '<circle cx="198" cy="116" r="14" stroke="#E2E8F0" stroke-opacity=".12" stroke-width="1" fill="none"/>',
      ].join('');
    case 5: // Terminal Phosphor
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-5)"/>',
        '<rect x="24" y="24" width="208" height="208" fill="url(#gb-scanlines)" opacity=".22"/>',
        '<text x="46" y="58" font-family="monospace" font-size="7.5" fill="#22C55E" opacity=".42" letter-spacing="1.5">> GROK_OS v2.4</text>',
        '<text x="46" y="70" font-family="monospace" font-size="6.5" fill="#22C55E" opacity=".3" letter-spacing="1">> CORE: ONLINE</text>',
      ].join('');
    case 6: // Hologram Cyan
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-6)"/>',
        '<circle cx="128" cy="128" r="114" stroke="#38BDF8" stroke-opacity=".2" stroke-width="1.5" stroke-dasharray="12 6" fill="none"/>',
        '<circle cx="128" cy="128" r="88" stroke="#38BDF8" stroke-opacity=".15" stroke-width="1" fill="none"/>',
        '<circle cx="128" cy="128" r="50" stroke="#38BDF8" stroke-opacity=".18" stroke-width="1" stroke-dasharray="4 4" fill="none"/>',
        '<path d="M128 32 L128 44 M128 212 L128 224 M32 128 L44 128 M212 128 L224 128" stroke="#38BDF8" stroke-opacity=".35" stroke-width="1.5"/>',
      ].join('');
    case 7: // Warm Sunrise
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-7)"/>',
        '<circle cx="128" cy="110" r="70" fill="url(#gb-warm-sun)"/>',
        '<circle cx="68" cy="80" r="2.5" fill="#FDE047" opacity=".4"/>',
        '<circle cx="188" cy="70" r="2" fill="#FDE047" opacity=".5"/>',
        '<circle cx="210" cy="124" r="1.5" fill="#F97316" opacity=".5"/>',
      ].join('');
    case 8: // Lavender Dream
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-8)"/>',
        '<circle cx="64" cy="74" r="32" fill="#C084FC" opacity=".16" filter="url(#gb-blur)"/>',
        '<circle cx="192" cy="94" r="38" fill="#F472B6" opacity=".14" filter="url(#gb-blur)"/>',
        '<circle cx="128" cy="174" r="44" fill="#818CF8" opacity=".16" filter="url(#gb-blur)"/>',
        '<circle cx="78" cy="62" r="3" fill="#DDD6FE" opacity=".7"/>',
        '<circle cx="178" cy="82" r="2.5" fill="#DDD6FE" opacity=".65"/>',
        '<circle cx="54" cy="126" r="2" fill="#FBCFE8" opacity=".6"/>',
      ].join('');
    case 9: // Clean Minimal Studio
    default:
      return [
        '<circle cx="128" cy="128" r="128" fill="url(#gb-bg-9)"/>',
        '<circle cx="128" cy="128" r="120" stroke="#94A3B8" stroke-opacity=".2" stroke-width="1.5" fill="none"/>',
        '<circle cx="128" cy="128" r="92" stroke="#94A3B8" stroke-opacity=".12" stroke-width="1" stroke-dasharray="3 3" fill="none"/>',
        '<path d="M48 64 L56 64 M52 60 L52 68" stroke="#64748B" stroke-opacity=".3" stroke-width="1.2"/>',
        '<path d="M200 68 L208 68 M204 64 L204 72" stroke="#64748B" stroke-opacity=".3" stroke-width="1.2"/>',
      ].join('');
  }
}

function renderHeadgearBack(index: number): string {
  switch (index) {
    case 1: // Satellite Dish
      return [
        '<g>',
        '<line x1="128" y1="68" x2="148" y2="42" stroke="#64748B" stroke-width="4" stroke-linecap="round"/>',
        '<path d="M134 26 C146 16 166 32 172 44" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round" fill="none"/>',
        '<circle cx="153" cy="35" r="4" fill="#0284C7"/>',
        '<path d="M164 22 A14 14 0 0 1 178 36" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/>',
        '<path d="M172 16 A24 24 0 0 1 188 36" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/>',
        '</g>',
      ].join('');
    case 3: // Golden Hologram Halo
      return [
        '<g filter="url(#gb-glow)">',
        '<ellipse cx="128" cy="46" rx="46" ry="12" fill="none" stroke="#FBBF24" stroke-width="4.5" opacity=".85"/>',
        '<ellipse cx="128" cy="46" rx="46" ry="12" fill="none" stroke="#FFFBEB" stroke-width="1.8"/>',
        '</g>',
        '<line x1="104" y1="52" x2="112" y2="68" stroke="#FDE68A" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>',
        '<line x1="152" y1="52" x2="144" y2="68" stroke="#FDE68A" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>',
      ].join('');
    case 4: // Studio DJ Headphones Band
      return [
        '<path d="M66 108 C66 42 190 42 190 108" stroke="#1E293B" stroke-width="8" stroke-linecap="round" fill="none"/>',
        '<path d="M78 94 C78 54 178 54 178 94" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/>',
      ].join('');
    case 5: // Tesla Electrodes Back
      return [
        '<g>',
        '<line x1="68" y1="66" x2="68" y2="44" stroke="#94A3B8" stroke-width="3.5" stroke-linecap="round"/>',
        '<ellipse cx="68" cy="44" rx="8" ry="4" fill="#D97706" stroke="#B45309" stroke-width="1.5"/>',
        '<circle cx="68" cy="38" r="6" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<line x1="188" y1="66" x2="188" y2="44" stroke="#94A3B8" stroke-width="3.5" stroke-linecap="round"/>',
        '<ellipse cx="188" cy="44" rx="8" ry="4" fill="#D97706" stroke="#B45309" stroke-width="1.5"/>',
        '<circle cx="188" cy="38" r="6" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<path d="M72 38 L94 32 L110 42 L128 34 L146 43 L164 33 L184 38" stroke="#38BDF8" stroke-width="2.5" fill="none" filter="url(#gb-glow)"/>',
        '<path d="M72 38 L94 32 L110 42 L128 34 L146 43 L164 33 L184 38" stroke="#FFFFFF" stroke-width="1" fill="none"/>',
        '</g>',
      ].join('');
    default:
      return '';
  }
}

function renderOutfit(index: number): string {
  // Common neck joint connecting body to head
  const neck = [
    '<rect x="114" y="146" width="28" height="24" rx="4" fill="#334155" stroke="#1E293B" stroke-width="1.5"/>',
    '<line x1="116" y1="154" x2="140" y2="154" stroke="#475569" stroke-width="2"/>',
    '<line x1="116" y1="160" x2="140" y2="160" stroke="#475569" stroke-width="2"/>',
  ].join('');

  let outfitBody = '';
  switch (index) {
    case 0: // Scientist Lab Coat
      outfitBody = [
        '<path d="M44 256 L68 174 C86 162 170 162 188 174 L212 256 Z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2.5"/>',
        '<polygon points="128,172 108,206 148,206" fill="#0284C7"/>',
        '<path d="M108 172 L128 206 L148 172" stroke="#E2E8F0" stroke-width="2" fill="none"/>',
        '<path d="M68 174 L108 206 L96 256" stroke="#94A3B8" stroke-width="2" fill="#FFFFFF"/>',
        '<path d="M188 174 L148 206 L160 256" stroke="#94A3B8" stroke-width="2" fill="#F1F5F9"/>',
        '<line x1="128" y1="206" x2="128" y2="256" stroke="#CBD5E1" stroke-width="2"/>',
        '<rect x="76" y="210" width="22" height="24" rx="3" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1.5"/>',
        '<rect x="80" y="202" width="3.5" height="12" rx="1.5" fill="#2563EB"/>',
        '<rect x="86" y="204" width="3.5" height="10" rx="1.5" fill="#DC2626"/>',
      ].join('');
      break;
    case 1: // Astronaut Spacesuit
      outfitBody = [
        '<path d="M42 256 L66 172 C84 160 172 160 190 172 L214 256 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="2.5"/>',
        '<path d="M50 200 L68 184 M46 220 L62 208 M44 240 L60 228" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>',
        '<path d="M206 200 L188 184 M210 220 L194 208 M212 240 L196 228" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>',
        '<rect x="104" y="186" width="48" height="42" rx="6" fill="#1E293B" stroke="#475569" stroke-width="2"/>',
        '<circle cx="118" cy="200" r="5" fill="#38BDF8"/>',
        '<circle cx="138" cy="200" r="5" fill="#22C55E"/>',
        '<line x1="112" y1="216" x2="144" y2="216" stroke="#64748B" stroke-width="2.5" stroke-linecap="round"/>',
        '<circle cx="82" cy="188" r="9" fill="#1D4ED8" stroke="#93C5FD" stroke-width="1.5"/>',
        '<path d="M78 188 L86 188 M82 184 L82 192" stroke="#FFF" stroke-width="1.5"/>',
      ].join('');
      break;
    case 2: // Cyber Hoodie
      outfitBody = [
        '<path d="M44 256 L68 174 C86 164 170 164 188 174 L212 256 Z" fill="#18181B" stroke="#27272A" stroke-width="2"/>',
        '<path d="M84 166 C102 182 154 182 172 166 C182 190 156 202 128 202 C100 202 74 190 84 166 Z" fill="#27272A" stroke="#3F3F46" stroke-width="1.5"/>',
        '<circle cx="114" cy="192" r="3" fill="#00F0FF" filter="url(#gb-glow)"/>',
        '<circle cx="142" cy="192" r="3" fill="#00F0FF" filter="url(#gb-glow)"/>',
        '<line x1="114" y1="195" x2="114" y2="232" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
        '<line x1="142" y1="195" x2="142" y2="228" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
        '<rect x="112" y="230" width="4" height="6" rx="1.5" fill="#E2E8F0"/>',
        '<rect x="140" y="226" width="4" height="6" rx="1.5" fill="#E2E8F0"/>',
      ].join('');
      break;
    case 3: // Scholar Academic Robe
      outfitBody = [
        '<path d="M44 256 L68 172 C86 162 170 162 188 172 L212 256 Z" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>',
        '<polygon points="128,168 120,188 136,188" fill="#F8FAFC"/>',
        '<path d="M92 166 L86 256 L112 256 L114 178 Z" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<path d="M164 166 L170 256 L144 256 L142 178 Z" fill="#F59E0B" stroke="#D97706" stroke-width="1.5"/>',
        '<line x1="128" y1="188" x2="128" y2="256" stroke="#334155" stroke-width="2"/>',
      ].join('');
      break;
    case 4: // Varsity Letterman Jacket
      outfitBody = [
        '<path d="M44 256 L68 174 L78 184 L68 256 Z" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1.5"/>',
        '<path d="M212 256 L188 174 L178 184 L188 256 Z" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1.5"/>',
        '<path d="M68 256 L78 184 C92 168 164 168 178 184 L188 256 Z" fill="#1E3A8A" stroke="#172554" stroke-width="2"/>',
        '<path d="M86 174 C104 186 152 186 170 174" stroke="#F59E0B" stroke-width="5" stroke-linecap="round" fill="none"/>',
        '<path d="M86 174 C104 186 152 186 170 174" stroke="#FFF" stroke-width="1.5" stroke-linecap="round" fill="none"/>',
        '<line x1="128" y1="184" x2="128" y2="256" stroke="#172554" stroke-width="2"/>',
        '<circle cx="128" cy="196" r="3" fill="#E2E8F0"/>',
        '<circle cx="128" cy="214" r="3" fill="#E2E8F0"/>',
        '<circle cx="128" cy="232" r="3" fill="#E2E8F0"/>',
        '<text x="96" y="212" font-family="sans-serif" font-weight="900" font-size="17" fill="#F59E0B">M</text>',
      ].join('');
      break;
    case 5: // Stealth Mech Armor
      outfitBody = [
        '<path d="M44 256 L68 172 L128 184 L188 172 L212 256 Z" fill="#0F172A" stroke="#1E293B" stroke-width="2"/>',
        '<polygon points="128,184 94,196 98,256 128,256" fill="#1E293B"/>',
        '<polygon points="128,184 162,196 158,256 128,256" fill="#334155"/>',
        '<path d="M72 178 L104 192 L96 230 L64 216 Z" fill="#1E293B" stroke="#00F0FF" stroke-width="1.5"/>',
        '<path d="M184 178 L152 192 L160 230 L192 216 Z" fill="#1E293B" stroke="#00F0FF" stroke-width="1.5"/>',
        '<path d="M110 206 L128 214 L146 206" stroke="#00F0FF" stroke-width="2" fill="none" filter="url(#gb-glow)"/>',
      ].join('');
      break;
    case 6: // Formal Tuxedo
      outfitBody = [
        '<path d="M44 256 L68 172 C86 162 170 162 188 172 L212 256 Z" fill="#0A0A0A" stroke="#18181B" stroke-width="2"/>',
        '<polygon points="128,168 114,236 142,236" fill="#FFFFFF"/>',
        '<polygon points="68,172 114,236 94,256 44,256" fill="#18181B"/>',
        '<polygon points="188,172 142,236 162,256 212,256" fill="#18181B"/>',
        '<circle cx="128" cy="192" r="2" fill="#0A0A0A"/>',
        '<circle cx="128" cy="208" r="2" fill="#0A0A0A"/>',
        '<circle cx="128" cy="224" r="2" fill="#0A0A0A"/>',
      ].join('');
      break;
    case 7: // Mechanic Boiler Suit
    default:
      outfitBody = [
        '<path d="M44 256 L68 172 C86 162 170 162 188 172 L212 256 Z" fill="#1E40AF" stroke="#1D4ED8" stroke-width="2"/>',
        '<line x1="128" y1="170" x2="128" y2="256" stroke="#93C5FD" stroke-width="3" stroke-dasharray="3 2"/>',
        '<rect x="74" y="200" width="26" height="24" rx="3" fill="#1D4ED8" stroke="#3B82F6" stroke-width="1.5"/>',
        '<circle cx="87" cy="206" r="2" fill="#FBBF24"/>',
        '<rect x="156" y="200" width="26" height="24" rx="3" fill="#1D4ED8" stroke="#3B82F6" stroke-width="1.5"/>',
        '<circle cx="169" cy="206" r="2" fill="#FBBF24"/>',
        '<path d="M92 168 L108 190 M164 168 L148 190" stroke="#3B82F6" stroke-width="2"/>',
      ].join('');
      break;
  }

  return `<g id="gb-outfit">${neck}${outfitBody}</g>`;
}

function renderAccessory(index: number): string {
  switch (index) {
    case 0: // Diamond Credential Badge
      return [
        '<g filter="url(#gb-glow)">',
        '<polygon points="128,190 144,200 128,218 112,200" fill="#38BDF8" stroke="#0284C7" stroke-width="1.5"/>',
        '<line x1="128" y1="190" x2="128" y2="218" stroke="#E0F2FE" stroke-width="1"/>',
        '<line x1="112" y1="200" x2="144" y2="200" stroke="#E0F2FE" stroke-width="1"/>',
        '<circle cx="124" cy="196" r="1.5" fill="#FFFFFF"/>',
        '</g>',
      ].join('');
    case 1: // Arc Reactor Core
      return [
        '<g filter="url(#gb-glow)">',
        '<circle cx="128" cy="206" r="16" fill="#0F172A" stroke="#475569" stroke-width="2"/>',
        '<circle cx="128" cy="206" r="12" fill="#082F49" stroke="#00F0FF" stroke-width="1.8"/>',
        '<circle cx="128" cy="206" r="6" fill="#00F0FF"/>',
        '<circle cx="128" cy="206" r="3" fill="#FFFFFF"/>',
        '<line x1="116" y1="206" x2="140" y2="206" stroke="#00F0FF" stroke-width="1"/>',
        '<line x1="128" y1="194" x2="128" y2="218" stroke="#00F0FF" stroke-width="1"/>',
        '</g>',
      ].join('');
    case 2: // Dapper Red Bowtie
      return [
        '<g id="gb-bowtie">',
        '<polygon points="124,178 102,168 102,188" fill="#DC2626" stroke="#991B1B" stroke-width="1.5"/>',
        '<polygon points="132,178 154,168 154,188" fill="#DC2626" stroke="#991B1B" stroke-width="1.5"/>',
        '<rect x="123" y="173" width="10" height="10" rx="3" fill="#B91C1C"/>',
        '<line x1="108" y1="178" x2="120" y2="178" stroke="#F87171" stroke-width="1"/>',
        '<line x1="136" y1="178" x2="148" y2="178" stroke="#F87171" stroke-width="1"/>',
        '</g>',
      ].join('');
    case 3: // Cozy Striped Scarf
      return [
        '<g id="gb-scarf">',
        '<path d="M86 166 C104 182 152 182 170 166 C176 178 162 190 128 190 C94 190 80 178 86 166 Z" fill="#E11D48"/>',
        '<path d="M96 170 L102 182 M114 172 L120 186 M136 172 L142 186 M154 170 L160 182" stroke="#FDE047" stroke-width="3"/>',
        '<path d="M106 186 L104 230 L122 230 L120 188 Z" fill="#E11D48"/>',
        '<line x1="104" y1="202" x2="122" y2="202" stroke="#FDE047" stroke-width="3"/>',
        '<line x1="104" y1="218" x2="122" y2="218" stroke="#FDE047" stroke-width="3"/>',
        '<line x1="106" y1="230" x2="106" y2="236" stroke="#FDE047" stroke-width="2"/>',
        '<line x1="113" y1="230" x2="113" y2="236" stroke="#FDE047" stroke-width="2"/>',
        '<line x1="120" y1="230" x2="120" y2="236" stroke="#FDE047" stroke-width="2"/>',
        '</g>',
      ].join('');
    case 4: // Streetwear Gold Cuban Chain
      return [
        '<g id="gb-chain">',
        '<path d="M96 174 C108 208 148 208 160 174" stroke="#F59E0B" stroke-width="6" stroke-linecap="round" fill="none" stroke-dasharray="8 3"/>',
        '<path d="M96 174 C108 208 148 208 160 174" stroke="#FEF3C7" stroke-width="2" stroke-linecap="round" fill="none" stroke-dasharray="8 3"/>',
        '<circle cx="128" cy="208" r="11" fill="#F59E0B" stroke="#B45309" stroke-width="1.8"/>',
        '<polygon points="128,202 134,207 128,214 122,207" fill="#FEF08A"/>',
        '</g>',
      ].join('');
    case 5: // Binary Cyber Tie
      return [
        '<g id="gb-cybertie">',
        '<polygon points="123,168 133,168 131,175 125,175" fill="#0284C7"/>',
        '<polygon points="124,175 132,175 135,230 128,238 121,230" fill="#0C4A6E" stroke="#0284C7" stroke-width="1.5"/>',
        '<text x="128" y="190" font-family="monospace" font-size="7.5" fill="#38BDF8" text-anchor="middle" font-weight="bold">1</text>',
        '<text x="128" y="202" font-family="monospace" font-size="7.5" fill="#38BDF8" text-anchor="middle" font-weight="bold">0</text>',
        '<text x="128" y="214" font-family="monospace" font-size="7.5" fill="#38BDF8" text-anchor="middle" font-weight="bold">1</text>',
        '<text x="128" y="226" font-family="monospace" font-size="7.5" fill="#38BDF8" text-anchor="middle" font-weight="bold">0</text>',
        '</g>',
      ].join('');
    case 6: // Research Fellow ID Lanyard
      return [
        '<g id="gb-lanyard">',
        '<path d="M102 170 L128 202 L154 170" stroke="#7C3AED" stroke-width="4" stroke-linecap="round" fill="none"/>',
        '<rect x="125" y="200" width="6" height="5" rx="1.5" fill="#94A3B8"/>',
        '<rect x="114" y="205" width="28" height="36" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>',
        '<rect x="115" y="206" width="26" height="8" fill="#5168FF"/>',
        '<rect x="118" y="218" width="10" height="12" rx="2" fill="#E2E8F0"/>',
        '<line x1="132" y1="220" x2="139" y2="220" stroke="#94A3B8" stroke-width="1.5"/>',
        '<line x1="132" y1="225" x2="139" y2="225" stroke="#94A3B8" stroke-width="1.5"/>',
        '<line x1="117" y1="235" x2="139" y2="235" stroke="#475569" stroke-width="2" stroke-dasharray="2 1"/>',
        '</g>',
      ].join('');
    case 7: // High-Collar Cape Clasp
    default:
      return [
        '<g id="gb-capeclasp">',
        '<circle cx="110" cy="176" r="6" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/>',
        '<circle cx="146" cy="176" r="6" fill="#F59E0B" stroke="#B45309" stroke-width="1.5"/>',
        '<path d="M110 178 Q128 190 146 178" stroke="#F59E0B" stroke-width="2.5" fill="none"/>',
        '<path d="M112 181 Q128 194 144 181" stroke="#FDE68A" stroke-width="1.5" fill="none"/>',
        '<circle cx="110" cy="176" r="2.5" fill="#EF4444"/>',
        '<circle cx="146" cy="176" r="2.5" fill="#EF4444"/>',
        '</g>',
      ].join('');
  }
}

function renderChassis(index: number): string {
  switch (index) {
    case 0: // Classic CRT Monitor
      return [
        '<rect x="72" y="64" width="112" height="88" rx="22" fill="url(#gb-chassis-dark)" stroke="#475569" stroke-width="3"/>',
        '<rect x="82" y="72" width="92" height="72" rx="14" fill="#0F172A" stroke="#334155" stroke-width="2"/>',
        '<circle cx="78" cy="70" r="2.5" fill="#64748B"/>',
        '<circle cx="178" cy="70" r="2.5" fill="#64748B"/>',
        '<circle cx="78" cy="146" r="2.5" fill="#64748B"/>',
        '<circle cx="178" cy="146" r="2.5" fill="#64748B"/>',
      ].join('');
    case 1: // Astronaut Bubble Dome
      return [
        '<rect x="70" y="60" width="116" height="96" rx="46" fill="url(#gb-chassis-light)" stroke="#CBD5E1" stroke-width="3"/>',
        '<rect x="78" y="68" width="100" height="80" rx="38" fill="#0B132B"/>',
        '<rect x="62" y="100" width="10" height="18" rx="3" fill="#64748B"/>',
        '<rect x="184" y="100" width="10" height="18" rx="3" fill="#64748B"/>',
        '<path d="M88 82 A38 38 0 0 1 138 72" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".35"/>',
      ].join('');
    case 2: // Sleek Cyber Pod
      return [
        '<path d="M128 58 C180 58 188 95 184 135 C180 152 155 158 128 158 C101 158 76 152 72 135 C68 95 76 58 128 58 Z" fill="url(#gb-chassis-dark)" stroke="#38BDF8" stroke-width="2.5"/>',
        '<path d="M128 66 C168 66 174 96 170 130 C166 144 148 150 128 150 C108 150 90 144 86 130 C82 96 88 66 128 66 Z" fill="#030712"/>',
        '<line x1="68" y1="105" x2="74" y2="105" stroke="#38BDF8" stroke-width="2"/>',
        '<line x1="68" y1="112" x2="74" y2="112" stroke="#38BDF8" stroke-width="2"/>',
        '<line x1="182" y1="105" x2="188" y2="105" stroke="#38BDF8" stroke-width="2"/>',
        '<line x1="182" y1="112" x2="188" y2="112" stroke="#38BDF8" stroke-width="2"/>',
      ].join('');
    case 3: // Retro Handheld Gameboy
      return [
        '<rect x="74" y="62" width="108" height="92" rx="16" fill="url(#gb-chassis-gameboy)" stroke="#475569" stroke-width="3"/>',
        '<rect x="84" y="70" width="88" height="68" rx="8" fill="#1A202C" stroke="#2D3748" stroke-width="2"/>',
        '<circle cx="80" cy="78" r="3" fill="#EF4444" filter="url(#gb-glow)"/>',
        '<rect x="66" y="112" width="6" height="12" rx="2" fill="#334155"/>',
        '<rect x="184" y="106" width="6" height="8" rx="2" fill="#334155"/>',
        '<rect x="184" y="118" width="6" height="8" rx="2" fill="#334155"/>',
      ].join('');
    case 4: // Stealth Hexagon Helmet
      return [
        '<polygon points="128,56 186,76 188,134 128,160 68,134 70,76" fill="url(#gb-chassis-dark)" stroke="#10B981" stroke-width="2.5"/>',
        '<polygon points="128,66 176,82 178,126 128,148 78,126 80,82" fill="#050C0A"/>',
        '<line x1="128" y1="56" x2="128" y2="66" stroke="#10B981" stroke-width="2"/>',
        '<line x1="68" y1="134" x2="78" y2="126" stroke="#10B981" stroke-width="2"/>',
        '<line x1="188" y1="134" x2="178" y2="126" stroke="#10B981" stroke-width="2"/>',
      ].join('');
    case 5: // Plasma Orb Sphere
      return [
        '<circle cx="128" cy="108" r="50" fill="url(#gb-chassis-plasma)" stroke="#818CF8" stroke-width="2.5"/>',
        '<circle cx="128" cy="108" r="42" fill="#0A061C"/>',
        '<ellipse cx="128" cy="108" rx="54" ry="14" fill="none" stroke="#A78BFA" stroke-width="2" stroke-dasharray="8 4" opacity=".8"/>',
      ].join('');
    case 6: // Vintage 70s TV
      return [
        '<rect x="70" y="64" width="116" height="88" rx="20" fill="#582E14" stroke="#78350F" stroke-width="3.5"/>',
        '<rect x="78" y="72" width="80" height="72" rx="16" fill="#0C141F" stroke="#1E293B" stroke-width="2"/>',
        '<circle cx="171" cy="84" r="6" fill="#D97706" stroke="#92400E" stroke-width="1.5"/>',
        '<line x1="171" y1="80" x2="171" y2="84" stroke="#FFF" stroke-width="1.5"/>',
        '<circle cx="171" cy="104" r="6" fill="#D97706" stroke="#92400E" stroke-width="1.5"/>',
        '<line x1="171" y1="100" x2="171" y2="104" stroke="#FFF" stroke-width="1.5"/>',
        '<line x1="164" y1="126" x2="178" y2="126" stroke="#92400E" stroke-width="2"/>',
        '<line x1="164" y1="132" x2="178" y2="132" stroke="#92400E" stroke-width="2"/>',
      ].join('');
    case 7: // Chamfered Metallic Cube
    default:
      return [
        '<path d="M86 62 L170 62 L188 80 L188 136 L170 154 L86 154 L68 136 L68 80 Z" fill="url(#gb-chassis-cube)" stroke="#64748B" stroke-width="2.5"/>',
        '<path d="M92 70 L164 70 L178 84 L178 132 L164 146 L92 146 L78 132 L78 84 Z" fill="#020617"/>',
        '<polygon points="68,80 78,84 78,132 68,136" fill="#475569"/>',
        '<polygon points="188,80 178,84 178,132 188,136" fill="#334155"/>',
      ].join('');
  }
}

function renderVisor(index: number): string {
  switch (index) {
    case 0: // Happy Cyan LEDs
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<path d="M96 106 Q107 94 118 106" stroke="#00F0FF" stroke-width="5" stroke-linecap="round" fill="none"/>',
        '<path d="M138 106 Q149 94 160 106" stroke="#00F0FF" stroke-width="5" stroke-linecap="round" fill="none"/>',
        '<path d="M120 124 Q128 132 136 124" stroke="#00F0FF" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
        '<circle cx="91" cy="116" r="3.5" fill="#FF5398" opacity=".75"/>',
        '<circle cx="165" cy="116" r="3.5" fill="#FF5398" opacity=".75"/>',
        '</g>',
      ].join('');
    case 1: // Radiant Star Eyes
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<path d="M107 94 Q107 104 117 104 Q107 104 107 114 Q107 104 97 104 Q107 104 107 94 Z" fill="#FFD700"/>',
        '<circle cx="107" cy="104" r="2.5" fill="#FFF"/>',
        '<path d="M149 94 Q149 104 159 104 Q149 104 149 114 Q149 104 139 104 Q149 104 149 94 Z" fill="#FFD700"/>',
        '<circle cx="149" cy="104" r="2.5" fill="#FFF"/>',
        '<ellipse cx="128" cy="125" rx="5" ry="6" stroke="#FFD700" stroke-width="2.5" fill="none"/>',
        '</g>',
      ].join('');
    case 2: // Neon Heart Visor
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<path d="M107 112 C102 107 95 101 95 97 C95 93 98 90 102 90 C104.5 90 106.5 91.5 107 93.5 C107.5 91.5 109.5 90 112 90 C116 90 119 93 119 97 C119 101 112 107 107 112 Z" fill="#FF2A85"/>',
        '<path d="M149 112 C144 107 137 101 137 97 C137 93 140 90 144 90 C146.5 90 148.5 91.5 149 93.5 C149.5 91.5 151.5 90 154 90 C158 90 161 93 161 97 C161 101 154 107 149 112 Z" fill="#FF2A85"/>',
        '<path d="M120 124 Q124 129 128 124 Q132 129 136 124" stroke="#FF6BB5" stroke-width="2.5" stroke-linecap="round" fill="none"/>',
        '</g>',
      ].join('');
    case 3: // Cyber Scanner Beam
      return [
        '<g id="gb-visor">',
        '<rect x="88" y="100" width="80" height="12" rx="6" fill="#FF1A35" filter="url(#gb-glow)"/>',
        '<rect x="110" y="102" width="36" height="8" rx="4" fill="#FFFFFF"/>',
        '<line x1="84" y1="94" x2="84" y2="118" stroke="#FF4757" stroke-width="2"/>',
        '<line x1="172" y1="94" x2="172" y2="118" stroke="#FF4757" stroke-width="2"/>',
        '<line x1="120" y1="126" x2="136" y2="126" stroke="#FF4757" stroke-width="2.5" stroke-linecap="round" filter="url(#gb-glow)"/>',
        '</g>',
      ].join('');
    case 4: // Nerd Digital Glasses
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<rect x="94" y="94" width="26" height="22" rx="5" stroke="#39FF14" stroke-width="3" fill="#39FF14" fill-opacity=".15"/>',
        '<rect x="136" y="94" width="26" height="22" rx="5" stroke="#39FF14" stroke-width="3" fill="#39FF14" fill-opacity=".15"/>',
        '<line x1="120" y1="102" x2="136" y2="102" stroke="#39FF14" stroke-width="3"/>',
        '<circle cx="107" cy="105" r="4.5" fill="#FFFFFF"/>',
        '<circle cx="149" cy="105" r="4.5" fill="#FFFFFF"/>',
        '<rect x="122" y="123" width="12" height="6" rx="2" stroke="#39FF14" stroke-width="2" fill="none"/>',
        '</g>',
      ].join('');
    case 5: // Playful Winking Smirk
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<line x1="97" y1="105" x2="117" y2="105" stroke="#FFBE1A" stroke-width="4.5" stroke-linecap="round"/>',
        '<circle cx="149" cy="105" r="9" stroke="#FFBE1A" stroke-width="3.5" fill="#FFF"/>',
        '<circle cx="150" cy="104" r="4.5" fill="#FF9F1A"/>',
        '<path d="M120 128 Q128 127 138 120" stroke="#FFBE1A" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
        '</g>',
      ].join('');
    case 6: // Zen Emerald Slits
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<rect x="96" y="103" width="22" height="6" rx="3" fill="#10B981"/>',
        '<rect x="100" y="104" width="14" height="4" rx="2" fill="#E6FFFA"/>',
        '<rect x="138" y="103" width="22" height="6" rx="3" fill="#10B981"/>',
        '<rect x="142" y="104" width="14" height="4" rx="2" fill="#E6FFFA"/>',
        '<circle cx="128" cy="86" r="3.5" fill="#10B981"/>',
        '<path d="M121 124 Q128 128 135 124" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" fill="none"/>',
        '</g>',
      ].join('');
    case 7: // Matrix Cascade Stream
    default:
      return [
        '<g id="gb-visor" filter="url(#gb-glow)">',
        '<line x1="98" y1="92" x2="98" y2="112" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 3"/>',
        '<line x1="108" y1="88" x2="108" y2="116" stroke="#86EFAC" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="5 3"/>',
        '<line x1="118" y1="94" x2="118" y2="110" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/>',
        '<line x1="138" y1="94" x2="138" y2="110" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/>',
        '<line x1="148" y1="88" x2="148" y2="116" stroke="#86EFAC" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="5 3"/>',
        '<line x1="158" y1="92" x2="158" y2="112" stroke="#22C55E" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 3"/>',
        '<line x1="116" y1="125" x2="140" y2="125" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="4 2"/>',
        '</g>',
      ].join('');
  }
}

function renderHeadgearFront(index: number): string {
  switch (index) {
    case 0: // Spring Energy Orb
      return [
        '<g>',
        '<path d="M128 66 L122 58 L134 52 L122 44 L134 38 L128 32" stroke="#94A3B8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
        '<circle cx="128" cy="24" r="11" fill="url(#gb-orb)" stroke="#60A5FA" stroke-width="2" filter="url(#gb-glow)"/>',
        '<circle cx="125" cy="21" r="3.5" fill="#FFFFFF"/>',
        '</g>',
      ].join('');
    case 2: // Mecha Cat Ears
      return [
        '<g>',
        '<polygon points="72,66 84,28 102,64" fill="#334155" stroke="#475569" stroke-width="2.5"/>',
        '<polygon points="78,62 84,36 97,60" fill="#F43F5E" filter="url(#gb-glow)"/>',
        '<polygon points="154,64 172,28 184,66" fill="#334155" stroke="#475569" stroke-width="2.5"/>',
        '<polygon points="159,60 172,36 178,62" fill="#F43F5E" filter="url(#gb-glow)"/>',
        '</g>',
      ].join('');
    case 4: // Studio DJ Headphones Cups
      return [
        '<g>',
        '<rect x="56" y="90" width="16" height="38" rx="8" fill="#0F172A" stroke="#38BDF8" stroke-width="2.5"/>',
        '<line x1="64" y1="98" x2="64" y2="120" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
        '<rect x="184" y="90" width="16" height="38" rx="8" fill="#0F172A" stroke="#38BDF8" stroke-width="2.5"/>',
        '<line x1="192" y1="98" x2="192" y2="120" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>',
        '</g>',
      ].join('');
    case 6: // Steampunk Goggles Front
      return [
        '<g id="gb-goggles">',
        '<rect x="66" y="68" width="124" height="10" rx="3" fill="#78350F"/>',
        '<circle cx="104" cy="73" r="15" fill="#047857" stroke="#B45309" stroke-width="3.5"/>',
        '<circle cx="152" cy="73" r="15" fill="#047857" stroke="#B45309" stroke-width="3.5"/>',
        '<rect x="123" y="70" width="10" height="6" rx="2" fill="#92400E"/>',
        '<circle cx="100" cy="70" r="4" fill="#FFFFFF" opacity=".4"/>',
        '<circle cx="148" cy="70" r="4" fill="#FFFFFF" opacity=".4"/>',
        '</g>',
      ].join('');
    case 7: // Propeller Beanie Front
      return [
        '<g id="gb-beanie">',
        '<path d="M112 66 C112 54 144 54 144 66 Z" fill="#EF4444" stroke="#DC2626" stroke-width="1.5"/>',
        '<rect x="126" y="42" width="4" height="14" rx="2" fill="#F59E0B"/>',
        '<ellipse cx="106" cy="42" rx="22" ry="5.5" fill="#FBBF24" stroke="#D97706" stroke-width="1.5"/>',
        '<ellipse cx="150" cy="42" rx="22" ry="5.5" fill="#3B82F6" stroke="#1D4ED8" stroke-width="1.5"/>',
        '<circle cx="128" cy="42" r="4" fill="#DC2626"/>',
        '</g>',
      ].join('');
    default:
      return '';
  }
}

export function renderAxisAvatarSvg(seed: string): string {
  const params = getAxisAvatarParams(seed);

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">',
    '<defs>',
    // Glow filter
    '<filter id="gb-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
    '<filter id="gb-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>',
    // Clip paths
    '<clipPath id="gb-avatar-clip"><circle cx="128" cy="128" r="128"/></clipPath>',
    // Background gradients
    '<radialGradient id="gb-bg-0" cx="38%" cy="30%" r="76%"><stop stop-color="#101633"/><stop offset="1" stop-color="#070B1C"/></radialGradient>',
    '<radialGradient id="gb-bg-1" cx="50%" cy="30%" r="70%"><stop stop-color="#041820"/><stop offset="1" stop-color="#01080B"/></radialGradient>',
    '<radialGradient id="gb-bg-2" cx="30%" cy="25%" r="75%"><stop stop-color="#1F0A30"/><stop offset="1" stop-color="#07020E"/></radialGradient>',
    '<linearGradient id="gb-bg-3" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2C0A26"/><stop offset="1" stop-color="#110210"/></linearGradient>',
    '<linearGradient id="gb-sun" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FF007A"/><stop offset="1" stop-color="#FFB800"/></linearGradient>',
    '<radialGradient id="gb-bg-4" cx="40%" cy="30%" r="70%"><stop stop-color="#12241A"/><stop offset="1" stop-color="#06120C"/></radialGradient>',
    '<radialGradient id="gb-bg-5" cx="50%" cy="30%" r="70%"><stop stop-color="#071C0F"/><stop offset="1" stop-color="#020A05"/></radialGradient>',
    '<pattern id="gb-scanlines" width="100%" height="4" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="256" y2="0" stroke="#22C55E" stroke-width="1.2"/></pattern>',
    '<radialGradient id="gb-bg-6" cx="50%" cy="40%" r="70%"><stop stop-color="#052028"/><stop offset="1" stop-color="#010D12"/></radialGradient>',
    '<radialGradient id="gb-bg-7" cx="50%" cy="20%" r="75%"><stop stop-color="#321805"/><stop offset="1" stop-color="#140801"/></radialGradient>',
    '<radialGradient id="gb-warm-sun" cx="50%" cy="50%" r="50%"><stop stop-color="#F59E0B" stop-opacity=".35"/><stop offset="1" stop-color="#F59E0B" stop-opacity="0"/></radialGradient>',
    '<radialGradient id="gb-bg-8" cx="40%" cy="30%" r="75%"><stop stop-color="#201533"/><stop offset="1" stop-color="#0C0717"/></radialGradient>',
    '<radialGradient id="gb-bg-9" cx="30%" cy="20%" r="80%"><stop stop-color="#F0F4FA"/><stop offset="1" stop-color="#CBD7EA"/></radialGradient>',
    // Chassis & accents gradients
    '<linearGradient id="gb-chassis-dark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#334155"/><stop offset="1" stop-color="#0F172A"/></linearGradient>',
    '<linearGradient id="gb-chassis-light" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F8FAFC"/><stop offset="1" stop-color="#E2E8F0"/></linearGradient>',
    '<linearGradient id="gb-chassis-gameboy" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#E2E8F0"/><stop offset="1" stop-color="#94A3B8"/></linearGradient>',
    '<radialGradient id="gb-chassis-plasma" cx="35%" cy="35%" r="65%"><stop stop-color="#C084FC" stop-opacity=".3"/><stop offset="1" stop-color="#312E81"/></radialGradient>',
    '<linearGradient id="gb-chassis-cube" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#475569"/><stop offset="1" stop-color="#1E293B"/></linearGradient>',
    '<radialGradient id="gb-orb" cx="35%" cy="35%" r="65%"><stop stop-color="#93C5FD"/><stop offset="1" stop-color="#2563EB"/></radialGradient>',
    '</defs>',
    '<g clip-path="url(#gb-avatar-clip)">',
    renderBackground(params.backgroundIndex),
    renderHeadgearBack(params.headgearIndex),
    renderOutfit(params.outfitIndex),
    renderAccessory(params.accessoryIndex),
    renderChassis(params.chassisIndex),
    renderVisor(params.visorIndex),
    renderHeadgearFront(params.headgearIndex),
    '</g>',
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
  if (!avatarUrl) return null;

  try {
    const url = new URL(avatarUrl, 'https://mentalwealthacademy.world');
    if (url.hostname !== DICEBEAR_HOST) return avatarUrl;
    const seed = url.searchParams.get('seed') || fallbackSeed;
    return seed ? buildAxisAvatarUrl(seed) : null;
  } catch {
    return avatarUrl;
  }
}
