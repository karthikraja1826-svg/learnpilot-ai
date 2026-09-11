import { CheckSquare, Timer } from 'lucide-react';
import { DashboardSection } from './DashboardSection';
import type { ActivityItem, StudySession, Task } from '../../types/dashboard';
import { formatMinutes, formatRelativeTimestamp } from '../../utils/dashboardFormat';

interface RecentActivityProps {
  completedTasks: Task[] | null;
  completedSessions: StudySession[] | null;
  subjectNameById: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function RecentActivity({
  completedTasks,
  completedSessions,
  subjectNameById,
  isLoading,
  error,
  onRetry,
}: RecentActivityProps) {
  const taskItems: ActivityItem[] = (completedTasks ?? []).map((task) => ({
    id: task._id,
    type: 'task_completed',
    title: `Completed task: ${task.title}`,
    timestamp: task.updatedAt,
  }));

  const sessionItems: ActivityItem[] = (completedSessions ?? []).map((session) => ({
    id: session._id,
    type: 'session_completed',
    title: `Study session completed${session.subject ? ` · ${subjectNameById.get(session.subject) ?? ''}` : ''} (${formatMinutes(session.completedDurationMinutes)})`,
    timestamp: session.endTime ?? session.updatedAt,
  }));

  const combined = [...taskItems, ...sessionItems]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <DashboardSection
      title="Recent Activity"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={combined.length === 0}
      emptyTitle="No recent activity."
      emptyDescription="Complete your first focus session to see your progress here."
    >
      <ul className="flex flex-col gap-2">
        {combined.map((item) => {
          const Icon = item.type === 'task_completed' ? CheckSquare : Timer;
          return (
            <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
              <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-body">{item.title}</span>
              <span className="shrink-0 text-caption">{formatRelativeTimestamp(item.timestamp)}</span>
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}
