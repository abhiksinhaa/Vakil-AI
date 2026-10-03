'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '../context/AppContext';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-cream/60 text-sm">Loading Draftee…</p>
      </div>
    </div>
  );
}

export function Protected({ children }: { children: ReactNode }) {
  const { session, authLoading, profile, accountLoading } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
    if (!authLoading && session && !accountLoading && profile?.user_type === 'individual' && pathname !== '/generate') {
      router.replace('/generate');
    }
  }, [authLoading, session, accountLoading, profile, pathname, router]);

  if (authLoading || !session || accountLoading || !profile) return <LoadingScreen />;
  if (profile.user_type === 'individual' && pathname !== '/generate') return <LoadingScreen />;
  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && session) {
      router.replace('/generate');
    }
  }, [authLoading, session, router]);

  if (authLoading || session) return <LoadingScreen />;
  return <>{children}</>;
}
