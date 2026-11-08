import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicOnly } from '@/components/RouteGuard';
import AuthPage from '@/components/AuthPage';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <PublicOnly>
      <Suspense fallback={null}>
        <AuthPage initialMode="login" />
      </Suspense>
    </PublicOnly>
  );
}
