import { DashboardSection } from './DashboardSection';
import { Badge } from '../ui/Badge';
import type { Task, TaskPriority } from '../../types/dashboard';
import { formatDaysRemaining } from '../../utils/dashboardFormat';

interface PriorityTasksProps {
  tasks: Task[] | null;
  subjectNameById: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const priorityTone: Record<TaskPriority, 'error' | 'warning' | 'accent' | 'neutral'> = {
  urgent: 'error',
  high: 'warning',
  medium: 'accent',
  low: 'neutral',
};

export function PriorityTasks({ tasks, subjectNameById, isLoading, error, onRetry }: PriorityTasksProps) {
  const sorted = [...(tasks ?? [])]
    .sort((a, b) => {
      const rankDiff = priorityRank[a.priority] - priorityRank[b.priority];
      if (rankDiff !== 0) return rankDiff;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 5);

  return (
    <DashboardSection
      title="Priority Tasks"
      actionLabel="View Tasks"
      actionTo="/app/tasks"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={sorted.length === 0}
      emptyTitle="You're all caught up."
    >
      <ul className="flex flex-col gap-2">
        {sorted.map((task) => (
          <li key={task._id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium">{task.title}</span>
              <span className="truncate text-caption">
                {task.subject ? subjectNameById.get(task.subject) ?? 'General' : 'General'}
              </span>
            </div>
            {task.dueDate && <span className="shrink-0 text-caption">{formatDaysRemaining(task.dueDate)}</span>}
            <Badge tone={priorityTone[task.priority]} className="shrink-0 capitalize">
              {task.priority}
            </Badge>
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
