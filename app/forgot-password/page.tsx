import type { Metadata } from 'next';
import ForgotPasswordContent from './ForgotPasswordContent';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
