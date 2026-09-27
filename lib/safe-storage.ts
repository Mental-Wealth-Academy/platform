/**
 * Safe wrappers around Web Storage.
 *
 * `localStorage` / `sessionStorage` can throw on access (not just on write):
 *  - Chrome with "Block all cookies" / site data disabled -> SecurityError
 *  - Sandboxed iframes without `allow-same-origin`
 *  - Some privacy extensions and enterprise policies
 *
 * A throw during render (e.g. a `useState` initializer) crashes the whole
 * React tree. These helpers degrade gracefully instead.
 */

function getStore(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getStorageItem(key: string, kind: 'local' | 'session' = 'local'): string | null {
  const store = getStore(kind);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

export function setStorageItem(key: string, value: string, kind: 'local' | 'session' = 'local'): boolean {
  const store = getStore(kind);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded or access denied — caller treats storage as best-effort.
    return false;
  }
}

export function removeStorageItem(key: string, kind: 'local' | 'session' = 'local'): boolean {
  const store = getStore(kind);
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export const safeStorage = {
  getItem: getStorageItem,
  setItem: setStorageItem,
  removeItem: removeStorageItem,
};
