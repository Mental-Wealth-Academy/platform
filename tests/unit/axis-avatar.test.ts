import { describe, expect, it } from 'vitest';
import {
  ACCESSORY_TRAITS,
  BACKGROUND_TRAITS,
  CHASSIS_TRAITS,
  HEADGEAR_TRAITS,
  OUTFIT_TRAITS,
  VISOR_TRAITS,
  buildAxisAvatarUrl,
  getAxisAvatarParams,
  normalizeAvatarUrl,
  renderAxisAvatarSvg,
} from '@/lib/axis-avatar';
import { getAssignedAvatars, isAvatarValidForUser } from '@/lib/avatars';

describe('grok-bot avatars', () => {
  it('provides 50 distinct traits across 6 categories', () => {
    expect(BACKGROUND_TRAITS).toHaveLength(10);
    expect(CHASSIS_TRAITS).toHaveLength(8);
    expect(VISOR_TRAITS).toHaveLength(8);
    expect(HEADGEAR_TRAITS).toHaveLength(8);
    expect(OUTFIT_TRAITS).toHaveLength(8);
    expect(ACCESSORY_TRAITS).toHaveLength(8);

    const totalTraits =
      BACKGROUND_TRAITS.length +
      CHASSIS_TRAITS.length +
      VISOR_TRAITS.length +
      HEADGEAR_TRAITS.length +
      OUTFIT_TRAITS.length +
      ACCESSORY_TRAITS.length;
    expect(totalTraits).toBe(50);
  });

  it('returns the same parameters and SVG for the same seed', () => {
    const seed = 'user-123#r2#4';

    expect(getAxisAvatarParams(seed)).toEqual(getAxisAvatarParams(seed));
    expect(renderAxisAvatarSvg(seed)).toBe(renderAxisAvatarSvg(seed));
  });

  it('creates six unique same-origin choices per user generation', () => {
    const choices = getAssignedAvatars('user-123', 2);

    expect(choices).toHaveLength(6);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(6);
    expect(choices.every((choice) => choice.image_url.startsWith('/api/avatars/render?seed='))).toBe(true);
    expect(choices.every((choice) => !choice.image_url.includes('dicebear'))).toBe(true);
    expect(choices.every((choice) => isAvatarValidForUser('user-123', choice.id, 2))).toBe(true);
  });

  it('renders a valid SVG without including the raw seed', () => {
    const seed = '<script>alert(1)</script>';
    const svg = renderAxisAvatarSvg(seed);

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).not.toContain(seed);
    expect(svg).not.toContain('<script>');
  });

  it('encodes seeds and converts legacy generated URLs', () => {
    expect(buildAxisAvatarUrl('user#r2#4')).toBe('/api/avatars/render?seed=user%23r2%234');
    expect(
      normalizeAvatarUrl('https://api.dicebear.com/10.x/shape-grid/svg?seed=user%23r2%234'),
    ).toBe('/api/avatars/render?seed=user%23r2%234');
  });

  it('preserves custom uploads and missing avatars', () => {
    const uploaded = 'https://project.supabase.co/storage/v1/object/public/uploads/avatar.webp';

    expect(normalizeAvatarUrl(uploaded, 'fallback#0')).toBe(uploaded);
    expect(normalizeAvatarUrl(null, 'fallback#0')).toBeNull();
  });
});
