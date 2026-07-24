/**
 * Osiris Art Gallery of Genetic Research — the splicing engine.
 *
 * Every rsid is a seed. The same marker always paints the same canvas, so a
 * piece can be re-hung, cached, or evicted without the gallery changing.
 */

import type p5 from 'p5';

/** Base pairs carry the palette. Hue is the only thing a letter decides. */
const BASE_HUE: Record<string, number> = {
  A: 8, // arterial red
  C: 196, // cold cyan
  G: 132, // chlorophyll
  T: 268, // violet
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, and stable across machines. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Piece {
  /** rsid, or genoset id */
  id: string;
  /** the user's called genotype, when they have one */
  genotype?: string;
  /** SNPedia magnitude — drives how loud the piece is allowed to be */
  magnitude?: number;
  /** wall label */
  label: string;
  /** second line on the wall label */
  caption?: string;
  /** Same-origin image URL for a curated artwork. Genetic pieces omit this. */
  imageUrl?: string;
  /** Collection metadata shown in the reading panel. */
  artist?: string;
  year?: string;
  era?: string;
  description?: string;
  externalUrl?: string;
}

interface Palette {
  hues: number[];
  ground: number;
  accent: number;
}

function derivePalette(piece: Piece, rng: () => number): Palette {
  const letters = (piece.genotype || '')
    .toUpperCase()
    .split('')
    .filter((c) => c in BASE_HUE);

  const hues = letters.length
    ? letters.map((c) => BASE_HUE[c])
    : [Math.floor(rng() * 360), (Math.floor(rng() * 360) + 180) % 360];

  // A drifted complement keeps two-letter genotypes from reading as flat duotone.
  const drift = (rng() - 0.5) * 40;
  return {
    hues: [...hues, (hues[0] + 150 + drift) % 360],
    ground: (hues[0] + 210 + drift) % 360,
    accent: (hues[hues.length - 1] + 60) % 360,
  };
}

/** Wash — the field the marker is suspended in. */
function paintWash(g: p5.Graphics, pal: Palette, rng: () => number, W: number, H: number) {
  g.noStroke();
  const bands = 26 + Math.floor(rng() * 18);
  for (let i = 0; i < bands; i += 1) {
    const t = i / bands;
    const hue = (pal.ground + t * 70 + rng() * 12) % 360;
    g.fill(hue, 42 + rng() * 26, 16 + t * 26, 1);
    const y = t * H;
    g.rect(0, y, W, H / bands + 2);
  }

  // Soft blooms: the epigenetic markers themselves, non-cell, just light.
  const blooms = 5 + Math.floor(rng() * 5);
  for (let i = 0; i < blooms; i += 1) {
    const cx = rng() * W;
    const cy = rng() * H;
    const r = (0.18 + rng() * 0.42) * Math.min(W, H);
    const hue = pal.hues[Math.floor(rng() * pal.hues.length)];
    const steps = 22;
    for (let s = steps; s > 0; s -= 1) {
      const f = s / steps;
      g.fill(hue, 60 + rng() * 20, 40 + (1 - f) * 55, 0.05);
      g.ellipse(cx, cy, r * f * 2, r * f * 2 * (0.7 + rng() * 0.5));
    }
  }
}

/** The strand. Two ribbons and their rungs — read as a helix without saying so. */
function paintStrand(g: p5.Graphics, pal: Palette, rng: () => number, W: number, H: number) {
  const amp = H * (0.12 + rng() * 0.1);
  const freq = 1.6 + rng() * 2.4;
  const phase = rng() * Math.PI * 2;
  const midY = H * (0.4 + rng() * 0.2);
  const twist = 0.4 + rng() * 0.6;

  const strandY = (x: number, offset: number) =>
    midY + Math.sin((x / W) * Math.PI * freq + phase + offset) * amp;

  // Rungs first so the ribbons sit on top of them.
  const rungs = 40 + Math.floor(rng() * 40);
  g.strokeWeight(1.4);
  for (let i = 0; i < rungs; i += 1) {
    const x = (i / rungs) * W;
    const y1 = strandY(x, 0);
    const y2 = strandY(x, Math.PI * twist);
    const hue = pal.hues[i % pal.hues.length];
    g.stroke(hue, 70, 92, 0.5 + rng() * 0.4);
    g.line(x, y1, x, y2);
  }

  // Ribbons.
  g.noFill();
  for (const offset of [0, Math.PI * twist]) {
    for (let pass = 0; pass < 3; pass += 1) {
      g.strokeWeight(6 - pass * 1.8);
      g.stroke(pal.accent, 30 + pass * 18, 100, pass === 2 ? 0.9 : 0.16);
      g.beginShape();
      for (let x = 0; x <= W; x += 4) g.vertex(x, strandY(x, offset));
      g.endShape();
    }
  }
}

/** Chromosome barcode — the piece's catalogue number, rendered as light. */
function paintBarcode(g: p5.Graphics, pal: Palette, rng: () => number, W: number, H: number) {
  const stripH = H * (0.05 + rng() * 0.05);
  const y = rng() < 0.5 ? H * 0.06 : H * 0.86;
  g.noStroke();
  let x = 0;
  while (x < W) {
    const w = 2 + rng() * 14;
    if (rng() > 0.35) {
      const hue = pal.hues[Math.floor(rng() * pal.hues.length)];
      g.fill(hue, 20 + rng() * 60, 95, 0.5 + rng() * 0.5);
      g.rect(x, y, w, stripH);
    }
    x += w + rng() * 5;
  }
}

/** Splice — where the artistry happens. Slices displaced, then re-seated. */
function paintSplice(g: p5.Graphics, rng: () => number, W: number, H: number, intensity: number) {
  const slices = Math.floor(4 + intensity * 14);
  for (let i = 0; i < slices; i += 1) {
    const sy = rng() * H;
    const sh = 3 + rng() * (H * 0.06);
    const dx = (rng() - 0.5) * W * 0.22 * intensity;
    const slice = g.get(0, sy, W, sh);
    g.push();
    g.tint(0, 0, 100, 0.85);
    g.image(slice, dx, sy);
    g.pop();
  }
}

/** Halo — the Osiris signature. Every piece leaves the gallery wearing one. */
function paintHalo(g: p5.Graphics, pal: Palette, rng: () => number, W: number, H: number) {
  const cx = W * (0.3 + rng() * 0.4);
  const cy = H * (0.25 + rng() * 0.3);
  const r = Math.min(W, H) * (0.16 + rng() * 0.14);
  g.noFill();
  for (let i = 0; i < 5; i += 1) {
    g.strokeWeight(1 + rng() * 2.5);
    g.stroke((pal.accent + i * 14) % 360, 40, 100, 0.14 + rng() * 0.2);
    g.ellipse(cx, cy, r * 2 + i * 9, r * 2 * (0.28 + rng() * 0.12) + i * 4);
  }
}

export interface PaintedPiece {
  /** The canvas as hung on the wall. */
  art: p5.Graphics;
  /** Its light on the floor: lower half, mirrored, falloff already baked in. */
  reflection: p5.Graphics;
  /**
   * The work's own width/height. The wall sizes a frame's aperture from this,
   * so nothing is ever matted out to a house format.
   */
  aspect: number;
}

/**
 * The floor spill, rendered once. Doing this per frame would mean a `get()`
 * pixel readback every frame, which stalls the whole room.
 */
function bakeReflection(p: p5, art: p5.Graphics, W: number, H: number): p5.Graphics {
  const rH = Math.floor(H / 2);
  const r = p.createGraphics(W, rH);

  // Flip so the artwork's bottom edge lands at the reflection's top edge —
  // the horizon is where the wall and its spill meet.
  r.push();
  r.scale(1, -1);
  r.image(art, 0, -H, W, H);
  r.pop();

  // Punch a gradient out of the alpha channel so the spill fades toward the viewer.
  const ctx = r.drawingContext as CanvasRenderingContext2D;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const grad = ctx.createLinearGradient(0, 0, 0, rH);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, rH);
  ctx.restore();

  return r;
}

/**
 * Paint one marker. Deterministic in `piece.id` + `piece.genotype`.
 * Returns buffers the gallery can hang and re-hang for free.
 */
export function paintPiece(p: p5, piece: Piece, W: number, H: number): PaintedPiece {
  const g = p.createGraphics(W, H);
  const rng = makeRng(hashString(`${piece.id}:${piece.genotype ?? ''}`));

  g.colorMode(g.HSB, 360, 100, 100, 1);
  g.noStroke();

  const pal = derivePalette(piece, rng);

  // Magnitude is SNPedia's word for "how much this one matters". Loudness follows.
  const mag = piece.magnitude ?? 1.5;
  const intensity = Math.max(0.15, Math.min(1, mag / 6));

  paintWash(g, pal, rng, W, H);
  paintStrand(g, pal, rng, W, H);
  paintHalo(g, pal, rng, W, H);
  paintBarcode(g, pal, rng, W, H);
  paintSplice(g, rng, W, H, intensity);

  // Seat everything behind a little glass.
  g.noStroke();
  g.fill(0, 0, 100, 0.05);
  g.rect(0, 0, W, H * 0.42);

  return { art: g, reflection: bakeReflection(p, g, W, H), aspect: W / H };
}

/**
 * Seat a curated collection image in the same buffer and reflection system as
 * generated marker art.
 *
 * The buffer takes the *source's* proportions rather than a house format. A
 * portrait work matted into a landscape buffer is where the black bars came
 * from, and no amount of framing hides them — the fix has to be here, so the
 * wall can cut an aperture to the work's own shape.
 *
 * `budgetW`/`budgetH` are a paint budget, not a size: a tall work and a wide
 * one cost the same texture memory.
 */
export function paintImagePiece(
  p: p5,
  image: p5.Image,
  budgetW: number,
  budgetH: number,
): PaintedPiece {
  const aspect = image.width > 0 && image.height > 0 ? image.width / image.height : 1;

  let w = Math.sqrt(budgetW * budgetH * aspect);
  let h = w / aspect;
  const cap = Math.max(budgetW, budgetH);
  if (w > cap) {
    w = cap;
    h = w / aspect;
  }
  if (h > cap) {
    h = cap;
    w = h * aspect;
  }

  const g = p.createGraphics(Math.max(2, Math.round(w)), Math.max(2, Math.round(h)));

  // Works with transparency (the collection carries a few) sit on paper rather
  // than on a hole through to the wall behind.
  g.background(240, 237, 229);
  g.image(image, 0, 0, g.width, g.height);

  return {
    art: g,
    reflection: bakeReflection(p, g, g.width, g.height),
    aspect,
  };
}
