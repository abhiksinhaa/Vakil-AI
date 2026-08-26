import { Protected } from '@/components/RouteGuard';
import TasksPage from '@/components/TasksPage';

export default function TasksRoute() {
  return (
    <Protected>
      <TasksPage />
    </Protected>
  );
}
