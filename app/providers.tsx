'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppProvider } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';

function IndividualRouteRedirect({ children }: { children: ReactNode }) {
  const { profile } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (profile?.user_type === 'individual' && pathname !== '/generate') {
      router.replace('/generate');
    }
  }, [profile?.user_type, pathname, router]);

  if (profile?.user_type === 'individual' && pathname !== '/generate') return null;
  return <>{children}</>;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <IndividualRouteRedirect>{children}</IndividualRouteRedirect>
    </AppProvider>
  );
}
