'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
  const { session, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [authLoading, session, router]);

  if (authLoading || !session) return <LoadingScreen />;
  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, authLoading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && session) {
      router.replace('/dashboard');
    }
  }, [authLoading, session, router]);

  if (authLoading || session) return <LoadingScreen />;
  return <>{children}</>;
}
