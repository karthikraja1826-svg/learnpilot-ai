import { DashboardSection } from './DashboardSection';
import { Badge } from '../ui/Badge';
import type { Assignment, DeadlineItem, Exam } from '../../types/dashboard';
import { formatDaysRemaining } from '../../utils/dashboardFormat';

interface UpcomingDeadlinesProps {
  exams: Exam[] | null;
  assignments: Assignment[] | null;
  subjectNameById: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function UpcomingDeadlines({
  exams,
  assignments,
  subjectNameById,
  isLoading,
  error,
  onRetry,
}: UpcomingDeadlinesProps) {
  const examItems: DeadlineItem[] = (exams ?? []).map((exam) => ({
    id: exam._id,
    type: 'exam',
    title: exam.title,
    subjectName: exam.subject ? subjectNameById.get(exam.subject) ?? 'General' : 'General',
    date: exam.examDate,
    priority: exam.priority,
  }));

  const assignmentItems: DeadlineItem[] = (assignments ?? []).map((assignment) => ({
    id: assignment._id,
    type: 'assignment',
    title: assignment.title,
    subjectName: assignment.subject ? subjectNameById.get(assignment.subject) ?? 'General' : 'General',
    date: assignment.deadline,
    priority: assignment.priority,
  }));

  const combined = [...examItems, ...assignmentItems]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  return (
    <DashboardSection
      title="Upcoming Exams & Assignments"
      actionLabel="View Academics"
      actionTo="/app/exams-assignments"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={combined.length === 0}
      emptyTitle="No upcoming exams or assignments."
    >
      <ul className="flex flex-col gap-2">
        {combined.map((item) => (
          <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            <Badge tone={item.type === 'exam' ? 'error' : 'accent'} className="shrink-0 capitalize">
              {item.type}
            </Badge>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium">{item.title}</span>
              <span className="truncate text-caption">{item.subjectName}</span>
            </div>
            <span className="shrink-0 text-label">{formatDaysRemaining(item.date)}</span>
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
