import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('sunset Blue research product', () => {
  it('removes the activation endpoint and prerecorded product clip', () => {
    expect(existsSync(resolve(process.cwd(), 'app/api/research/activate/route.ts'))).toBe(false);
    for (const clip of [
      'faq-research-mode.mp3',
      'greeting-text.mp3',
      'faq-identity.mp3',
    ]) {
      expect(
        existsSync(resolve(process.cwd(), 'public/audio/blue-voice', clip)),
      ).toBe(false);
    }
  });

  it('removes the dedicated model, prompt, and paid-mode branch', () => {
    const route = readRepoFile('app/api/chat/blue/route.ts');

    expect(route).not.toContain('RESEARCH_MODEL');
    expect(route).not.toContain('RESEARCH_SYSTEM_PROMPT');
    expect(route).not.toContain("body.mode === 'research'");
    expect(route).not.toContain('isResearch');
  });

  it('removes the product from configuration, voice clips, and fallback copy', () => {
    expect(readRepoFile('.env.example')).not.toContain('RESEARCH_MODEL=');
    for (const path of [
      'app/api/voice/tts/route.ts',
      'scripts/generate-blue-voice-clips.ts',
    ]) {
      const voiceSource = readRepoFile(path);
      expect(voiceSource).not.toContain('faq-research-mode');
      expect(voiceSource).not.toContain('your research partner in the digital matrix');
      expect(voiceSource).not.toContain('scientist, researcher, BCI');
    }
    expect(readRepoFile('components/blue-chat/BlueChat.tsx')).not.toContain(
      'research mode is a VIP',
    );
    expect(readRepoFile('lib/blue-knowledge.ts')).not.toContain(
      'VIP-membership writing partner',
    );
  });
});
