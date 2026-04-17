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
        src: '/icons/badge-academy.png',
        sizes: '391x391',
        type: 'image/png',
      },
    ],
  };
}
