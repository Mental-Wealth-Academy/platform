'use client';

import { useEffect, useRef, useState } from 'react';
import type p5 from 'p5';
import { paintImagePiece, paintPiece, type PaintedPiece, type Piece } from './snpArt';
import styles from './OsirisGallery.module.css';

interface OsirisGalleryProps {
  pieces: Piece[];
  selectedId?: string | null;
  /** Deliberate: the piece was clicked. This is a request to read it. */
  onSelect: (piece: Piece) => void;
  /** Incidental: the piece you happen to be standing in front of changed. */
  onFocus?: (piece: Piece) => void;
}

/** World spacing between hangings, in canvas pixels. */
const SLOT = 620;
/** Source resolution of a painted buffer. Display size is derived from the wall. */
const ART_W = 660;
const ART_H = 440;
const MAX_CACHED = 28;

/* Room props. Parallax above 1 puts a prop nearer the viewer than the wall. */
const PLINTH_PARALLAX = 1.15;
const PLINTH_EVERY = SLOT * 4;
const ORB_PARALLAX = 1.45;
const ORB_EVERY = SLOT * 3;

/* Blue walks the room with you. Her sprites are single frames (there is no walk
 * cycle in the set), so the gait is procedural: a bob and a small squash. */
const BLUE_PARALLAX = 1.15;
/** She stands off to one side of a piece rather than in front of it. */
const BLUE_OFFSET = -SLOT * 0.24;
const BLUE_DIRS = ['north', 'east', 'west', 'south'] as const;
type BlueDir = (typeof BLUE_DIRS)[number];

export function OsirisGallery({ pieces, selectedId, onSelect, onFocus }: OsirisGalleryProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  // The sketch is built once. Everything it needs to read lives in refs, so
  // new search results never tear down the room.
  const piecesRef = useRef(pieces);
  const onSelectRef = useRef(onSelect);
  const onFocusRef = useRef(onFocus);
  const targetRef = useRef(0);
  const [focusIndex, setFocusIndex] = useState(0);

  piecesRef.current = pieces;
  onSelectRef.current = onSelect;
  onFocusRef.current = onFocus;

  // Selecting from the terminal below should walk the gallery to that piece.
  useEffect(() => {
    if (!selectedId) return;
    const idx = pieces.findIndex((p) => p.id === selectedId);
    if (idx >= 0) targetRef.current = idx * SLOT;
  }, [selectedId, pieces]);

  useEffect(() => {
    let instance: p5 | null = null;
    let cancelled = false;

    (async () => {
      const P5 = (await import('p5')).default;
      if (cancelled || !hostRef.current) return;

      /**
       * p5's Element.remove() throws on graphics buffers in some construction
       * paths. Disposal happens inside draw() (the room rebakes on resize), and
       * p5 schedules the next frame from inside redraw — so an throwing cleanup
       * kills the loop permanently and the room goes blank for good. Freeing a
       * buffer is best-effort; dropping the reference is enough.
       */
      const disposeGraphics = (g: p5.Graphics | null | undefined) => {
        if (!g) return;
        try {
          g.remove();
        } catch {
          /* GC will take it */
        }
      };

      const sketch = (s: p5) => {
        const cache = new Map<string, PaintedPiece>();
        const order: string[] = [];
        const sourceImages = new Map<string, p5.Image | 'loading' | 'failed'>();
        const blueSprites: Partial<Record<BlueDir, p5.Image>> = {};
        let blueX = 0;
        let camX = 0;
        let dragging = false;
        let dragStartX = 0;
        let dragStartCam = 0;
        let moved = 0;

        const artFor = (piece: Piece): PaintedPiece => {
          const hit = cache.get(piece.id);
          if (hit) return hit;

          let sourceImage: p5.Image | undefined;
          if (piece.imageUrl) {
            const imageState = sourceImages.get(piece.id);
            if (imageState && imageState !== 'loading' && imageState !== 'failed') {
              sourceImage = imageState;
            } else if (!imageState) {
              sourceImages.set(piece.id, 'loading');
              s.loadImage(
                piece.imageUrl,
                (image) => {
                  sourceImages.set(piece.id, image);
                  const placeholder = cache.get(piece.id);
                  disposeGraphics(placeholder?.art);
                  disposeGraphics(placeholder?.reflection);
                  cache.delete(piece.id);
                  const placeholderIndex = order.indexOf(piece.id);
                  if (placeholderIndex >= 0) order.splice(placeholderIndex, 1);
                },
                () => {
                  sourceImages.set(piece.id, 'failed');
                },
              );
            }
          }

          const painted = sourceImage
            ? paintImagePiece(s, sourceImage, ART_W, ART_H)
            : paintPiece(s, piece, ART_W, ART_H);
          cache.set(piece.id, painted);
          order.push(piece.id);
          while (order.length > MAX_CACHED) {
            const evict = order.shift();
            if (evict && evict !== piece.id) {
              const dead = cache.get(evict);
              disposeGraphics(dead?.art);
              disposeGraphics(dead?.reflection);
              cache.delete(evict);
            }
          }
          return painted;
        };

        const horizonY = () => s.height * 0.74;

        /**
         * The house framing stock: moulding, mat, and the mat's cut edge, in wall
         * pixels. Sized off the room rather than off the piece, because a gallery
         * frames a wall in one profile and lets the aperture do the varying.
         */
        const stock = () => {
          const hy = horizonY();
          const band = Math.max(9, Math.min(hy * 0.032, 26));
          const mat = Math.max(10, Math.min(hy * 0.042, 34));
          return { band, mat, pad: band + mat, bevel: Math.max(2, Math.min(mat * 0.22, 6)) };
        };

        /*
         * The room is mostly static: the wall gradient, the oak gradient and the
         * floor sheen never depend on where you are standing. Redrawing them per
         * frame means hundreds of canvas-sized ellipses and the whole thing stalls,
         * so they are baked once per resize and blitted.
         */
        let roomBuf: p5.Graphics | null = null;
        let sheenBuf: p5.Graphics | null = null;
        let poolBuf: p5.Graphics | null = null;
        let poolW = 0;
        let poolH = 0;

        /** Built lazily from draw(), so it can never bake at a size of zero. */
        const buildRoom = () => {
          const W = s.width;
          const H = s.height;
          if (W < 2 || H < 2) return;

          disposeGraphics(roomBuf);
          disposeGraphics(sheenBuf);
          disposeGraphics(poolBuf);

          const hy = horizonY();

          // Wall, oak, and the shadow where they meet.
          const r = s.createGraphics(W, H);
          r.noStroke();
          for (let y = 0; y < hy; y += 2) {
            const t = y / hy;
            const v = 246 - t * 18;
            r.fill(v, v - 1, v - 3);
            r.rect(0, y, W, 3);
          }
          for (let y = hy; y < H; y += 2) {
            const t = (y - hy) / (H - hy);
            r.fill(108 + t * 78, 71 + t * 52, 40 + t * 30);
            r.rect(0, y, W, 3);
          }
          for (let i = 0; i < 16; i += 1) {
            r.fill(120, 112, 104, 5);
            r.rect(0, hy - i * 1.6, W, 2);
          }

          // A gallery wall is painted plaster, not a gradient. Grain both ways
          // keeps the largest flat area on screen from banding into stripes.
          for (let i = 0; i < 1100; i += 1) {
            r.fill(255, 255, 255, 7);
            r.rect(Math.random() * W, Math.random() * hy, 1, 1);
          }
          for (let i = 0; i < 1100; i += 1) {
            r.fill(122, 116, 110, 6);
            r.rect(Math.random() * W, Math.random() * hy, 1, 1);
          }

          // Skirting: the one piece of architecture the room admits to, and the
          // line that makes the wall meet the floor rather than fade into it.
          r.fill(252, 251, 249);
          r.rect(0, hy - 10, W, 10);
          r.fill(226, 223, 218);
          r.rect(0, hy - 2.5, W, 2.5);
          roomBuf = r;

          // Polished floors carry the room's light back up at you. Kept wider than
          // the canvas so the falloff never resolves into a visible edge.
          const sh = s.createGraphics(W, H);
          sh.noStroke();
          for (let i = 0; i < 26; i += 1) {
            const f = i / 26;
            sh.fill(255, 246, 226, 3);
            sh.ellipse(
              W / 2,
              hy + (H - hy) * 0.62,
              W * (3.4 - f * 2.2),
              (H - hy) * (2.2 - f * 1.5),
            );
          }
          sheenBuf = sh;

          // One ceiling fixture's pool of light, stamped wherever a fixture hangs.
          poolW = Math.max(2, Math.ceil(W * 0.34));
          poolH = Math.max(2, Math.ceil(hy * 0.5));
          const pb = s.createGraphics(poolW, poolH);
          pb.noStroke();
          for (let i = 18; i > 0; i -= 1) {
            const f = i / 18;
            pb.fill(255, 253, 244, 4);
            pb.ellipse(poolW / 2, poolH / 2, poolW * f, poolH * f);
          }
          poolBuf = pb;
        };

        const drawRoom = () => {
          if (!roomBuf || !sheenBuf || !poolBuf) return;
          const hy = horizonY();
          const vpX = s.width / 2;

          s.image(roomBuf, 0, 0);

          // Ceiling fixtures drift past as you walk.
          const first = Math.floor((camX - s.width) / SLOT) - 1;
          const last = Math.ceil((camX + s.width) / SLOT) + 1;
          for (let i = first; i <= last; i += 1) {
            const x = s.width / 2 + (i * SLOT - camX);
            s.image(poolBuf, x - poolW / 2, hy * 0.02 - poolH / 2);
          }

          // Plank seams run away from the viewer and converge at the vanishing
          // point. These are the only part of the floor that moves, and they are
          // lines, so they stay cheap.
          const plankW = 78;
          const spread = s.width * 2.4;
          const startX = Math.floor((camX - spread / 2) / plankW) * plankW;
          s.strokeWeight(1.4);
          s.stroke(58, 36, 20, 90);
          for (let wx = startX; wx < camX + spread / 2; wx += plankW) {
            const bx = s.width / 2 + (wx - camX) * 2.1;
            s.line(bx, s.height, vpX, hy);
          }

          // Cross-cuts, compressed toward the horizon.
          s.strokeWeight(1);
          s.stroke(58, 36, 20, 55);
          for (let i = 1; i < 22; i += 1) {
            const t = i / 22;
            s.line(0, hy + (s.height - hy) * Math.pow(t, 2.4), s.width, hy + (s.height - hy) * Math.pow(t, 2.4));
          }
          s.noStroke();

          s.image(sheenBuf, 0, 0);
        };

        /**
         * Screen geometry for a hanging, or null if it is off-stage.
         *
         * The aperture is cut to the work's own proportions and the frame is
         * built outward from it. A tall piece therefore gets a taller frame
         * rather than being matted out to a house format — which is where the
         * dead bands at the sides of the wide works came from.
         */
        const layout = (i: number) => {
          const piece = piecesRef.current[i];
          if (!piece) return null;

          const hy = horizonY();
          const { band, mat, pad, bevel } = stock();
          const aspect = artFor(piece).aspect || 1.5;

          // Two budgets: the gap to the next hanging, and the height of wall
          // between the picture rail and the skirting.
          let aw = SLOT * 0.74 - pad * 2;
          let ah = aw / aspect;
          const maxH = hy * 0.62 - pad * 2;
          if (ah > maxH) {
            ah = maxH;
            aw = ah * aspect;
          }

          const dx = i * SLOT - camX;
          const sx = s.width / 2 + dx;
          const outerWFull = aw + pad * 2;
          if (sx < -outerWFull || sx > s.width + outerWFull) return null;

          // Faux depth: pieces read as further along the wall as they leave centre.
          const off = Math.min(1, Math.abs(dx) / (s.width * 0.75));
          const k = 1 - off * 0.2;

          const outerW = outerWFull * k;
          const outerH = (ah + pad * 2) * k;
          const ox = sx - outerW / 2;

          // Hung on a common centreline, the way a room is hung. A frame tall
          // enough to reach the skirting rises instead of dropping, so the extra
          // height always goes into the wall above rather than into the floor.
          let oy = hy * 0.44 - outerH / 2;
          const lowest = hy - 26;
          if (oy + outerH > lowest) oy = lowest - outerH;
          if (oy < 10) oy = 10;

          return {
            sx,
            off,
            ox,
            oy,
            outerW,
            outerH,
            band: band * k,
            bevel: bevel * k,
            ax: ox + pad * k,
            ay: oy + pad * k,
            aw: aw * k,
            ah: ah * k,
          };
        };

        type Hanging = NonNullable<ReturnType<typeof layout>>;

        /**
         * The frame itself, built outward from the aperture: moulding, a gilt
         * fillet at the sight edge, mat board, and the bevel the mat is cut at.
         *
         * Raw canvas, because the whole illusion is that one length of moulding
         * is lit from the upper left — and that needs a gradient across the
         * frame as a whole, which p5's fill() cannot express.
         */
        const drawFrame = (L: Hanging, alpha: number) => {
          const ctx = s.drawingContext as CanvasRenderingContext2D;
          ctx.save();
          ctx.globalAlpha = alpha;

          // Moulding, as one piece of stock taking the room's light across it.
          const wood = ctx.createLinearGradient(L.ox, L.oy, L.ox + L.outerW, L.oy + L.outerH);
          wood.addColorStop(0, '#4b4653');
          wood.addColorStop(0.34, '#2d2a35');
          wood.addColorStop(1, '#171520');
          ctx.fillStyle = wood;
          ctx.fillRect(L.ox, L.oy, L.outerW, L.outerH);

          // Its outer arris: lit along the top and left, in shadow opposite.
          const edge = Math.max(1.2, L.band * 0.09);
          ctx.fillStyle = 'rgba(255,255,255,0.14)';
          ctx.fillRect(L.ox, L.oy, L.outerW, edge);
          ctx.fillRect(L.ox, L.oy, edge, L.outerH);
          ctx.fillStyle = 'rgba(0,0,0,0.34)';
          ctx.fillRect(L.ox, L.oy + L.outerH - edge, L.outerW, edge);
          ctx.fillRect(L.ox + L.outerW - edge, L.oy, edge, L.outerH);

          // Gilt fillet where the moulding meets the mat.
          const fx = L.ox + L.band;
          const fy = L.oy + L.band;
          const fw = L.outerW - L.band * 2;
          const fh = L.outerH - L.band * 2;
          const gilt = Math.max(1, L.band * 0.07);
          ctx.fillStyle = 'rgba(198,164,92,0.82)';
          ctx.fillRect(fx - gilt, fy - gilt, fw + gilt * 2, fh + gilt * 2);

          // Mat board. Warm rag paper, not the wall's white.
          ctx.fillStyle = '#efece2';
          ctx.fillRect(fx, fy, fw, fh);
          ctx.fillStyle = 'rgba(120,112,98,0.05)';
          ctx.fillRect(fx, fy + fh * 0.55, fw, fh * 0.45);

          // The bevel: the mat is cut at an angle, so its four faces catch the
          // light differently. This is the detail that says "framed" more than
          // the moulding does.
          const { ax, ay, aw, ah, bevel: b } = L;
          const face = (pts: number[][], fill: string) => {
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.closePath();
            ctx.fill();
          };
          face(
            [[ax - b, ay - b], [ax + aw + b, ay - b], [ax + aw, ay], [ax, ay]],
            'rgba(255,254,250,0.95)',
          );
          face(
            [[ax - b, ay - b], [ax, ay], [ax, ay + ah], [ax - b, ay + ah + b]],
            'rgba(250,247,239,0.9)',
          );
          face(
            [[ax - b, ay + ah + b], [ax, ay + ah], [ax + aw, ay + ah], [ax + aw + b, ay + ah + b]],
            'rgba(196,189,174,0.85)',
          );
          face(
            [[ax + aw, ay], [ax + aw + b, ay - b], [ax + aw + b, ay + ah + b], [ax + aw, ay + ah]],
            'rgba(214,207,192,0.85)',
          );

          ctx.restore();
        };

        /** What sits in front of the work: the mat's shadow, then the glass. */
        const drawGlazing = (L: Hanging, alpha: number) => {
          const ctx = s.drawingContext as CanvasRenderingContext2D;
          ctx.save();
          ctx.globalAlpha = alpha;

          // The mat stands proud of the work, so it drops a line of shade onto it.
          const line = Math.max(1, L.bevel * 0.4);
          ctx.fillStyle = 'rgba(24,20,28,0.2)';
          ctx.fillRect(L.ax, L.ay, L.aw, line);
          ctx.fillRect(L.ax, L.ay, line, L.ah);

          // Glass. One raking reflection off the upper left, and nothing else —
          // the room is behind you, and you are not in the picture.
          const sheen = ctx.createLinearGradient(L.ax, L.ay, L.ax + L.aw * 0.85, L.ay + L.ah);
          sheen.addColorStop(0, 'rgba(255,255,255,0.13)');
          sheen.addColorStop(0.3, 'rgba(255,255,255,0.035)');
          sheen.addColorStop(0.46, 'rgba(255,255,255,0)');
          ctx.fillStyle = sheen;
          ctx.fillRect(L.ax, L.ay, L.aw, L.ah);

          ctx.restore();
        };

        const drawHanging = (piece: Piece, i: number) => {
          const L = layout(i);
          if (!L) return;
          const { art, reflection } = artFor(piece);
          const alpha = 1 - L.off * 0.42;

          // Cast shadow on the wall, thrown off the frame's outer edge.
          s.noStroke();
          for (let d = 12; d > 0; d -= 1) {
            s.fill(90, 84, 78, 4);
            s.rect(L.ox - d, L.oy - d + 7, L.outerW + d * 2, L.outerH + d * 2, 3);
          }

          drawFrame(L, alpha);

          // The work, seated in an aperture cut to its own shape — so it fills
          // the opening edge to edge with nothing left over at the sides.
          s.push();
          s.tint(255, 255 * alpha);
          s.image(art, L.ax, L.ay, L.aw, L.ah);
          s.pop();

          drawGlazing(L, alpha);

          // The piece spills its light onto the floor. The falloff is baked into the
          // buffer, so this stays one draw call.
          const hy = horizonY();
          s.push();
          s.tint(255, 58 * (1 - L.off * 0.5));
          s.image(reflection, L.ax, hy, L.aw, L.ah * 0.62);
          s.pop();

          // Selected piece gets a warm accent line under it.
          if (piece.id === piecesRef.current[Math.round(camX / SLOT)]?.id) {
            s.strokeWeight(2);
            s.stroke(214, 178, 96, 190);
            s.line(L.sx - L.outerW * 0.16, L.oy + L.outerH + 14, L.sx + L.outerW * 0.16, L.oy + L.outerH + 14);
          }
        };

        /** A plinth with something on top that never finishes resolving. */
        const drawPlinth = (worldX: number) => {
          const hy = horizonY();
          const x = s.width / 2 + (worldX - camX) * PLINTH_PARALLAX;
          if (x < -260 || x > s.width + 260) return;

          const topY = hy + 22;
          const w = 96;
          const h = s.height - topY - 40;

          s.noStroke();
          s.fill(20, 18, 22, 40);
          s.ellipse(x + 10, topY + h + 6, w * 2.1, 20);

          s.fill(238, 236, 232);
          s.rect(x - w / 2, topY, w, h);
          s.fill(214, 211, 206);
          s.rect(x + w / 2 - 16, topY, 16, h);
          s.fill(250, 249, 246);
          s.rect(x - w / 2, topY, w, 6);

          // Where the sculpture meets the stone. Laid down first, so the form
          // sits in it rather than on top of it.
          s.fill(28, 24, 32, 52);
          s.ellipse(x, topY + 3, 42, 8);

          // The sculpture: a bust that never resolves into a face. Lit from the
          // left like the rest of the room, so it reads as carved rather than as
          // a silhouette pasted onto the plinth. Raw canvas because a true
          // gradient needs a fill p5's fill() cannot express.
          const ctx = s.drawingContext as CanvasRenderingContext2D;
          ctx.save();
          ctx.translate(x, topY);

          // The light rakes across it from the upper left, the way it does off
          // the wall, so the form turns instead of reading as a flat cut-out.
          const stone = ctx.createLinearGradient(-20, -70, 20, -6);
          stone.addColorStop(0, '#6d6879');
          stone.addColorStop(0.42, '#3a3543');
          stone.addColorStop(1, '#15131a');
          ctx.fillStyle = stone;

          // A bust: narrow mount, shoulders, neck, head. The shoulders are what
          // keep it from reading as a chess piece.
          ctx.beginPath();
          ctx.moveTo(-9, 0);
          ctx.lineTo(-10, -12);
          ctx.bezierCurveTo(-20, -18, -23, -28, -21, -36);
          ctx.bezierCurveTo(-15, -44, -8, -46, -6, -54);
          ctx.lineTo(6, -54);
          ctx.bezierCurveTo(8, -46, 15, -44, 21, -36);
          ctx.bezierCurveTo(23, -28, 20, -18, 10, -12);
          ctx.lineTo(9, 0);
          ctx.closePath();
          ctx.fill();

          // Head: bowed, and never given a face.
          ctx.beginPath();
          ctx.ellipse(0, -66, 11.5, 13.5, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };

        /** The orb. Iridescent, patient, always slightly off the ground. */
        const drawOrb = (worldX: number) => {
          // Closer to the viewer than the wall, so it parallaxes faster.
          const x = s.width / 2 + (worldX - camX) * ORB_PARALLAX;
          if (x < -400 || x > s.width + 400) return;

          // Sized off the room, so it stays the same object at any viewport.
          const r = s.height * 0.17;
          const bob = Math.sin(s.frameCount * 0.012) * 6;
          const cy = s.height - r * 0.8 + bob;

          s.noStroke();
          s.fill(30, 22, 18, 42);
          s.ellipse(x, s.height - r * 0.08, r * 1.7, r * 0.24);

          const hx = x - r * 0.34;
          const hy2 = cy - r * 0.38;

          // Bloom: the orb throws a little light before you reach its edge.
          for (let i = 14; i > 0; i -= 1) {
            const f = i / 14;
            s.fill(198, 206, 246, 5);
            s.ellipse(x, cy, r * 2 * (1 + f * 0.42), r * 2 * (1 + f * 0.42));
          }

          // Body. A true radial gradient with its focus at the highlight — stacked
          // ellipses leave a transparent rim and the orb reads as a ghost.
          const ctx = s.drawingContext as CanvasRenderingContext2D;
          const grad = ctx.createRadialGradient(hx, hy2, r * 0.04, x, cy, r * 1.02);
          grad.addColorStop(0, 'rgba(255,255,255,1)');
          grad.addColorStop(0.22, 'rgba(226,240,255,1)');
          grad.addColorStop(0.52, 'rgba(178,199,246,1)');
          grad.addColorStop(0.78, 'rgba(186,166,236,1)');
          grad.addColorStop(0.93, 'rgba(214,168,222,1)');
          grad.addColorStop(1, 'rgba(150,178,226,1)');
          ctx.save();
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, cy, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Specular pin.
          s.fill(255, 255, 255, 210);
          s.ellipse(hx - r * 0.03, hy2 - r * 0.04, r * 0.14, r * 0.1);
        };

        /**
         * Blue, walking the gallery. She trails the camera rather than tracking it,
         * so you arrive at a piece and she catches up — then turns her back to you
         * and looks up at whatever you stopped in front of.
         */
        const drawBlue = () => {
          const hy = horizonY();
          const depth = s.height - hy;
          const target = targetRef.current + BLUE_OFFSET;

          // She trails the camera's 0.09 rather than matching it — she is
          // following, not glued to you. But a fixed ease makes a jump across
          // twenty slots take the same forever as a jump across one, so the ease
          // opens up with distance: she lengthens her stride for the long walk
          // and still settles gently over the last few pixels.
          const gap = target - blueX;
          blueX += gap * Math.min(0.12, 0.045 + (Math.abs(gap) / SLOT) * 0.02);

          const dx = target - blueX;
          const walking = Math.abs(dx) > 2.5;
          const dir: BlueDir = walking ? (dx > 0 ? 'east' : 'west') : 'north';
          const img = blueSprites[dir];
          if (!img) return;

          // Standing still, she shifts her weight. Slow enough to read as
          // breathing rather than as drift.
          const sway = walking ? 0 : Math.sin(s.frameCount * 0.009) * 4;
          const x = s.width / 2 + (blueX + sway - camX) * BLUE_PARALLAX;
          const h = depth * 1.25;
          const w = h;
          if (x < -w || x > s.width + w) return;

          const feetY = hy + depth * 0.52;

          // Gait: a bob at roughly a footfall's cadence, plus the squash that
          // sells weight landing. Idle gets a much slower breath.
          const bob = walking
            ? Math.abs(Math.sin(s.frameCount * 0.22)) * h * 0.035
            : Math.sin(s.frameCount * 0.045) * h * 0.006;
          const squash = walking ? 1 - Math.abs(Math.sin(s.frameCount * 0.22)) * 0.025 : 1;

          s.noStroke();
          s.fill(30, 22, 18, 44);
          s.ellipse(x, feetY, w * 0.3, h * 0.045);

          // Pixel art must not be resampled on the way up, but the paintings and
          // the room must stay smooth — so only her blit runs unsmoothed.
          const ctx = s.drawingContext as CanvasRenderingContext2D;
          const wasSmooth = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          const dh = h * squash;
          s.image(img, x - w / 2, feetY - dh - bob, w, dh);
          ctx.imageSmoothingEnabled = wasSmooth;
        };

        /**
         * Draw every instance of a prop that could reach the stage. A prop at
         * parallax `p` is visible while |worldX - camX| < (width/2 + margin) / p.
         */
        const drawProps = (
          every: number,
          parallax: number,
          offset: number,
          draw: (worldX: number) => void,
        ) => {
          const reach = (s.width / 2 + 460) / parallax;
          const first = Math.floor((camX - reach - offset) / every);
          const last = Math.ceil((camX + reach - offset) / every);
          for (let i = first; i <= last; i += 1) draw(i * every + offset);
        };

        s.setup = () => {
          const host = hostRef.current!;
          const c = s.createCanvas(Math.max(2, host.clientWidth), Math.max(2, host.clientHeight));
          c.parent(host);
          // The room is fill-rate bound, and the extra density buys little on a
          // painted canvas. Cap it at 1.5.
          s.pixelDensity(Math.min(1.5, window.devicePixelRatio || 1));

          // Blue is scenery: if a sprite fails to load the room carries on without
          // her rather than taking the draw loop down.
          for (const d of BLUE_DIRS) {
            s.loadImage(
              `/sprites/blue/blue-${d}.png`,
              (img) => { blueSprites[d] = img; },
              () => {},
            );
          }
        };

        s.draw = () => {
          const list = piecesRef.current;
          camX += (targetRef.current - camX) * 0.09;

          // Track the container here rather than via windowResized or a
          // ResizeObserver. The band changes size for reasons a window-resize
          // event never sees (the sidebar collapsing, the terminal reflowing), and
          // the host can still be unmeasured on the frame the sketch mounts.
          const host = hostRef.current;
          if (host) {
            const w = Math.max(2, host.clientWidth);
            const h = Math.max(2, host.clientHeight);
            if (w !== s.width || h !== s.height) s.resizeCanvas(w, h);
          }

          // The bake is only valid for the size it was made at.
          if (!roomBuf || roomBuf.width !== s.width || roomBuf.height !== s.height) {
            buildRoom();
            if (!roomBuf) return;
          }

          s.background(244, 243, 240);
          drawRoom();

          if (list.length) {
            const centre = Math.round(camX / SLOT);
            const from = Math.max(0, centre - 3);
            const to = Math.min(list.length - 1, centre + 3);

            // Far pieces first so nearer ones overlap them correctly.
            const idx: number[] = [];
            for (let i = from; i <= to; i += 1) idx.push(i);
            idx.sort((a, b) => Math.abs(b * SLOT - camX) - Math.abs(a * SLOT - camX));
            for (const i of idx) drawHanging(list[i], i);
          }

          // Room props sit at fixed world positions and are culled when off-stage,
          // so walking never makes one pop into a new place. Blue shares the
          // plinth's depth, and the orb is nearer the viewer than either.
          drawProps(PLINTH_EVERY, PLINTH_PARALLAX, -SLOT * 0.62, drawPlinth);
          drawBlue();
          drawProps(ORB_EVERY, ORB_PARALLAX, SLOT * 0.5, drawOrb);
        };

        const clampTarget = () => {
          const max = Math.max(0, (piecesRef.current.length - 1) * SLOT);
          targetRef.current = Math.max(0, Math.min(max, targetRef.current));
        };

        const snap = () => {
          targetRef.current = Math.round(targetRef.current / SLOT) * SLOT;
          clampTarget();
          const i = Math.round(targetRef.current / SLOT);
          setFocusIndex(i);
          const piece = piecesRef.current[i];
          if (piece) onFocusRef.current?.(piece);
        };

        s.mousePressed = () => {
          if (s.mouseY < 0 || s.mouseY > s.height) return;
          dragging = true;
          moved = 0;
          dragStartX = s.mouseX;
          dragStartCam = targetRef.current;
        };

        s.mouseDragged = () => {
          if (!dragging) return;
          const dx = s.mouseX - dragStartX;
          moved = Math.max(moved, Math.abs(dx));
          targetRef.current = dragStartCam - dx;
          clampTarget();
        };

        s.mouseReleased = () => {
          if (!dragging) return;
          dragging = false;

          // A click, not a drag: hang whatever was under the cursor.
          if (moved < 6) {
            const list = piecesRef.current;
            const centre = Math.round(camX / SLOT);
            for (let i = Math.max(0, centre - 3); i <= Math.min(list.length - 1, centre + 3); i += 1) {
              const L = layout(i);
              if (!L) continue;
              // The frame is part of the work as far as a click is concerned.
              const inX = s.mouseX >= L.ox && s.mouseX <= L.ox + L.outerW;
              const inY = s.mouseY >= L.oy && s.mouseY <= L.oy + L.outerH;
              if (inX && inY) {
                targetRef.current = i * SLOT;
                setFocusIndex(i);
                onSelectRef.current(list[i]);
                return;
              }
            }
          }
          snap();
        };

        s.mouseWheel = (e: object) => {
          const ev = e as WheelEvent;
          if (s.mouseX < 0 || s.mouseX > s.width || s.mouseY < 0 || s.mouseY > s.height) return;
          targetRef.current += (Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY) * 1.4;
          clampTarget();
          setFocusIndex(Math.round(targetRef.current / SLOT));
          return false;
        };
      };

      instance = new P5(sketch);
    })();

    return () => {
      cancelled = true;
      instance?.remove();
    };
  }, []);

  // A different wing starts at its entrance. This also keeps a long archive
  // position from leaving a shorter collection off-stage after a mode switch.
  const previousPiecesRef = useRef(pieces);
  useEffect(() => {
    if (previousPiecesRef.current === pieces) return;
    previousPiecesRef.current = pieces;
    targetRef.current = 0;
    setFocusIndex(0);
    if (pieces[0]) onFocus?.(pieces[0]);
  }, [pieces, onFocus]);

  const step = (dir: number) => {
    const next = Math.round(targetRef.current / SLOT) + dir;
    const clamped = Math.max(0, Math.min(pieces.length - 1, next));
    targetRef.current = clamped * SLOT;
    setFocusIndex(clamped);
    // Walking is not reading — it moves you, it does not open anything.
    if (pieces[clamped]) onFocus?.(pieces[clamped]);
  };

  const focused = pieces[focusIndex];

  return (
    <div className={styles.gallery}>
      <div ref={hostRef} className={styles.canvasHost} />

      <div className={styles.vignette} aria-hidden="true" />

      <div className={styles.plaque}>
        <p className={styles.plaqueEyebrow}>Osiris Art Gallery of Genetic Research</p>
        {focused ? (
          <>
            <p className={styles.plaqueTitle}>{focused.label}</p>
            {focused.caption && <p className={styles.plaqueCaption}>{focused.caption}</p>}
            {(focused.artist || focused.year) && (
              <p className={styles.plaqueMeta}>
                {[focused.artist, focused.year].filter(Boolean).join(', ')}
              </p>
            )}
            <p className={styles.plaqueIndex}>
              Piece {focusIndex + 1} of {pieces.length.toLocaleString()}
            </p>
          </>
        ) : (
          <p className={styles.plaqueCaption}>The walls are bare. Load a collection to hang it.</p>
        )}
      </div>

      {pieces.length > 0 && (
        <div className={styles.walk}>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={focusIndex <= 0}
            className={styles.walkButton}
            aria-label="Previous piece"
          >
            ‹
          </button>
          <span className={styles.walkHint}>
            Drag to walk · click a piece to {focused?.externalUrl ? 'view details' : 'read it'}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={focusIndex >= pieces.length - 1}
            className={styles.walkButton}
            aria-label="Next piece"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
