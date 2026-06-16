import { Protected } from '@/components/RouteGuard';
import ProfilePage from '@/components/ProfilePage';

export default function Profile() {
  return (
    <Protected>
      <ProfilePage />
    </Protected>
  );
}
