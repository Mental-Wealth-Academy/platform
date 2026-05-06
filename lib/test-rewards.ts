export const TEST_DIFFICULTY_MIN = 80;
export const TEST_DIFFICULTY_MAX = 200;

export function clampTestDifficulty(value: unknown): number {
  return Math.max(TEST_DIFFICULTY_MIN, Math.min(TEST_DIFFICULTY_MAX, Number(value) || 101));
}

export function getTestShardReward(difficulty: number): number {
  const clamped = clampTestDifficulty(difficulty);
  const progress = (clamped - TEST_DIFFICULTY_MIN) / (TEST_DIFFICULTY_MAX - TEST_DIFFICULTY_MIN);
  return 25 + Math.round(progress * 75);
}
