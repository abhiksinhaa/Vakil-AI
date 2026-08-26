import { Protected } from '@/components/RouteGuard';
import LibraryPage from '@/components/LibraryPage';

export default function LibraryRoute() {
  return (
    <Protected>
      <LibraryPage />
    </Protected>
  );
}
