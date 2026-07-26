import type { AiTaskName, AiTaskProfile } from './types';

const ELIZA_SONNET = {
  provider: 'eliza',
  model: 'anthropic/claude-sonnet-4.6',
} as const;

/**
 * DeepSeek retired the `deepseek-chat` slug; the API now serves
 * `deepseek-v4-flash` and `deepseek-v4-pro`. The old name returns a 400, which
 * silently removed the fallback for every task at once. The env overrides let a
 * future rename be handled without a deploy.
 */
const DEEPSEEK_FLASH = {
  provider: 'deepseek',
  model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-v4-flash',
} as const;

const DEEPSEEK_PRO = {
  provider: 'deepseek',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
} as const;

/**
 * Central task policy. Model IDs are deliberately fixed here rather than read
 * from route-specific environment variables. Provider responses still report
 * their actual model, which is captured in telemetry.
 *
 * VIP research is intentionally absent: that product has been sunset.
 */
export const AI_TASK_PROFILES: Readonly<Record<AiTaskName, AiTaskProfile>> = {
  guide_advisory: {
    task: 'guide_advisory',
    promptVersion: 'guide-advisory-v2',
    providers: [ELIZA_SONNET, DEEPSEEK_PRO],
    maxInputChars: 180_000,
    maxOutputChars: 12_000,
    maxOutputTokens: 1_800,
    temperature: 0.1,
    overallDeadlineMs: 24_000,
    perAttemptTimeoutMs: 12_000,
    maxTransientRetries: 1,
    maxSchemaRepairs: 1,
    circuitFailureThreshold: 3,
    circuitResetMs: 30_000,
    safetyPolicy: 'reviewed_output',
  },
  blue_chat_short: {
    task: 'blue_chat_short',
    promptVersion: 'blue-chat-runtime-v1',
    providers: [ELIZA_SONNET, DEEPSEEK_FLASH],
    maxInputChars: 24_000,
    maxOutputChars: 4_000,
    maxOutputTokens: 240,
    temperature: 0.5,
    overallDeadlineMs: 30_000,
    perAttemptTimeoutMs: 16_000,
    maxTransientRetries: 1,
    maxSchemaRepairs: 0,
    circuitFailureThreshold: 3,
    circuitResetMs: 30_000,
    safetyPolicy: 'requires_preflight_gate',
  },
  blue_memory_extract: {
    task: 'blue_memory_extract',
    promptVersion: 'blue-memory-extract-v1',
    providers: [DEEPSEEK_FLASH, ELIZA_SONNET],
    maxInputChars: 6_000,
    maxOutputChars: 3_000,
    maxOutputTokens: 220,
    temperature: 0,
    overallDeadlineMs: 16_000,
    perAttemptTimeoutMs: 9_000,
    maxTransientRetries: 1,
    maxSchemaRepairs: 1,
    circuitFailureThreshold: 3,
    circuitResetMs: 30_000,
    safetyPolicy: 'standard',
  },
  content_draft: {
    task: 'content_draft',
    promptVersion: 'content-draft-v1',
    providers: [DEEPSEEK_PRO, ELIZA_SONNET],
    maxInputChars: 40_000,
    maxOutputChars: 24_000,
    maxOutputTokens: 3_000,
    temperature: 0.4,
    overallDeadlineMs: 28_000,
    perAttemptTimeoutMs: 15_000,
    maxTransientRetries: 1,
    maxSchemaRepairs: 1,
    circuitFailureThreshold: 3,
    circuitResetMs: 30_000,
    safetyPolicy: 'reviewed_output',
  },
  structured_extract: {
    task: 'structured_extract',
    promptVersion: 'structured-extract-v1',
    providers: [DEEPSEEK_FLASH, ELIZA_SONNET],
    maxInputChars: 24_000,
    maxOutputChars: 10_000,
    maxOutputTokens: 1_200,
    temperature: 0,
    overallDeadlineMs: 12_000,
    perAttemptTimeoutMs: 7_000,
    maxTransientRetries: 1,
    maxSchemaRepairs: 1,
    circuitFailureThreshold: 3,
    circuitResetMs: 30_000,
    safetyPolicy: 'standard',
  },
  safety_review: {
    task: 'safety_review',
    promptVersion: 'safety-review-v1',
    providers: [ELIZA_SONNET, DEEPSEEK_PRO],
    maxInputChars: 24_000,
    maxOutputChars: 8_000,
    maxOutputTokens: 1_000,
    temperature: 0,
    overallDeadlineMs: 12_000,
    perAttemptTimeoutMs: 7_000,
    maxTransientRetries: 1,
    maxSchemaRepairs: 1,
    circuitFailureThreshold: 2,
    circuitResetMs: 45_000,
    safetyPolicy: 'reviewed_output',
  },
};

export function getAiTaskProfile(task: AiTaskName): AiTaskProfile {
  return AI_TASK_PROFILES[task];
}
