import type { Metadata } from 'next';
import WorkspaceContent from './WorkspaceContent';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  return <WorkspaceContent params={params} />;
}
