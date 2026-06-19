import { Protected } from '@/components/RouteGuard';
import PricingPage from '@/components/PricingPage';

export default function Pricing() {
  return (
    <Protected>
      <PricingPage />
    </Protected>
  );
}
