import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  extractFirstUrl,
  isSafePublicUrl,
  isPrivateHost,
  canReviewUrl,
  recordReviewedUrl,
  generateBlueReview,
  BLUE_USER_ID,
  BLUE_USERNAME,
  BLUE_AVATAR_URL,
} from '@/lib/blue-link-reviewer';

describe('Blue link reviewer URL extraction and SSRF validation', () => {
  it('extracts the first valid http/https URL', () => {
    expect(extractFirstUrl('Check this out: https://nature.com/articles/s41586-024')).toBe(
      'https://nature.com/articles/s41586-024'
    );
    expect(extractFirstUrl('Here is http://example.org and another https://test.com')).toBe(
      'http://example.org/'
    );
  });

  it('rejects text without URLs or invalid schemes', () => {
    expect(extractFirstUrl('Hello world no link here')).toBeNull();
    expect(extractFirstUrl('ftp://example.com/file')).toBeNull();
    expect(extractFirstUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects private and internal addresses for SSRF protection', () => {
    expect(isPrivateHost('localhost')).toBe(true);
    expect(isPrivateHost('127.0.0.1')).toBe(true);
    expect(isPrivateHost('0.0.0.0')).toBe(true);
    expect(isPrivateHost('::1')).toBe(true);
    expect(isPrivateHost('10.0.0.1')).toBe(true);
    expect(isPrivateHost('172.16.0.5')).toBe(true);
    expect(isPrivateHost('172.31.255.255')).toBe(true);
    expect(isPrivateHost('192.168.1.1')).toBe(true);
    expect(isPrivateHost('169.254.169.254')).toBe(true);
    expect(isPrivateHost('server.internal')).toBe(true);
    expect(isPrivateHost('app.local')).toBe(true);
  });

  it('allows safe public hosts', () => {
    expect(isPrivateHost('nature.com')).toBe(false);
    expect(isPrivateHost('github.com')).toBe(false);
    expect(isPrivateHost('news.ycombinator.com')).toBe(false);
  });

  it('validates public URLs correctly', () => {
    expect(isSafePublicUrl('https://example.com/article')).toBe(true);
    expect(isSafePublicUrl('http://127.0.0.1:8080/admin')).toBe(false);
    expect(isSafePublicUrl('http://localhost:3000')).toBe(false);
    expect(isSafePublicUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
  });
});

describe('Blue link reviewer profile invariants', () => {
  it('uses Blue profile details as a regular user', () => {
    expect(BLUE_USER_ID).toBe('blue-agent');
    expect(BLUE_USERNAME).toBe('Blue');
    expect(BLUE_AVATAR_URL).toBe('/prompts/CharacterBlue.png');
  });

  it('generates fallback review when AI is not invoked, respecting house rules', async () => {
    const review = await generateBlueReview({
      url: 'https://example.com/study',
      title: 'Neuroplasticity in Adult Learning',
      description: 'A study on adult neuroplasticity and cognitive retention.',
      snippet: 'Adult learning models show significant structural changes with daily repetition.',
    });

    expect(review).toContain('Neuroplasticity in Adult Learning');
    // House rules: no emojis, no all-caps
    expect(review).not.toMatch(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}]/u);
    expect(review).not.toMatch(/\b[A-Z]{3,}\b/);
  });
});

describe('Blue link review deduplication and rate limiting', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('enforces cooldown and deduplication', () => {
    const testUrl = 'https://example.com/new-paper-' + Date.now();
    expect(canReviewUrl(testUrl)).toBe(true);
    recordReviewedUrl(testUrl);
    // Immediate subsequent check should be throttled by cooldown
    expect(canReviewUrl(testUrl)).toBe(false);
  });
});
