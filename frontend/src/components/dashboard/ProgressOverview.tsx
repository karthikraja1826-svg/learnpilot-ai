import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { LinkButton } from '../ui/LinkButton';
import type { DailyPerformance, StudyPlan } from '../../types/dashboard';
import { formatMinutes } from '../../utils/dashboardFormat';

interface ProgressOverviewProps {
  plan: StudyPlan | null;
  daily: DailyPerformance | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ProgressOverview({ plan, daily, isLoading, error, onRetry }: ProgressOverviewProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4">
        <LoadingState label="Loading today's progress" className="py-8" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex flex-col gap-4">
        <ErrorState description={error} onRetry={onRetry} className="border-none px-0 py-8" />
      </Card>
    );
  }

  const entries = plan?.entries ?? [];
  const hasPlanned = entries.length > 0;
  const plannedMinutes = plan?.totalPlannedMinutes ?? 0;
  const completedMinutes = daily?.completedMinutes ?? 0;
  const sessionsCompleted = daily?.sessionsCompleted ?? 0;
  const percent = plannedMinutes > 0 ? Math.round((completedMinutes / plannedMinutes) * 100) : 0;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Today's Progress</h2>
      {hasPlanned ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl text-text-primary">{formatMinutes(completedMinutes)}</span>
            <span className="text-secondary">/ {formatMinutes(plannedMinutes)} planned</span>
          </div>
          <ProgressBar value={percent} label={`${percent}% complete`} />
          <p className="text-caption">
            {sessionsCompleted} session{sessionsCompleted === 1 ? '' : 's'} completed today
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-secondary">No study plan for today yet.</p>
          <LinkButton to="/app/study-plan" variant="secondary" size="sm" className="w-fit">
            Create Study Plan
          </LinkButton>
        </div>
      )}
    </Card>
  );
}
