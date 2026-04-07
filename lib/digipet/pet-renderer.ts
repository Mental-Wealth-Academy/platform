/**
 * Pure canvas pet/egg rendering — no Phaser dependency.
 * Draws pixel-art pets at any scale onto a standard HTML canvas.
 */
import type { ChaoColor, ChaoStage, ChaoType } from './types';
import { rgbToHex, lighten, darken, clamp } from './data';

const FW = 32;
const FH = 40;

interface Pal {
  body: string; hi: string; sh: string; belly: string;
  outline: string; eball: string;
}

function makePal(r: number, g: number, b: number): Pal {
  const body = rgbToHex(r, g, b);
  return { body, hi: lighten(body, 50), sh: darken(body, 50), belly: lighten(body, 75), outline: darken(body, 110), eball: '#ffd700' };
}

function px(c: CanvasRenderingContext2D, x: number, y: number, col: string) { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); }
function rc(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w, h); }
function fc(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string) {
  c.fillStyle = col; const r2 = r * r;
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r2) c.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
}
function fe(c: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, col: string) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) c.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
}
function autoOutline(c: CanvasRenderingContext2D, w: number, h: number, col: string) {
  const id = c.getImageData(0, 0, w, h), d = id.data, pts: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 0) continue;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]])
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && d[(ny * w + nx) * 4 + 3] > 0) { pts.push(x, y); break; }
  }
  c.fillStyle = col; for (let i = 0; i < pts.length; i += 2) c.fillRect(pts[i], pts[i + 1], 1, 1);
}

interface FCfg { by: number; hy: number; llx: number; rlx: number; aly: number; ary: number; eyes: number; mouth: number; zzz: boolean; }
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

function drawChaoRaw(ctx: CanvasRenderingContext2D, p: Pal, stage: ChaoStage, type: ChaoType, fi: number) {
  const f = FCFGS[fi]; const b = f.by, h = f.hy;
  fc(ctx, 16, 3 + h, 2, p.eball); px(ctx, 15, 2 + h, lighten(p.eball, 60));
  rc(ctx, 16, 6 + Math.min(0, h), 1, Math.max(1, 4 - Math.abs(h)), p.sh);
  const hr = stage === 'evolved2' ? 6 : 5;
  fc(ctx, 16, 14 + h, hr, p.body); fc(ctx, 14, 12 + h, 2, p.hi);
  const ey = 13 + h;
  if (f.eyes === 0) { rc(ctx, 12, ey, 2, 3, '#fff'); px(ctx, 13, ey + 1, '#1a1a2e'); px(ctx, 13, ey + 2, '#1a1a2e'); rc(ctx, 18, ey, 2, 3, '#fff'); px(ctx, 18, ey + 1, '#1a1a2e'); px(ctx, 18, ey + 2, '#1a1a2e'); }
  else if (f.eyes === 1) { px(ctx, 12, ey + 2, '#1a1a2e'); px(ctx, 13, ey + 1, '#1a1a2e'); px(ctx, 14, ey + 2, '#1a1a2e'); px(ctx, 18, ey + 2, '#1a1a2e'); px(ctx, 19, ey + 1, '#1a1a2e'); px(ctx, 20, ey + 2, '#1a1a2e'); }
  else if (f.eyes === 2) { px(ctx, 12, ey + 2, '#333'); px(ctx, 13, ey + 2, '#333'); px(ctx, 19, ey + 2, '#333'); px(ctx, 20, ey + 2, '#333'); px(ctx, 13, ey + 3, '#5dade2'); }
  else { rc(ctx, 12, ey + 2, 3, 1, '#1a1a2e'); rc(ctx, 18, ey + 2, 3, 1, '#1a1a2e'); }
  const my = 19 + h;
  if (f.mouth === 0) { px(ctx, 15, my, '#d4726a'); px(ctx, 16, my, '#d4726a'); }
  else if (f.mouth === 1) { px(ctx, 14, my, '#d4726a'); px(ctx, 15, my + 1, '#d4726a'); px(ctx, 16, my + 1, '#d4726a'); px(ctx, 17, my, '#d4726a'); }
  else if (f.mouth === 2) { px(ctx, 14, my + 1, '#d4726a'); px(ctx, 15, my, '#d4726a'); px(ctx, 16, my, '#d4726a'); px(ctx, 17, my + 1, '#d4726a'); }
  else if (f.mouth === 3) { rc(ctx, 14, my, 4, 2, '#d4726a'); rc(ctx, 15, my, 2, 1, '#8b4040'); }
  rc(ctx, 13, 20 + Math.min(b, h), 6, 3 + Math.abs(b - h), p.body);
  const br = (stage !== 'child' && type === 'power') ? (stage === 'evolved2' ? 7 : 6) : 5;
  fc(ctx, 16, 26 + b, br, p.body); fc(ctx, 16, 26 + b, Math.max(2, br - 2), p.belly);
  const aw = (stage !== 'child' && type === 'power') ? 4 : 3;
  rc(ctx, 8 - aw, 24 + b + f.aly, aw, 5, p.body); rc(ctx, 24, 24 + b + f.ary, aw, 5, p.body);
  rc(ctx, 8 - aw, 27 + b + f.aly, aw, 2, p.sh); rc(ctx, 24, 27 + b + f.ary, aw, 2, p.sh);
  const lh = (stage !== 'child' && type === 'run') ? 4 : 3;
  rc(ctx, 13 + f.llx, 32 + b, 2, lh, p.body); rc(ctx, 17 + f.rlx, 32 + b, 2, lh, p.body);
  rc(ctx, 12 + f.llx, 32 + b + lh, 4, 2, p.sh); rc(ctx, 16 + f.rlx, 32 + b + lh, 4, 2, p.sh);
  if (stage === 'evolved1' || stage === 'evolved2') {
    const s2 = stage === 'evolved2';
    if (type === 'swim') { for (let i = 0; i < (s2 ? 6 : 4); i++) { px(ctx, 16, 8 + h - i, p.hi); if (i > 0) { px(ctx, 15, 9 + h - i, p.body); px(ctx, 17, 9 + h - i, p.body); } } }
    else if (type === 'fly') { const wl = s2 ? 7 : 5; for (let i = 0; i < wl; i++) { px(ctx, 6 - i, 22 + b + i, p.hi); px(ctx, 26 + i, 22 + b + i, p.hi); if (i > 0) { rc(ctx, 7 - i, 22 + b + i, i, 1, p.belly); rc(ctx, 26, 22 + b + i, i, 1, p.belly); } } }
    else if (type === 'power') { for (let i = 0; i < (s2 ? 5 : 3); i++) { px(ctx, 16, 8 + h - i, p.sh); if (i > 0) px(ctx, 16 + (i % 2 === 0 ? -1 : 1), 8 + h - i, p.sh); } }
  }
  if (f.zzz) { rc(ctx, 22, 8 + h, 3, 1, '#aac8ff'); px(ctx, 24, 9 + h, '#aac8ff'); rc(ctx, 22, 10 + h, 3, 1, '#aac8ff'); }
}

/**
 * Render a pet onto a canvas at a given scale.
 * @param canvas target canvas element
 * @param color pet color {r,g,b}
 * @param stage evolution stage
 * @param type evolution type
 * @param frame animation frame index (0-11)
 * @param scale pixel scale (e.g. 4 = each pixel is 4x4)
 */
export function renderPet(canvas: HTMLCanvasElement, color: ChaoColor, stage: ChaoStage, type: ChaoType, frame: number, scale = 4) {
  const w = FW * scale, h = FH * scale;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Draw at 1x on temp canvas
  const tmp = document.createElement('canvas');
  tmp.width = FW; tmp.height = FH;
  const tc = tmp.getContext('2d')!;
  tc.imageSmoothingEnabled = false;
  const pal = makePal(color.r, color.g, color.b);
  drawChaoRaw(tc, pal, stage, type, frame);
  autoOutline(tc, FW, FH, pal.outline);

  // Scale up with nearest-neighbor
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, w, h);
}

/**
 * Render an egg onto a canvas at a given scale.
 */
export function renderEgg(canvas: HTMLCanvasElement, color: ChaoColor, progress: number, scale = 4) {
  const ew = 20, eh = 24;
  canvas.width = ew * scale; canvas.height = eh * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const tmp = document.createElement('canvas');
  tmp.width = ew; tmp.height = eh;
  const tc = tmp.getContext('2d')!;
  tc.imageSmoothingEnabled = false;

  const mix = (cr: number, base: string, m: number) => {
    const br = parseInt(base.slice(1, 3), 16), bg = parseInt(base.slice(3, 5), 16), bb = parseInt(base.slice(5, 7), 16);
    return rgbToHex(Math.round(br * (1 - m) + color.r * m), Math.round(bg * (1 - m) + color.g * m), Math.round(bb * (1 - m) + color.b * m));
  };
  const shell = mix(color.r, '#e8e0d4', 0.35);
  const inner = mix(color.r, '#f5efe6', 0.30);
  const hi = mix(color.r, '#faf7f2', 0.15);
  const speckle = darken(mix(color.r, '#c8b8a4', 0.5), 20);
  const ol = darken(mix(color.r, '#8b7d6b', 0.4), 10);
  const band = mix(color.r, '#d4c8b8', 0.55);

  fe(tc, 10, 13, 7, 10, shell); fe(tc, 10, 13, 6, 9, inner); fe(tc, 8, 10, 3, 4, hi);
  [[6, 8], [12, 10], [8, 16], [13, 15], [10, 18], [7, 13]].forEach(([sx, sy], i) => px(tc, sx, sy, i % 2 ? darken(speckle, 15) : speckle));
  for (let bx = 5; bx <= 15; bx++) { if (((bx - 10) ** 2) / 36 <= 1) { px(tc, bx, 12, band); px(tc, bx, 13, band); } }
  if (progress > 50) {
    px(tc, 8, 11, ol); px(tc, 9, 10, ol); px(tc, 10, 11, ol); px(tc, 11, 10, ol);
    px(tc, 12, 11, ol); px(tc, 13, 12, ol); px(tc, 7, 12, ol); px(tc, 14, 13, ol);
  }
  autoOutline(tc, ew, eh, ol);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
}

export { FW, FH };
