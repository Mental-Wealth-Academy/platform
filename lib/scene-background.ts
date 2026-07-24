// The daily-rotating pixel-art backdrop. Blue's stage on /dao and the quest
// board on /quests both draw from this so the two surfaces show the same scene
// on any given day.

// bg-02 through bg-04 were removed from the rotation and must never be selected again.
const BACKGROUND_INDICES = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** Path to today's scene image, e.g. `/backgrounds/bg-11.png`. */
export function dailySceneBackgroundUrl(): string {
  return `/backgrounds/bg-${pad(BACKGROUND_INDICES[dayOfYear() % BACKGROUND_INDICES.length])}.png`;
}
