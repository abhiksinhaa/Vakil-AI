import { Protected } from '@/components/RouteGuard';
import Dashboard from '@/components/Dashboard';

export default function DashboardPage() {
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}
