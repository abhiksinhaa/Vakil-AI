import { Protected } from '@/components/RouteGuard';
import SettingsPage from '@/components/SettingsPage';

export default function Settings() {
  return (
    <Protected>
      <SettingsPage />
    </Protected>
  );
}
