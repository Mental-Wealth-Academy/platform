import type { Metadata } from 'next';
import { DeferredMembershipSection } from '@/components/landing/DeferredMembershipSection';
import { LandingSubpageShell } from '@/components/landing/LandingSubpageShell';

const description =
  'Explore Mental Wealth Academy products and services, including membership options for continued learning and growth.';

export const metadata: Metadata = {
  title: 'Products and Services | Mental Wealth Academy',
  description,
  alternates: {
    canonical: 'https://mentalwealthacademy.world/products-and-services',
  },
  openGraph: {
    title: 'Products and Services | Mental Wealth Academy',
    description,
    type: 'website',
    url: 'https://mentalwealthacademy.world/products-and-services',
  },
  twitter: {
    card: 'summary',
    title: 'Products and Services | Mental Wealth Academy',
    description,
  },
};

export default function ProductsAndServicesPage() {
  return (
    <LandingSubpageShell>
      <DeferredMembershipSection />
    </LandingSubpageShell>
  );
}
