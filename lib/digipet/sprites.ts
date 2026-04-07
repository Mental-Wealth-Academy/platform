import type { ChaoColor, ChaoStage, ChaoType } from './types';
import { rgbToHex, lighten, darken, clamp, GW, GH, FOODS } from './data';

const FW = 32;
const FH = 40;
const NFRAMES = 12;

// ── Palette ──────────────────────────────────────────────

interface Pal {
  body: string; hi: string; sh: string; belly: string;
  outline: string; eball: string;
}

function makePal(r: number, g: number, b: number): Pal {
  const body = rgbToHex(r, g, b);
  return {
    body, hi: lighten(body, 50), sh: darken(body, 50),
    belly: lighten(body, 75), outline: darken(body, 110), eball: '#ffd700',
  };
}

// ── Drawing Primitives ───────────────────────────────────

function px(c: CanvasRenderingContext2D, x: number, y: number, col: string) {
  c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1);
}
function rc(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h);
}
function fc(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  c.fillStyle = col;
  const r2 = r * r;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r2) c.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
}
function fe(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1)
        c.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
}

function autoOutline(c: CanvasRenderingContext2D, w: number, h: number, col: string) {
  const id = c.getImageData(0, 0, w, h);
  const d = id.data;
  const pts: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 0) continue;
      const nb = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      for (const [nx, ny] of nb) {
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && d[(ny * w + nx) * 4 + 3] > 0) {
          pts.push(x, y); break;
        }
      }
    }
  }
  c.fillStyle = col;
  for (let i = 0; i < pts.length; i += 2) c.fillRect(pts[i], pts[i + 1], 1, 1);
}

// ── Chao Frame Config ────────────────────────────────────

interface FCfg {
  by: number; hy: number; llx: number; rlx: number;
  aly: number; ary: number;
  eyes: number; mouth: number; zzz: boolean;
}
// eyes: 0=normal, 1=happy, 2=sad, 3=closed
// mouth: 0=normal, 1=happy, 2=sad, 3=open, 4=none
const FCFGS: FCfg[] = [
  { by: 0, hy: 0, llx: 0, rlx: 0, aly: 0, ary: 0, eyes: 0, mouth: 0, zzz: false },
  { by:-1, hy:-1, llx: 0, rlx: 0, aly:-1, ary:-1, eyes: 0, mouth: 0, zzz: false },
  { by:-1, hy:-1, llx:-2, rlx: 2, aly:-1, ary: 0, eyes: 0, mouth: 0, zzz: false },
  { by: 0, hy: 0, llx: 0, rlx: 0, aly: 0, ary: 0, eyes: 0, mouth: 0, zzz: false },
  { by:-1, hy:-1, llx: 2, rlx:-2, aly: 0, ary:-1, eyes: 0, mouth: 0, zzz: false },
  { by: 0, hy: 0, llx: 0, rlx: 0, aly: 0, ary: 0, eyes: 0, mouth: 0, zzz: false },
  { by: 0, hy: 2, llx: 0, rlx: 0, aly:-2, ary:-2, eyes: 0, mouth: 3, zzz: false },
  { by: 0, hy: 1, llx: 0, rlx: 0, aly:-1, ary:-1, eyes: 1, mouth: 3, zzz: false },
  { by:-1, hy:-2, llx: 0, rlx: 0, aly:-4, ary:-4, eyes: 1, mouth: 1, zzz: false },
  { by: 1, hy: 1, llx: 0, rlx: 0, aly: 2, ary: 2, eyes: 2, mouth: 2, zzz: false },
  { by: 3, hy: 3, llx: 2, rlx:-2, aly: 2, ary: 2, eyes: 3, mouth: 4, zzz: true },
  { by: 2, hy: 2, llx: 1, rlx:-1, aly: 1, ary: 1, eyes: 0, mouth: 0, zzz: false },
];

function drawChao(ctx: CanvasRenderingContext2D, p: Pal, stage: ChaoStage, type: ChaoType, fi: number) {
  const f = FCFGS[fi];
  const b = f.by, h = f.hy;

  // Emotiball
  fc(ctx, 16, 3 + h, 2, p.eball);
  // Emotiball highlight
  px(ctx, 15, 2 + h, lighten(p.eball, 60));

  // Stalk
  const sLen = Math.max(1, 4 - Math.abs(h));
  rc(ctx, 16, 6 + Math.min(0, h), 1, sLen, p.sh);

  // Head
  const hr = stage === 'evolved2' ? 6 : 5;
  fc(ctx, 16, 14 + h, hr, p.body);
  // Head highlight
  fc(ctx, 14, 12 + h, 2, p.hi);

  // Eyes
  const ey = 13 + h;
  if (f.eyes === 0) {
    rc(ctx, 12, ey, 2, 3, '#fff');
    px(ctx, 13, ey + 1, '#1a1a2e'); px(ctx, 13, ey + 2, '#1a1a2e');
    rc(ctx, 18, ey, 2, 3, '#fff');
    px(ctx, 18, ey + 1, '#1a1a2e'); px(ctx, 18, ey + 2, '#1a1a2e');
  } else if (f.eyes === 1) {
    px(ctx, 12, ey + 2, '#1a1a2e'); px(ctx, 13, ey + 1, '#1a1a2e'); px(ctx, 14, ey + 2, '#1a1a2e');
    px(ctx, 18, ey + 2, '#1a1a2e'); px(ctx, 19, ey + 1, '#1a1a2e'); px(ctx, 20, ey + 2, '#1a1a2e');
  } else if (f.eyes === 2) {
    px(ctx, 12, ey + 2, '#333'); px(ctx, 13, ey + 2, '#333');
    px(ctx, 19, ey + 2, '#333'); px(ctx, 20, ey + 2, '#333');
    // Tear
    px(ctx, 13, ey + 3, '#5dade2');
  } else {
    rc(ctx, 12, ey + 2, 3, 1, '#1a1a2e');
    rc(ctx, 18, ey + 2, 3, 1, '#1a1a2e');
  }

  // Mouth
  const my = 19 + h;
  if (f.mouth === 0) {
    px(ctx, 15, my, '#d4726a'); px(ctx, 16, my, '#d4726a');
  } else if (f.mouth === 1) {
    px(ctx, 14, my, '#d4726a'); px(ctx, 15, my + 1, '#d4726a');
    px(ctx, 16, my + 1, '#d4726a'); px(ctx, 17, my, '#d4726a');
  } else if (f.mouth === 2) {
    px(ctx, 14, my + 1, '#d4726a'); px(ctx, 15, my, '#d4726a');
    px(ctx, 16, my, '#d4726a'); px(ctx, 17, my + 1, '#d4726a');
  } else if (f.mouth === 3) {
    rc(ctx, 14, my, 4, 2, '#d4726a'); rc(ctx, 15, my, 2, 1, '#8b4040');
  }

  // Neck
  rc(ctx, 13, 20 + Math.min(b, h), 6, 3 + Math.abs(b - h), p.body);

  // Body
  const br = (stage !== 'child' && type === 'power') ? (stage === 'evolved2' ? 7 : 6) : 5;
  fc(ctx, 16, 26 + b, br, p.body);
  // Belly
  fc(ctx, 16, 26 + b, Math.max(2, br - 2), p.belly);

  // Arms
  const aw = (stage !== 'child' && type === 'power') ? 4 : 3;
  rc(ctx, 8 - aw, 24 + b + f.aly, aw, 5, p.body);
  rc(ctx, 24, 24 + b + f.ary, aw, 5, p.body);
  // Arm hands
  rc(ctx, 8 - aw, 27 + b + f.aly, aw, 2, p.sh);
  rc(ctx, 24, 27 + b + f.ary, aw, 2, p.sh);

  // Legs
  const lh = (stage !== 'child' && type === 'run') ? 4 : 3;
  rc(ctx, 13 + f.llx, 32 + b, 2, lh, p.body);
  rc(ctx, 17 + f.rlx, 32 + b, 2, lh, p.body);

  // Feet
  rc(ctx, 12 + f.llx, 32 + b + lh, 4, 2, p.sh);
  rc(ctx, 16 + f.rlx, 32 + b + lh, 4, 2, p.sh);

  // Evolution features
  if (stage === 'evolved1' || stage === 'evolved2') {
    const s2 = stage === 'evolved2';
    if (type === 'swim') {
      const fh = s2 ? 6 : 4;
      for (let i = 0; i < fh; i++) {
        px(ctx, 16, 8 + h - i, p.hi);
        if (i > 0) { px(ctx, 15, 9 + h - i, p.body); px(ctx, 17, 9 + h - i, p.body); }
      }
      // Webbed feet indicator
      if (s2) { px(ctx, 11 + f.llx, 32 + b + lh + 1, p.hi); px(ctx, 20 + f.rlx, 32 + b + lh + 1, p.hi); }
    } else if (type === 'fly') {
      const wl = s2 ? 7 : 5;
      for (let i = 0; i < wl; i++) {
        const wy = 22 + b + i;
        px(ctx, 6 - i, wy, p.hi);
        px(ctx, 26 + i, wy, p.hi);
        if (i > 0) {
          rc(ctx, 7 - i, wy, i, 1, p.belly);
          rc(ctx, 26, wy, i, 1, p.belly);
        }
      }
    } else if (type === 'run') {
      if (s2) {
        for (let i = 0; i < 3; i++) px(ctx, 3 + i, 25 + b + i * 2, p.hi);
        for (let i = 0; i < 3; i++) px(ctx, 29 - i, 25 + b + i * 2, p.hi);
      }
    } else if (type === 'power') {
      const hh = s2 ? 5 : 3;
      for (let i = 0; i < hh; i++) {
        px(ctx, 16, 8 + h - i, p.sh);
        if (i > 0) px(ctx, 16 + (i % 2 === 0 ? -1 : 1), 8 + h - i, p.sh);
      }
    }
  }

  // Zzz
  if (f.zzz) {
    px(ctx, 23, 8 + h, '#aac8ff');
    px(ctx, 25, 6 + h, '#88aadd');
    px(ctx, 27, 4 + h, '#6688bb');
    // Small z shapes
    rc(ctx, 22, 8 + h, 3, 1, '#aac8ff'); px(ctx, 24, 9 + h, '#aac8ff'); rc(ctx, 22, 10 + h, 3, 1, '#aac8ff');
  }
}

// ── Sprite Sheet Generation ──────────────────────────────

export function generateChaoSheet(scene: Phaser.Scene, key: string, color: ChaoColor, stage: ChaoStage, type: ChaoType) {
  if (scene.textures.exists(key)) scene.textures.remove(key);

  const pal = makePal(color.r, color.g, color.b);
  const sheet = document.createElement('canvas');
  sheet.width = FW * NFRAMES; sheet.height = FH;
  const sc = sheet.getContext('2d')!;
  sc.imageSmoothingEnabled = false;

  for (let i = 0; i < NFRAMES; i++) {
    const fr = document.createElement('canvas');
    fr.width = FW; fr.height = FH;
    const fc2 = fr.getContext('2d')!;
    fc2.imageSmoothingEnabled = false;
    drawChao(fc2, pal, stage, type, i);
    autoOutline(fc2, FW, FH, pal.outline);
    sc.drawImage(fr, i * FW, 0);
  }

  const tex = scene.textures.addCanvas(key, sheet);
  if (tex) for (let i = 0; i < NFRAMES; i++) tex.add(i, 0, i * FW, 0, FW, FH);
}

export function createChaoAnims(scene: Phaser.Scene, key: string) {
  const mk = (suffix: string, frames: number[], rate: number, rep: number) => {
    const k = `${key}_${suffix}`;
    if (!scene.anims.exists(k))
      scene.anims.create({ key: k, frames: scene.anims.generateFrameNumbers(key, { frames }), frameRate: rate, repeat: rep });
  };
  mk('idle', [0, 1], 2, -1);
  mk('walk', [2, 3, 4, 5], 6, -1);
  mk('eat', [6, 7, 6, 7], 4, 0);
  mk('happy', [8], 1, 0);
  mk('sad', [9], 1, 0);
  mk('sleep', [10], 1, -1);
  mk('sit', [11], 1, 0);
}

export function chaoTexKey(color: ChaoColor, stage: ChaoStage, type: ChaoType): string {
  return `chao_${color.r}_${color.g}_${color.b}_${stage}_${type}`;
}

// ── Egg Sprites (colored per-chao genetics) ──────────────

function eggKey(r: number, g: number, b: number, cracked: boolean): string {
  return `egg_${r}_${g}_${b}${cracked ? '_cr' : ''}`;
}

function blendColor(cr: number, cg: number, cb: number, base: string, mix: number): string {
  const br = parseInt(base.slice(1, 3), 16);
  const bg = parseInt(base.slice(3, 5), 16);
  const bb = parseInt(base.slice(5, 7), 16);
  return rgbToHex(
    Math.round(br * (1 - mix) + cr * mix),
    Math.round(bg * (1 - mix) + cg * mix),
    Math.round(bb * (1 - mix) + cb * mix),
  );
}

export function generateColoredEgg(scene: Phaser.Scene, color: { r: number; g: number; b: number }, cracked: boolean): string {
  const key = eggKey(color.r, color.g, color.b, cracked);
  if (scene.textures.exists(key)) return key;

  const c = document.createElement('canvas');
  c.width = 20; c.height = 24;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Mix the chao's color into the egg — pastel tint
  const shellOuter = blendColor(color.r, color.g, color.b, '#e8e0d4', 0.35);
  const shellInner = blendColor(color.r, color.g, color.b, '#f5efe6', 0.30);
  const hilight    = blendColor(color.r, color.g, color.b, '#faf7f2', 0.15);
  const speckle    = darken(blendColor(color.r, color.g, color.b, '#c8b8a4', 0.50), 20);
  const outlineCol = darken(blendColor(color.r, color.g, color.b, '#8b7d6b', 0.40), 10);

  // Egg shape
  fe(ctx, 10, 13, 7, 10, shellOuter);
  fe(ctx, 10, 13, 6, 9, shellInner);
  // Highlight
  fe(ctx, 8, 10, 3, 4, hilight);
  // Colored speckles — pattern varies by color channel for variety
  const spots = [[6, 8], [12, 10], [8, 16], [13, 15], [10, 18], [7, 13], [11, 7], [5, 14]];
  const speckle2 = darken(speckle, 15);
  spots.forEach(([sx, sy], i) => {
    px(ctx, sx, sy, i % 2 === 0 ? speckle : speckle2);
  });
  // Colored band/stripe across the middle for extra flair
  const bandColor = blendColor(color.r, color.g, color.b, '#d4c8b8', 0.55);
  for (let bx = 5; bx <= 15; bx++) {
    const inEllipse = ((bx - 10) ** 2) / (6 * 6) + ((12 - 13) ** 2) / (9 * 9);
    if (inEllipse <= 1) px(ctx, bx, 12, bandColor);
    const inE2 = ((bx - 10) ** 2) / (6 * 6) + ((13 - 13) ** 2) / (9 * 9);
    if (inE2 <= 1) px(ctx, bx, 13, bandColor);
  }

  if (cracked) {
    const crack = outlineCol;
    px(ctx, 8, 11, crack); px(ctx, 9, 10, crack); px(ctx, 10, 11, crack);
    px(ctx, 11, 10, crack); px(ctx, 12, 11, crack); px(ctx, 13, 12, crack);
    px(ctx, 7, 12, crack); px(ctx, 10, 12, crack);
    px(ctx, 14, 13, crack); px(ctx, 9, 13, crack);
  }

  autoOutline(ctx, 20, 24, outlineCol);
  scene.textures.addCanvas(key, c);
  return key;
}

// Keep plain versions as fallback for title screen
export function generateEggSprite(scene: Phaser.Scene) {
  if (scene.textures.exists('egg')) return;
  generateColoredEgg(scene, { r: 180, g: 195, b: 210 }, false);
  // Alias the default colored egg as 'egg' for title screen
  const def = generateColoredEgg(scene, { r: 180, g: 195, b: 210 }, false);
  if (!scene.textures.exists('egg')) {
    const c = document.createElement('canvas'); c.width = 20; c.height = 24;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    fe(ctx, 10, 13, 7, 10, '#dde4ec'); fe(ctx, 10, 13, 6, 9, '#e8eef5');
    fe(ctx, 8, 10, 3, 4, '#f0f4f8');
    [[6, 8], [12, 10], [8, 16], [13, 15], [10, 18], [7, 13]].forEach(([sx, sy], i) => {
      px(ctx, sx, sy, ['#b0bcc8', '#a0acb8', '#c0ccd8'][i % 3]);
    });
    autoOutline(ctx, 20, 24, '#6b7d8b');
    scene.textures.addCanvas('egg', c);
  }
}

export function generateCrackedEggSprite(scene: Phaser.Scene) {
  if (scene.textures.exists('egg_cracked')) return;
  const c = document.createElement('canvas'); c.width = 20; c.height = 24;
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  fe(ctx, 10, 13, 7, 10, '#dde4ec'); fe(ctx, 10, 13, 6, 9, '#e8eef5');
  fe(ctx, 8, 10, 3, 4, '#f0f4f8');
  const crack = '#6b7d8b';
  px(ctx, 8, 11, crack); px(ctx, 9, 10, crack); px(ctx, 10, 11, crack);
  px(ctx, 11, 10, crack); px(ctx, 12, 11, crack); px(ctx, 13, 12, crack);
  px(ctx, 7, 12, crack); px(ctx, 10, 12, crack);
  autoOutline(ctx, 20, 24, '#6b7d8b');
  scene.textures.addCanvas('egg_cracked', c);
}

// ── Food Sprites ─────────────────────────────────────────

export function generateFoodSprites(scene: Phaser.Scene) {
  Object.values(FOODS).forEach(food => {
    const key = `food_${food.type}`;
    if (scene.textures.exists(key)) return;
    const c = document.createElement('canvas');
    c.width = 10; c.height = 12;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    // Fruit body
    fc(ctx, 5, 7, 4, food.color);
    fc(ctx, 5, 7, 3, lighten(food.color, 25));
    // Highlight
    px(ctx, 3, 5, lighten(food.color, 70));
    px(ctx, 4, 5, lighten(food.color, 50));
    // Stem
    rc(ctx, 5, 2, 1, 3, '#6b4423');
    // Leaf
    px(ctx, 6, 2, '#4caf50');
    px(ctx, 7, 2, '#4caf50');
    px(ctx, 7, 1, '#66bb6a');
    // Rainbow shimmer
    if (food.type === 'rainbow') {
      px(ctx, 3, 6, '#ff0000'); px(ctx, 4, 8, '#00ff00');
      px(ctx, 6, 6, '#0000ff'); px(ctx, 7, 8, '#ffff00');
    }
    autoOutline(ctx, 10, 12, darken(food.color, 60));
    scene.textures.addCanvas(key, c);
  });
}

// ── Item Sprites ─────────────────────────────────────────

export function generateItemSprites(scene: Phaser.Scene) {
  // Ball
  if (!scene.textures.exists('item_ball')) {
    const c = document.createElement('canvas'); c.width = 14; c.height = 14;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    fc(ctx, 7, 7, 6, '#e74c3c');
    fc(ctx, 7, 7, 5, '#f15a4a');
    // Stripe
    rc(ctx, 2, 6, 10, 2, '#fff');
    // Highlight
    px(ctx, 4, 4, '#ffaaaa'); px(ctx, 5, 4, '#ffaaaa');
    autoOutline(ctx, 14, 14, '#8b2020');
    scene.textures.addCanvas('item_ball', c);
  }

  // Trumpet
  if (!scene.textures.exists('item_trumpet')) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 12;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    rc(ctx, 2, 5, 8, 3, '#f1c40f');
    rc(ctx, 3, 5, 6, 3, '#f4d03f');
    // Bell
    rc(ctx, 10, 3, 4, 7, '#f1c40f');
    rc(ctx, 11, 4, 2, 5, '#f7dc6f');
    // Mouthpiece
    rc(ctx, 1, 6, 2, 1, '#d4ac0d');
    autoOutline(ctx, 16, 12, '#7d6608');
    scene.textures.addCanvas('item_trumpet', c);
  }

  // TV
  if (!scene.textures.exists('item_tv')) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 16;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    rc(ctx, 1, 3, 14, 10, '#555');
    rc(ctx, 2, 4, 12, 8, '#666');
    rc(ctx, 3, 5, 10, 6, '#2ecc71');
    rc(ctx, 4, 6, 8, 4, '#3edd84');
    // Antenna
    px(ctx, 6, 2, '#888'); px(ctx, 5, 1, '#888');
    px(ctx, 10, 2, '#888'); px(ctx, 11, 1, '#888');
    // Knob
    px(ctx, 14, 6, '#e74c3c');
    // Stand
    rc(ctx, 5, 13, 2, 2, '#555'); rc(ctx, 9, 13, 2, 2, '#555');
    autoOutline(ctx, 16, 16, '#222');
    scene.textures.addCanvas('item_tv', c);
  }

  // Rocking horse
  if (!scene.textures.exists('item_rocking_horse')) {
    const c = document.createElement('canvas'); c.width = 18; c.height = 16;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    // Rockers
    rc(ctx, 1, 14, 16, 2, '#8b5e3c');
    fe(ctx, 9, 13, 8, 2, '#a0724e');
    // Body
    rc(ctx, 5, 5, 8, 7, '#d4a574');
    rc(ctx, 6, 6, 6, 5, '#e0b88a');
    // Head/neck
    rc(ctx, 12, 2, 3, 6, '#d4a574');
    rc(ctx, 14, 1, 2, 3, '#d4a574');
    // Eye
    px(ctx, 15, 2, '#333');
    // Mane
    px(ctx, 12, 1, '#8b5e3c'); px(ctx, 12, 2, '#8b5e3c'); px(ctx, 12, 3, '#8b5e3c');
    // Legs
    rc(ctx, 6, 11, 2, 3, '#c89a6a');
    rc(ctx, 10, 11, 2, 3, '#c89a6a');
    autoOutline(ctx, 18, 16, '#5a3a1e');
    scene.textures.addCanvas('item_rocking_horse', c);
  }
}

// ── Particle Sprites ─────────────────────────────────────

export function generateParticleSprites(scene: Phaser.Scene) {
  // Heart
  if (!scene.textures.exists('heart')) {
    const c = document.createElement('canvas'); c.width = 7; c.height = 7;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const h = '#ff4466';
    px(ctx, 1, 1, h); px(ctx, 2, 1, h); px(ctx, 4, 1, h); px(ctx, 5, 1, h);
    rc(ctx, 0, 2, 7, 1, h);
    rc(ctx, 0, 3, 7, 1, h);
    rc(ctx, 1, 4, 5, 1, h);
    rc(ctx, 2, 5, 3, 1, h);
    px(ctx, 3, 6, h);
    scene.textures.addCanvas('heart', c);
  }

  // Star
  if (!scene.textures.exists('star')) {
    const c = document.createElement('canvas'); c.width = 7; c.height = 7;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const s = '#ffd700';
    px(ctx, 3, 0, s);
    rc(ctx, 2, 1, 3, 1, s);
    rc(ctx, 0, 2, 7, 1, s);
    rc(ctx, 1, 3, 5, 1, s);
    rc(ctx, 2, 4, 3, 1, s);
    px(ctx, 1, 5, s); px(ctx, 5, 5, s);
    px(ctx, 0, 6, s); px(ctx, 6, 6, s);
    scene.textures.addCanvas('star', c);
  }

  // Coin
  if (!scene.textures.exists('coin')) {
    const c = document.createElement('canvas'); c.width = 10; c.height = 10;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    fc(ctx, 5, 5, 4, '#f1c40f');
    fc(ctx, 5, 5, 3, '#f4d03f');
    px(ctx, 4, 4, '#f7dc6f'); px(ctx, 3, 3, '#fef9e7');
    // C for coin
    px(ctx, 5, 3, '#d4ac0d'); px(ctx, 6, 4, '#d4ac0d'); px(ctx, 5, 5, '#d4ac0d');
    px(ctx, 6, 6, '#d4ac0d'); px(ctx, 5, 7, '#d4ac0d');
    autoOutline(ctx, 10, 10, '#7d6608');
    scene.textures.addCanvas('coin', c);
  }

  // Music note
  if (!scene.textures.exists('note')) {
    const c = document.createElement('canvas'); c.width = 7; c.height = 9;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const n = '#333';
    rc(ctx, 4, 0, 1, 7, n);
    fc(ctx, 3, 7, 2, n);
    rc(ctx, 4, 0, 2, 1, n);
    rc(ctx, 5, 1, 1, 2, n);
    scene.textures.addCanvas('note', c);
  }
}

// ── Garden Background ────────────────────────────────────

export function generateGardenBG(scene: Phaser.Scene) {
  if (scene.textures.exists('garden_bg')) return;
  const c = document.createElement('canvas');
  c.width = GW; c.height = GH;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Sky gradient
  for (let y = 0; y < 100; y++) {
    const t = y / 100;
    const r = Math.round(100 + t * 60);
    const g = Math.round(180 + t * 40);
    const b = Math.round(235 + t * 15);
    rc(ctx, 0, y, GW, 1, rgbToHex(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)));
  }

  // Clouds
  const drawCloud = (cx: number, cy: number, s: number) => {
    fc(ctx, cx, cy, s * 4, '#fff');
    fc(ctx, cx - s * 4, cy + s, s * 3, '#fff');
    fc(ctx, cx + s * 4, cy + s, s * 3, '#fff');
    fc(ctx, cx, cy - 1, s * 3, '#f8f8ff');
  };
  drawCloud(80, 25, 2);
  drawCloud(250, 35, 2);
  drawCloud(400, 20, 2);

  // Distant hills
  for (let x = 0; x < GW; x++) {
    const hillH = Math.sin(x * 0.015) * 15 + Math.sin(x * 0.008 + 1) * 10 + 85;
    rc(ctx, x, hillH, 1, GH - hillH, '#5a9e4b');
  }

  // Main grass fill with texture
  for (let y = 80; y < GH; y++) {
    for (let x = 0; x < GW; x += 2) {
      const noise = ((Math.sin(x * 0.1 + y * 0.15) + Math.sin(x * 0.23 + y * 0.07)) * 8) | 0;
      const gr = clamp(82 + noise, 60, 110);
      const gg = clamp(168 + noise, 140, 200);
      const gb = clamp(82 + noise, 60, 110);
      rc(ctx, x, y, 2, 1, rgbToHex(gr, gg, gb));
    }
  }

  // Dirt path at bottom
  for (let x = 140; x < 340; x++) {
    const pw = 35 + Math.sin(x * 0.03) * 8;
    const py = GH - pw;
    for (let y = py; y < GH; y++) {
      const n = ((Math.sin(x * 0.2 + y * 0.3)) * 6) | 0;
      px(ctx, x, y, rgbToHex(clamp(160 + n, 140, 180), clamp(130 + n, 110, 150), clamp(90 + n, 70, 110)));
    }
  }

  // Pond
  fe(ctx, 80, 190, 55, 35, '#2471a3');
  fe(ctx, 80, 190, 52, 32, '#3498db');
  fe(ctx, 80, 188, 48, 28, '#5dade2');
  fe(ctx, 72, 182, 20, 10, '#85c1e9');
  // Ripples
  for (let i = 0; i < 3; i++) {
    const rx = 65 + i * 20, ry = 192 + i * 5;
    rc(ctx, rx, ry, 8, 1, '#85c1e9');
  }
  // Lily pads
  fc(ctx, 100, 195, 4, '#2d8a4e');
  fc(ctx, 60, 200, 3, '#3aa65e');
  px(ctx, 101, 193, '#ff69b4'); // flower on lily pad

  // Trees on right
  const drawTree = (tx: number, ty: number, s: number) => {
    // Shadow
    fe(ctx, tx, ty + s * 12 + 5, s * 6, 3, 'rgba(0,0,0,0.15)');
    // Trunk
    rc(ctx, tx - s, ty, s * 2, s * 12, '#6b4423');
    rc(ctx, tx - s + 1, ty + 1, s * 2 - 2, s * 12 - 2, '#8b5e3c');
    // Canopy circles
    fc(ctx, tx, ty - s * 3, s * 6, '#2d7a3e');
    fc(ctx, tx - s * 3, ty - s, s * 4, '#3a9e52');
    fc(ctx, tx + s * 3, ty - s * 2, s * 5, '#34a853');
    fc(ctx, tx + s, ty - s * 5, s * 4, '#45b868');
    // Canopy highlights
    fc(ctx, tx - s * 2, ty - s * 4, s * 2, '#5ccc78');
  };
  drawTree(420, 130, 3);
  drawTree(455, 145, 2);

  // Tree on far left
  drawTree(25, 120, 2);

  // Flowers
  const fColors = ['#e74c3c', '#f1c40f', '#e91e8c', '#fff', '#9b59b6', '#ff6b6b', '#feca57'];
  for (let i = 0; i < 50; i++) {
    const fx = 20 + ((i * 97 + 31) % 440);
    const fy = 100 + ((i * 53 + 17) % 180);
    // Skip if in pond or tree area
    if (fx < 140 && fy > 150 && fy < 230) continue;
    const col = fColors[i % fColors.length];
    px(ctx, fx, fy, col);
    px(ctx, fx + 1, fy, col);
    px(ctx, fx, fy + 1, '#228B22');
  }

  // Small rocks
  [[200, 140], [350, 180], [170, 230], [290, 120]].forEach(([rx, ry]) => {
    fc(ctx, rx, ry, 3, '#888');
    fc(ctx, rx, ry, 2, '#999');
    px(ctx, rx - 1, ry - 1, '#aaa');
  });

  // Fence/border hints at edges
  for (let x = 0; x < GW; x += 20) {
    rc(ctx, x, 90, 2, 8, '#8b5e3c');
    rc(ctx, x, 90, 12, 2, '#a0724e');
  }

  scene.textures.addCanvas('garden_bg', c);
}

// ── UI Sprites ───────────────────────────────────────────

export function generateUISprites(scene: Phaser.Scene) {
  // Button background
  if (!scene.textures.exists('btn')) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 20;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    rc(ctx, 0, 0, 64, 20, '#2471a3');
    rc(ctx, 1, 1, 62, 18, '#2980b9');
    rc(ctx, 2, 2, 60, 16, '#3498db');
    rc(ctx, 2, 2, 60, 8, '#5dade2');
    scene.textures.addCanvas('btn', c);
  }

  // Panel background
  if (!scene.textures.exists('panel')) {
    const c = document.createElement('canvas'); c.width = 200; c.height = 150;
    const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    rc(ctx, 0, 0, 200, 150, '#1a252f');
    rc(ctx, 1, 1, 198, 148, '#2c3e50');
    rc(ctx, 2, 2, 196, 146, '#34495e');
    rc(ctx, 3, 3, 194, 2, '#4a6278');
    scene.textures.addCanvas('panel', c);
  }
}

// ── Master Generator ─────────────────────────────────────

export function generateAllSprites(scene: Phaser.Scene) {
  generateEggSprite(scene);
  generateCrackedEggSprite(scene);
  generateFoodSprites(scene);
  generateItemSprites(scene);
  generateParticleSprites(scene);
  generateGardenBG(scene);
  generateUISprites(scene);
}
