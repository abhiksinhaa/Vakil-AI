import { Suspense } from 'react';
import { PublicOnly } from '@/components/RouteGuard';
import AuthPage from '@/components/AuthPage';

export default function Home() {
  return (
    <PublicOnly>
      <Suspense fallback={null}>
        <AuthPage />
      </Suspense>
    </PublicOnly>
  );
}
