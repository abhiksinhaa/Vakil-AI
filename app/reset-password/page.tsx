import type { Metadata } from 'next';
import ResetPasswordContent from './ResetPasswordContent';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return <ResetPasswordContent />;
}
