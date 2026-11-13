'use client';

import type { ReactNode } from 'react';
import { AppProvider } from '@/context/AppContext';
import NotificationPrompt from '@/components/NotificationPrompt';

export default function Providers({
  children,
  oneSignalAppId,
}: {
  children: ReactNode;
  oneSignalAppId: string;
}) {
  return (
    <AppProvider>
      <NotificationPrompt appId={oneSignalAppId} />
      {children}
    </AppProvider>
  );
}
