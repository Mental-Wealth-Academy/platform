import type { Metadata } from 'next';
import { FAQSection } from '@/components/landing/FAQSection';
import { LANDING_FAQ_ITEMS } from '@/components/landing/faqContent';
import { LandingSubpageShell } from '@/components/landing/LandingSubpageShell';

const title = 'Frequently Asked Questions | Mental Wealth Academy';
const description =
  'Find answers about Mental Wealth Academy, community education, cohorts, membership, credits, and the 12-week course.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: 'https://mentalwealthacademy.world/faq',
  },
  openGraph: {
    title,
    description,
    type: 'website',
    url: 'https://mentalwealthacademy.world/faq',
    images: [
      {
        url: 'https://mentalwealthacademy.world/images/og-preview.png',
        alt: 'Mental Wealth Academy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['https://mentalwealthacademy.world/images/og-preview.png'],
  },
};

export default function FaqPage() {
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <LandingSubpageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <FAQSection />
    </LandingSubpageShell>
  );
}
