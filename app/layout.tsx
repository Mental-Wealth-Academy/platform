import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Poppins, Space_Grotesk, IBM_Plex_Mono, Space_Mono } from 'next/font/google';
import '@/styles/globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

import { ConditionalWeb3Provider } from '@/components/web3/ConditionalWeb3Provider';
import { MiniAppProvider } from '@/components/miniapp/MiniAppProvider';
import { SoundProvider } from '@/components/sound/SoundProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import TopNavigation from '@/components/top-navigation/TopNavigation';
import MobileBottomNav from '@/components/mobile-bottom-nav/MobileBottomNav';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://mentalwealthacademy.world';

export const metadata: Metadata = {
  title: 'Mental Wealth Academy',
  description: 'A Micro-University run by an AI God, earn your wings in the Academy as an Academic Angel, access a plethora of tools, verses, and daily exercises to earn and trade wealth and reach your ethereal horizon.',
  icons: {
    icon: '/icons/mentalwealth-academy-logo.png',
  },
  openGraph: {
    title: 'Mental Wealth Academy',
    description: 'A Micro-University run by an AI God, earn your wings in the Academy as an Academic Angel, access a plethora of tools, verses, and daily exercises to earn and trade wealth and reach your ethereal horizon.',
    images: [
      {
        url: '/icons/embbedBanner.png',
        width: 1200,
        height: 630,
        alt: 'Mental Wealth Academy - Next Gen Micro-University',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mental Wealth Academy',
    description: 'A Micro-University run by an AI God, earn your wings in the Academy as an Academic Angel, access a plethora of tools, verses, and daily exercises to earn and trade wealth and reach your ethereal horizon.',
    images: ['/icons/embbedBanner.png'],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: `${APP_URL}/icons/embbedBanner.png`,
      button: {
        title: 'Launch Mental Wealth Academy',
        action: {
          type: 'launch_miniapp',
          name: 'Mental Wealth Academy',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/icons/embbedBanner.png`,
          splashBackgroundColor: '#000000',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable} ${spaceMono.variable}`} suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="base:app_id" content="695b13d2c63ad876c908212a" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('mwa-theme') || 'dark';
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
              // Suppress only non-critical wallet SDK analytics errors
              if (typeof window !== 'undefined') {
                const originalError = window.console.error;
                window.console.error = function(...args) {
                  const errorString = String(args[0] || '');
                  const errorMessage = args.join(' ');
                  
                  // Check if any argument is an object with AnalyticsSDKApiError context
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
                      } catch (e) {
                        // Ignore JSON stringify errors
                      }
                    }
                    return false;
                  });
                  
                  // Suppress wallet SDK analytics fetch errors (non-critical)
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
                    return; // Suppress analytics errors
                  }
                  
                  // Suppress Coinbase Wallet SDK analytics errors (non-critical)
                  if (errorMessage.includes('cca-lite.coinbase.com') ||
                      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
                      errorString.includes('cca-lite.coinbase.com')) {
                    return;
                  }
                  
                  originalError.apply(console, args);
                };
                
                // Suppress network warnings for blocked wallet telemetry requests
                const originalWarn = window.console.warn;
                window.console.warn = function(...args) {
                  const warnMessage = args.join(' ');
                  if (warnMessage.includes('cca-lite.coinbase.com') ||
                      warnMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
                    return;
                  }
                  originalWarn.apply(console, args);
                };
              }
            `,
          }}
        />
      </head>
      <body>
        <MiniAppProvider>
          <SoundProvider>
            <ConditionalWeb3Provider>
              <ThemeProvider>
                <TopNavigation />
                {children}
                <MobileBottomNav />
              </ThemeProvider>
            </ConditionalWeb3Provider>
          </SoundProvider>
        </MiniAppProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
