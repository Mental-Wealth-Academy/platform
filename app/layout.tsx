import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { Space_Grotesk, Patrick_Hand, Instrument_Serif, Poppins } from 'next/font/google';
import localFont from 'next/font/local';
import '@/styles/globals.css';
import { RouteShell } from '@/components/layout/RouteShell';

const commitMono = localFont({
  src: [
    { path: './fonts/CommitMono-400-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/CommitMono-400-Italic.otf', weight: '400', style: 'italic' },
    { path: './fonts/CommitMono-700-Regular.otf', weight: '700', style: 'normal' },
    { path: './fonts/CommitMono-700-Italic.otf', weight: '700', style: 'italic' },
  ],
  variable: '--font-commit-mono',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const patrickHand = Patrick_Hand({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-patrick-hand',
  display: 'swap',
});

/* Editorial serif for long-form guide headings. Instrument Serif is the
   free stand-in for PP Editorial New; swap the source here once the
   licensed PP files land in app/fonts/. */
const editorialSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-editorial',
  display: 'swap',
});

const departureMono = localFont({
  src: './fonts/DepartureMono-Regular.otf',
  variable: '--font-departure-mono',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

import { SoundProvider } from '@/components/sound/SoundProvider';
import PwaRegistrar from '@/components/pwa/PwaRegistrar';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Mental Wealth Academy',
  description: 'Unlock your potential, reach your horizon.',
  manifest: '/manifest.webmanifest?v=5',
  icons: {
    icon: [
      { url: '/favicon.ico?v=4', sizes: 'any' },
      { url: '/icons/favicon.png?v=4', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png?v=4',
  },
  applicationName: 'Mental Wealth Academy',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Mental Wealth Academy',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Mental Wealth Academy',
    description: 'Unlock your potential, reach your horizon.',
    images: [
      {
        url: 'https://imgur.com',
        width: 1200,
        height: 630,
        alt: 'Mental Wealth Academy — a 12-week personal development program with Blue',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mental Wealth Academy',
    description: 'Unlock your potential, reach your horizon.',
    images: ['https://imgur.com'],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${commitMono.variable} ${spaceGrotesk.variable} ${patrickHand.variable} ${departureMono.variable} ${editorialSerif.variable} ${poppins.variable}`}
      data-sidebar-collapsed="true"
      style={{ '--sidebar-width': '72px' } as CSSProperties}
      suppressHydrationWarning
    >
      <head>
        {/* Space Grotesk is loaded via next/font/google above. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="base:app_id" content="695b13d2c63ad876c908212a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var stored = localStorage.getItem('sideNavCollapsed');
                  var collapsed = stored === null
                    ? root.getAttribute('data-sidebar-collapsed') === 'true'
                    : stored === 'true';

                  root.setAttribute('data-sidebar-collapsed', collapsed ? 'true' : 'false');
                  root.style.setProperty('--sidebar-width', collapsed ? '72px' : '265px');

                  if (stored === null) {
                    localStorage.setItem('sideNavCollapsed', collapsed ? 'true' : 'false');
                  }

                  document.cookie = 'sideNavCollapsed=' + (collapsed ? 'true' : 'false') + '; path=/; max-age=31536000; SameSite=Lax';
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('mwa-theme') || 'light';
                  if (!localStorage.getItem('mwa-theme')) {
                    localStorage.setItem('mwa-theme', 'light');
                  }
                  if (theme === 'dark' && window.location.pathname !== '/') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
                  if (isStandalone && window.location.pathname === '/') {
                    window.location.replace('/dao' + window.location.search);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                const originalError = window.console.error;
                window.console.error = function(...args) {
                  const errorString = String(args[0] || '');
                  const errorMessage = args.join(' ');
                  
                  const hasAnalyticsContext = args.some(arg => {
                    if (typeof arg === 'object' && arg !== null) {
                      if (arg.context === 'AnalyticsSDKApiError') {
                        return true;
                      }
                      try {
                        const argString = JSON.stringify(arg);
                        if (argString.includes('AnalyticsSDKApiError') || 
                            argString.includes('Analytics SDK')) {
                          return true;
                        }
                      } catch (e) {}
                    }
                    return false;
                  });
                  
                  const isAnalyticsError = 
                    hasAnalyticsContext ||
                    ((errorString.includes('Analytics SDK') || errorMessage.includes('Analytics SDK')) &&
                    (errorString.includes('Failed to fetch') || 
                     errorString.includes('AnalyticsSDKApiError') ||
                     errorMessage.includes('Failed to fetch') ||
                     errorMessage.includes('AnalyticsSDKApiError') ||
                     errorString.includes('TypeError: Failed to fetch') ||
                     errorMessage.includes('TypeError: Failed to fetch')));
                  
                  if (isAnalyticsError) {
                    return;
                  }
                  
                  if (errorMessage.includes('://coinbase.com') ||
                      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
                      errorString.includes('://coinbase.com')) {
                    return;
                  }
                  
                  originalError.apply(console, args);
                };
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <SoundProvider>
          <RouteShell>{children}</RouteShell>
        </SoundProvider>
        <PwaRegistrar />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
