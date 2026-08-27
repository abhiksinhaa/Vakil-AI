'use client';

import { use } from 'react';
import DocumentWorkspace from '../../../src/components/DocumentWorkspace';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <DocumentWorkspace draftId={resolvedParams.id} />;
}
