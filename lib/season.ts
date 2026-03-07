/**
 * Universal Season Timer
 *
 * All users share the same schedule. One week unlocks at a time.
 * Weeks 1-12 unlock sequentially, one per 7-day window.
 * Week 1 starts on SEASON_START_DATE. Week 2 starts 7 days later. Etc.
 *
 * Set SEASON_START_DATE in env to control when the season begins.
 * Format: ISO 8601, e.g. "2026-03-10T00:00:00Z"
 */

const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getSeasonStartDate(): Date {
  const env = process.env.SEASON_START_DATE;
  if (env) return new Date(env);
  // Default: Season 1 starts Monday March 2, 2026
  return new Date('2026-03-02T00:00:00Z');
}

export interface SeasonInfo {
  seasonStartDate: string;
  currentWeek: number;       // 1-12, which week is currently active
  weekStartedAt: string;     // when the current week window opened
  weekEndsAt: string;        // when the current week window closes
  msUntilNextWeek: number;   // countdown to next week unlock
  seasonActive: boolean;     // has the season started?
  seasonComplete: boolean;   // have all 12 weeks elapsed?
}

export function getSeasonInfo(): SeasonInfo {
  const start = getSeasonStartDate();
  const now = new Date();
  const elapsed = now.getTime() - start.getTime();

  // Season hasn't started yet
  if (elapsed < 0) {
    return {
      seasonStartDate: start.toISOString(),
      currentWeek: 0,
      weekStartedAt: start.toISOString(),
      weekEndsAt: start.toISOString(),
      msUntilNextWeek: Math.abs(elapsed),
      seasonActive: false,
      seasonComplete: false,
    };
  }

  // Week 1 starts at elapsed=0, Week 2 at +7 days, etc.
  const rawWeek = Math.floor(elapsed / WEEK_DURATION_MS) + 1;
  const currentWeek = Math.min(rawWeek, 12);
  const seasonComplete = rawWeek > 12;

  const weekStartMs = start.getTime() + (currentWeek - 1) * WEEK_DURATION_MS;
  const weekEndMs = start.getTime() + currentWeek * WEEK_DURATION_MS;
  const msUntilNextWeek = seasonComplete ? 0 : Math.max(0, weekEndMs - now.getTime());

  return {
    seasonStartDate: start.toISOString(),
    currentWeek,
    weekStartedAt: new Date(weekStartMs).toISOString(),
    weekEndsAt: new Date(weekEndMs).toISOString(),
    msUntilNextWeek,
    seasonActive: true,
    seasonComplete,
  };
}
