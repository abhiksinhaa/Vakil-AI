import type { Metadata } from 'next';
import ResearchContent from './ResearchContent';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function ResearchPage() {
  return <ResearchContent />;
}
