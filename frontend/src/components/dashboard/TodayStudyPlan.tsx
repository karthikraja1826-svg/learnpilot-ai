import { CheckCircle2, Circle, CircleDashed, CircleX } from 'lucide-react';
import { DashboardSection } from './DashboardSection';
import { LinkButton } from '../ui/LinkButton';
import type { StudyPlan } from '../../types/dashboard';
import { formatHourMinuteLabel, formatMinutes } from '../../utils/dashboardFormat';
import { cn } from '../../utils/cn';

interface TodayStudyPlanProps {
  plan: StudyPlan | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const statusIcon = {
  completed: CheckCircle2,
  in_progress: CircleDashed,
  scheduled: Circle,
  skipped: CircleX,
  missed: CircleX,
};

const statusLabel: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  scheduled: 'Upcoming',
  skipped: 'Skipped',
  missed: 'Missed',
};

export function TodayStudyPlan({ plan, isLoading, error, onRetry }: TodayStudyPlanProps) {
  const entries = plan?.entries ?? [];

  return (
    <DashboardSection
      title="Today's Study Plan"
      actionLabel="View Full Plan"
      actionTo="/app/study-plan"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={entries.length === 0}
      emptyTitle="Your study plan is ready to be created."
      emptyAction={
        <LinkButton to="/app/study-plan" variant="secondary" size="sm">
          Create Study Plan
        </LinkButton>
      }
    >
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const Icon = statusIcon[entry.status] ?? Circle;
          return (
            <li
              key={entry._id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  entry.status === 'completed' && 'text-success',
                  entry.status === 'in_progress' && 'text-accent',
                  (entry.status === 'missed' || entry.status === 'skipped') && 'text-error',
                  entry.status === 'scheduled' && 'text-text-muted'
                )}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">{entry.subjectName || 'Study session'}</span>
                {entry.topicName && <span className="truncate text-caption">{entry.topicName}</span>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-label">{formatHourMinuteLabel(entry.startTime)}</span>
                <span className="text-caption">{formatMinutes(entry.durationMinutes)}</span>
              </div>
              <span className="w-20 shrink-0 text-right text-caption">{statusLabel[entry.status]}</span>
            </li>
          );
        })}
      </ul>
    </DashboardSection>
  );
}
