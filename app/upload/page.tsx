import type { Metadata } from 'next';
import UploadContent from './UploadContent';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function UploadPage() {
  return <UploadContent />;
}
