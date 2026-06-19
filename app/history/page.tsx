import { Protected } from '@/components/RouteGuard';
import DraftHistory from '@/components/DraftHistory';

export default function HistoryPage() {
  return (
    <Protected>
      <DraftHistory />
    </Protected>
  );
}
