import { describe, expect, it } from 'vitest';
import { DUMMY_CHAT_SCRIPTS, DUMMY_PERSONAS } from '@/lib/chat-simulator';

describe('chat simulator content integrity', () => {
  it('does not mention trading, markets, charts, or financial trading in any script', () => {
    const forbiddenPattern = /\b(trade|trades|trading|trader|charts|market|markets|panic-sell|stocks?|crypto|leverage|position|positions)\b/i;

    for (const script of DUMMY_CHAT_SCRIPTS) {
      const match = script.text.match(forbiddenPattern);
      expect(
        match,
        `Found forbidden trading term "${match?.[0]}" in script: "${script.text}"`
      ).toBeNull();
    }
  });

  it('ensures all personas and scripts are structurally valid', () => {
    expect(DUMMY_PERSONAS.length).toBeGreaterThan(0);
    expect(DUMMY_CHAT_SCRIPTS.length).toBeGreaterThan(0);

    for (const script of DUMMY_CHAT_SCRIPTS) {
      expect(script.text.trim().length).toBeGreaterThan(0);
      expect(script.personaIndex).toBeGreaterThanOrEqual(0);
      expect(script.personaIndex).toBeLessThan(DUMMY_PERSONAS.length);
      expect(['user', 'system']).toContain(script.kind);
    }
  });
});
