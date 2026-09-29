import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

const description =
  'Mental Wealth Academy is the best mental plan — unlocking personal development, structured reflection, and guided wellness companionship with Blue.';

export const metadata: Metadata = {
  title: 'Mental Wealth Academy | The Best Mental Plan',
  description,
  alternates: {
    canonical: 'https://mentalwealthacademy.world/',
  },
  openGraph: {
    title: 'Mental Wealth Academy | The Best Mental Plan',
    description,
    type: 'website',
    url: 'https://mentalwealthacademy.world/',
    images: [
      {
        url: 'https://mentalwealthacademy.world/images/og-preview.png',
        width: 1200,
        height: 630,
        alt: 'Mental Wealth Academy | The Best Mental Plan',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mental Wealth Academy | The Best Mental Plan',
    description,
    images: ['https://mentalwealthacademy.world/images/og-preview.png'],
  },
};

export default function Page() {
  return <LandingPage />;
}
