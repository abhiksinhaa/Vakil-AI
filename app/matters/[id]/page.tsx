import { Protected } from '@/components/RouteGuard';
import MatterDetailPage from '@/components/MatterDetailPage';

export default function MatterRoute({ params }: { params: { id: string } }) {
  return (
    <Protected>
      <MatterDetailPage id={params.id} />
    </Protected>
  );
}
