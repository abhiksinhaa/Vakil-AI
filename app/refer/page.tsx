import { Protected } from '@/components/RouteGuard';
import ReferAndEarn from '@/components/ReferAndEarn';

export default function Refer() {
  return (
    <Protected>
      <ReferAndEarn />
    </Protected>
  );
}
