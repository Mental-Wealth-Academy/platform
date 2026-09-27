import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(
    {
      id: '/home',
      name: 'Mental Wealth Academy',
      short_name: 'MWA',
      description: 'Mental Wealth Academy installed on your home screen for faster access.',
      start_url: '/home',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#FFFFFF',
      theme_color: '#FFFFFF',
      icons: [
        {
          src: '/icons/icon-192.png?v=4',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png?v=4',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icons/icon-512.png?v=4',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    },
  );
}
