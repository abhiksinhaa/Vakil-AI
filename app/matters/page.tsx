import { Protected } from '@/components/RouteGuard';
import MattersPage from '@/components/MattersPage';

export default function MattersRoute() {
  return (
    <Protected>
      <MattersPage />
    </Protected>
  );
}
