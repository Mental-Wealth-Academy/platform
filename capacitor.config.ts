import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'world.mentalwealthacademy.app',
  appName: 'Mental Wealth Academy',
  webDir: 'public',
  server: {
    // When CAPACITOR_SERVER_URL is provided (e.g. http://localhost:3000 during dev),
    // it will load from that server. Otherwise it defaults to production.
    url: process.env.CAPACITOR_SERVER_URL || 'https://mentalwealthacademy.world',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
};

export default config;
