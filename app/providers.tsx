'use client';

import type { ReactNode } from 'react';
import { AppProvider } from '@/context/AppContext';
import ChatbotMount from '@/components/ChatbotMount';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      {children}
      <ChatbotMount />
    </AppProvider>
  );
}
