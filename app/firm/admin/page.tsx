import { Protected } from '@/components/RouteGuard';
import FirmAdminPage from '@/components/FirmAdminPage';

export default function FirmAdmin() {
  return (
    <Protected>
      <FirmAdminPage />
    </Protected>
  );
}
