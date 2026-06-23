import { Suspense } from 'react';
import { PublicOnly } from '@/components/RouteGuard';
import AuthPage from '@/components/AuthPage';

export default function LoginPage() {
  return (
    <PublicOnly>
      <Suspense fallback={null}>
        <AuthPage initialMode="login" />
      </Suspense>
    </PublicOnly>
  );
}
