import { Protected } from '@/components/RouteGuard';
import HelpCenter from '@/components/HelpCenter';

export default function Help() {
  return (
    <Protected>
      <HelpCenter />
    </Protected>
  );
}
