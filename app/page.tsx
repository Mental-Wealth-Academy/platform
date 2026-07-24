import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

const description =
  'Mental Wealth Academy is an open-sourced platform for empowering educators, with structured reflection, and contribution-based curricula builders across mental wellness, financial literacy, and related subjects.';

export const metadata: Metadata = {
  title: 'Mental Wealth Academy | Evolving Online Education and Educators',
  description,
  alternates: {
    canonical: 'https://mentalwealthacademy.world/',
  },
  openGraph: {
    title: 'Mental Wealth Academy | Evolving Online Education and Educators',
    description,
    type: 'website',
    url: 'https://mentalwealthacademy.world/',
    images: [
      {
        url: 'https://mentalwealthacademy.world/images/landing-starfield.jpg',
        alt: 'Mental Wealth Academy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mental Wealth Academy | Evolving Online Education and Educators',
    description,
    images: ['https://mentalwealthacademy.world/images/landing-starfield.jpg'],
  },
};

export default function Page() {
  return <LandingPage />;
}
