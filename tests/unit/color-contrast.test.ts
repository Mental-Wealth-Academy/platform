import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'styles/color-system.css'), 'utf8');
const root = css.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? '';
const variables = new Map<string, string>();

for (const match of root.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
  variables.set(match[1], match[2].trim());
}

/**
 * Resolve a semantic token to sRGB. The palette is authored in a mix of hex and
 * oklch, and either has to be measurable or the contrast gate silently stops
 * covering whichever tokens moved to the other notation.
 */
function resolveSrgb(token: string, seen = new Set<string>()): [number, number, number] {
  if (seen.has(token)) throw new Error(`Circular color token: ${token}`);
  seen.add(token);
  const value = variables.get(token);
  if (!value) throw new Error(`Missing color token: ${token}`);
  if (/^#[\da-f]{6}$/i.test(value)) return hexToSrgb(value);

  const oklch = value.match(
    /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*\)$/i,
  );
  if (oklch) {
    return oklchToSrgb(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]));
  }

  const reference = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!reference) {
    throw new Error(
      `${token} must resolve to a hex or plain oklch value for contrast testing, received ${value}`,
    );
  }
  return resolveSrgb(reference, seen);
}

function hexToSrgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255) as [number, number, number];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const linear = rgb.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: [number, number, number], background: [number, number, number]): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function compositeRgba(value: string, background: [number, number, number]): [number, number, number] {
  const match = value.match(/^rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)$/);
  if (!match) throw new Error(`Expected rgba color, received ${value}`);
  const alpha = Number(match[4]);
  const foreground = [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as [number, number, number];
}

function oklchToSrgb(lightness: number, chroma: number, hue: number): [number, number, number] {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((channel) => {
    const clipped = Math.max(0, Math.min(1, channel));
    return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
  }) as [number, number, number];
}

describe('semantic color contrast', () => {
  const pairs = [
    ['--color-text-dark', '--color-canvas'],
    ['--color-on-action', '--color-action'],
    ['--color-on-positive', '--color-positive'],
    ['--color-on-accent', '--color-accent'],
    ['--color-on-warning', '--color-warning'],
    ['--color-warning-text', '--color-canvas'],
    ['--color-on-danger', '--color-danger'],
  ] as const;

  for (const [foreground, background] of pairs) {
    it(`${foreground} passes on ${background}`, () => {
      const ratio = contrast(resolveSrgb(foreground), resolveSrgb(background));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('keeps every optional action theme readable with small on-action text', () => {
    const actionLightness = Number(css.match(/--color-action:\s*oklch\(([\d.]+)%/)?.[1]) / 100;
    const themes = Array.from(css.matchAll(/\[data-color="([^"]+)"\]\s*{\s*--accent-h:\s*([\d.]+);\s*--accent-c:\s*([\d.]+);/g));
    const onAction = resolveSrgb('--color-on-action');

    expect(themes.length).toBeGreaterThan(0);
    for (const [, name, hue, chroma] of themes) {
      const ratio = contrast(onAction, oklchToSrgb(actionLightness, Number(chroma), Number(hue)));
      expect(ratio, `${name} action contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps muted light-mode text readable on the canvas', () => {
    const canvas = resolveSrgb('--color-canvas');
    const muted = compositeRgba(variables.get('--color-text-muted') ?? '', canvas);
    expect(contrast(muted, canvas)).toBeGreaterThanOrEqual(4.5);
  });
});
