import type { Metadata } from 'next';
import PricingPage from '@/components/PricingPage';

export const metadata: Metadata = {
  title: 'Pricing',
  alternates: {
    canonical: '/pricing',
  },
};

export default function Page() {
  return <PricingPage />;
}
