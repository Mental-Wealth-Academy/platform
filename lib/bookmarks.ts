import { getStorageItem, setStorageItem } from './safe-storage';

const BOOKMARKS_KEY = 'mwa-bookmarked-guides';
const BOOKMARKS_EVENT = 'mwaBookmarksUpdated';

export function getBookmarkedSlugs(): string[] {
  try {
    const raw = getStorageItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isBookmarked(slug: string): boolean {
  return getBookmarkedSlugs().includes(slug);
}

export function toggleBookmark(slug: string): void {
  const current = getBookmarkedSlugs();
  let next: string[];
  if (current.includes(slug)) {
    next = current.filter(s => s !== slug);
  } else {
    next = [...current, slug];
  }
  setStorageItem(BOOKMARKS_KEY, JSON.stringify(next));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BOOKMARKS_EVENT));
  }
}

export function onBookmarksUpdated(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onEvent = () => callback();
  const onStorage = (event: StorageEvent) => {
    if (event.key === BOOKMARKS_KEY) callback();
  };
  window.addEventListener(BOOKMARKS_EVENT, onEvent);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(BOOKMARKS_EVENT, onEvent);
    window.removeEventListener('storage', onStorage);
  };
}
