import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/home',
    name: 'Mental Wealth Academy',
    short_name: 'MWA',
    description: 'Mental Wealth Academy installed on your home screen for faster access.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
