import { Capacitor } from '@capacitor/core';

/**
 * Returns true if the application is running inside a native mobile container (iOS or Android).
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

/**
 * Returns true if running natively on iOS.
 */
export function isNativeIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Returns true if running in a standard web browser (desktop or mobile Safari/Chrome).
 */
export function isWebPlatform(): boolean {
  if (typeof window === 'undefined') return true;
  return Capacitor.getPlatform() === 'web';
}
