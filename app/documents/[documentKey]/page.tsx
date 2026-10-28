import { notFound } from 'next/navigation';
import DynamicDocumentForm from '@/components/DynamicDocumentForm';
import { Protected } from '@/components/RouteGuard';
import { getDynamicDocument } from '@/lib/legal-documents/registry';

export default async function DynamicDocumentPage({
  params,
}: {
  params: Promise<{ documentKey: string }>;
}) {
  const { documentKey } = await params;
  const definition = getDynamicDocument(documentKey);
  if (!definition) notFound();

  return (
    <Protected>
      <DynamicDocumentForm definition={definition} />
    </Protected>
  );
}
