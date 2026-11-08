import type { Metadata } from 'next';
import LegalInsightsContent from './LegalInsightsContent';

export const metadata: Metadata = {
  title: 'Legal Insights',
  alternates: {
    canonical: '/legal-insights',
  },
};

export default function LegalInsightsPage() {
  return <LegalInsightsContent />;
}
