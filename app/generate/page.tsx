import { Protected } from '@/components/RouteGuard';
import GenerateExperience from '@/components/GenerateExperience';

export default function GeneratePage() {
  return (
    <Protected>
      <GenerateExperience />
    </Protected>
  );
}
