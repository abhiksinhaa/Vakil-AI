'use client';

import { useApp } from '../context/AppContext';
import LegalChatbot from './LegalChatbot';

/** Renders the floating legal assistant globally, but only for signed-in users. */
export default function ChatbotMount() {
  const { session } = useApp();
  if (!session) return null;
  return <LegalChatbot />;
}
