import React from 'react';
import styles from './CourseFolderCard.module.css';

/**
 * Dotted line-art that fills a folder body. Every motif is drawn in the same
 * 200x200 box, from the same dotted vocabulary (dotted rings, dotted paths,
 * node dots), so a row of folders reads as one family while each folder stays
 * recognisable on its own.
 */
export type FolderMotif =
  | 'orbit'
  | 'waveform'
  | 'beam'
  | 'spiral'
  | 'lattice'
  | 'bloom'
  | 'bars';

const polar = (angle: number, radius: number, cx = 100, cy = 100) => ({
  x: cx + Math.cos(angle) * radius,
  y: cy + Math.sin(angle) * radius,
});

/** Sampled path through a function, so a curve can carry a dotted dash. */
function sampledPath(from: number, to: number, step: number, y: (x: number) => number) {
  const points: string[] = [];
  for (let x = from; x <= to + 0.001; x += step) {
    points.push(`${points.length === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y(x).toFixed(2)}`);
  }
  return points.join(' ');
}

function Orbit() {
  const dots = Array.from({ length: 12 }, (_, i) => polar((i / 12) * Math.PI * 2 - Math.PI / 2, 82));
  const spokes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const inner = polar(angle, 30);
    const outer = polar(angle, 72);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });

  return (
    <>
      <circle cx="100" cy="100" r="82" className={styles.motifOrbit} />
      <circle cx="100" cy="100" r="62" className={styles.motifDashed} />
      <circle cx="100" cy="100" r="30" className={styles.motifInner} />
      {spokes.map((spoke, i) => (
        <line key={`spoke-${i}`} {...spoke} className={styles.motifSpoke} />
      ))}
      {dots.map((dot, i) => (
        <circle key={`dot-${i}`} cx={dot.x} cy={dot.y} r={3.5} className={styles.motifDot} />
      ))}
      <circle cx="100" cy="100" r="5.5" className={styles.motifCore} />
    </>
  );
}

/** Two periods of a sine, for the recorded-lecture folders. */
function Waveform() {
  const amp = 36;
  const wave = (x: number) => 100 - amp * Math.sin(((x - 20) / 160) * Math.PI * 4);
  const extrema = [40, 80, 120, 160].map((x) => ({ x, y: wave(x) }));

  return (
    <>
      <line x1="20" y1="100" x2="180" y2="100" className={styles.motifSpoke} />
      <path d={sampledPath(20, 180, 2, wave)} className={styles.motifInner} />
      {[20, 100, 180].map((x, i) => (
        <line key={`tick-${i}`} x1={x} y1="86" x2={x} y2="114" className={styles.motifSpoke} />
      ))}
      {extrema.map((p, i) => (
        <circle key={`peak-${i}`} cx={p.x} cy={p.y} r={3.5} className={styles.motifDot} />
      ))}
    </>
  );
}

/** A fan of rays from a single source down to a screen line. */
function Beam() {
  const rays = Array.from({ length: 5 }, (_, i) => {
    const angle = (Math.PI / 2) * (0.58 + (i / 4) * 0.84);
    const end = polar(angle, 118, 100, 42);
    return { x1: 100, y1: 48, x2: end.x, y2: end.y };
  });

  return (
    <>
      <line x1="34" y1="162" x2="166" y2="162" className={styles.motifInner} />
      {rays.map((ray, i) => (
        <line key={`ray-${i}`} {...ray} className={styles.motifSpoke} />
      ))}
      <circle cx="100" cy="42" r="18" className={styles.motifOrbit} />
      {rays.map((ray, i) => (
        <circle key={`foot-${i}`} cx={ray.x2} cy={162} r={2.5} className={styles.motifDot} />
      ))}
      <circle cx="100" cy="42" r="5.5" className={styles.motifCore} />
    </>
  );
}

/** Dots stepping outward along an Archimedean spiral. */
function Spiral() {
  const dots = Array.from({ length: 34 }, (_, i) => {
    const angle = i * 0.62;
    const radius = 8 + i * 2.35;
    const p = polar(angle - Math.PI / 2, radius);
    return { ...p, r: 1.6 + (i / 33) * 2.4 };
  });

  return (
    <>
      <circle cx="100" cy="100" r="88" className={styles.motifDashed} />
      {dots.map((dot, i) => (
        <circle key={`turn-${i}`} cx={dot.x} cy={dot.y} r={dot.r} className={styles.motifDot} />
      ))}
      <circle cx="100" cy="100" r="4.5" className={styles.motifCore} />
    </>
  );
}

/** A workbench grid with one path traced across it. */
function Lattice() {
  const coords = [34, 67, 100, 133, 166];
  const nodes = coords.flatMap((x) => coords.map((y) => ({ x, y })));
  const route = 'M34 133 L67 67 L100 100 L133 34 L166 100';

  return (
    <>
      {coords.map((y, i) => (
        <line key={`row-${i}`} x1="34" y1={y} x2="166" y2={y} className={styles.motifSpoke} />
      ))}
      <path d={route} className={styles.motifInner} />
      {nodes.map((node, i) => (
        <circle key={`node-${i}`} cx={node.x} cy={node.y} r={2.2} className={styles.motifDot} />
      ))}
      <circle cx="100" cy="100" r="5" className={styles.motifCore} />
    </>
  );
}

/** Three overlapping rings — the shape a circle of people makes. */
function Bloom() {
  const rings = Array.from({ length: 3 }, (_, i) => polar((i / 3) * Math.PI * 2 - Math.PI / 2, 36));

  return (
    <>
      {rings.map((ring, i) => (
        <circle
          key={`ring-${i}`}
          cx={ring.x}
          cy={ring.y}
          r={44}
          className={i === 1 ? styles.motifDashed : styles.motifOrbit}
        />
      ))}
      {rings.map((ring, i) => (
        <circle key={`seat-${i}`} cx={ring.x} cy={ring.y} r={4} className={styles.motifDot} />
      ))}
      <circle cx="100" cy="100" r="5.5" className={styles.motifCore} />
    </>
  );
}

/** Columns stepping up from a dotted baseline. */
function Bars() {
  const heights = [52, 88, 34, 116, 70, 98];

  return (
    <>
      <line x1="26" y1="164" x2="174" y2="164" className={styles.motifInner} />
      {heights.map((h, i) => {
        const x = 34 + i * 26;
        return (
          <React.Fragment key={`bar-${i}`}>
            <line x1={x} y1="164" x2={x} y2={164 - h} className={styles.motifSpoke} />
            <circle cx={x} cy={164 - h} r={3.5} className={styles.motifDot} />
          </React.Fragment>
        );
      })}
      <path d="M34 112 L60 76 L86 130 L112 48 L138 94 L164 66" className={styles.motifDashed} />
    </>
  );
}

const MOTIFS: Record<FolderMotif, () => React.JSX.Element> = {
  orbit: Orbit,
  waveform: Waveform,
  beam: Beam,
  spiral: Spiral,
  lattice: Lattice,
  bloom: Bloom,
  bars: Bars,
};

export default function FolderMotifArt({ motif }: { motif: FolderMotif }) {
  const Motif = MOTIFS[motif] ?? Orbit;
  return (
    <svg className={styles.motif} viewBox="0 0 200 200" aria-hidden="true">
      <Motif />
    </svg>
  );
}
