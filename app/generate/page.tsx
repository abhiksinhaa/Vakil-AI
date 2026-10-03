import { Protected } from '@/components/RouteGuard';
import DraftGenerator from '@/components/DraftGenerator';

export default function GeneratePage() {
  return (
    <Protected>
      <DraftGenerator />
    </Protected>
  );
}
