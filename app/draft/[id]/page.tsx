import type { Metadata } from 'next';
import DraftDetailContent from './DraftDetailContent';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function DraftDetailPage() {
  return <DraftDetailContent />;
}
