import { Suspense } from 'react';
import { PublicOnly } from '@/components/RouteGuard';
import AuthPage from '@/components/AuthPage';

export default function SignupPage() {
  return (
    <PublicOnly>
      <Suspense fallback={null}>
        <AuthPage initialMode="signup" />
      </Suspense>
    </PublicOnly>
  );
}
