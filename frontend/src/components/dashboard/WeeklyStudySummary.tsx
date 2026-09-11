import { DashboardSection } from './DashboardSection';
import type { WeeklyPerformance } from '../../types/dashboard';
import { formatMinutes } from '../../utils/dashboardFormat';

interface WeeklyStudySummaryProps {
  weekly: WeeklyPerformance | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeeklyStudySummary({ weekly, isLoading, error, onRetry }: WeeklyStudySummaryProps) {
  const days = weekly?.days ?? [];
  const hasActivity = days.some((day) => day.completedMinutes > 0);
  const maxMinutes = Math.max(1, ...days.map((day) => day.completedMinutes));
  const completionPercent = weekly ? Math.round(weekly.completionRate * 100) : 0;

  return (
    <DashboardSection
      title="Weekly Study Summary"
      actionLabel="View Analytics"
      actionTo="/app/analytics"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={!hasActivity}
      emptyTitle="No study activity yet."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex flex-col">
            <span className="font-display text-xl text-text-primary">{formatMinutes(weekly?.completedMinutes ?? 0)}</span>
            <span className="text-caption">This week</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl text-text-primary">{weekly?.sessionsCompleted ?? 0}</span>
            <span className="text-caption">Sessions</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl text-text-primary">{completionPercent}%</span>
            <span className="text-caption">Consistency</span>
          </div>
        </div>

        <div className="flex items-end gap-2" style={{ height: '96px' }}>
          {days.map((day) => {
            const heightPercent = Math.round((day.completedMinutes / maxMinutes) * 100);
            const dayIndex = new Date(day.date).getUTCDay();
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end rounded-md bg-accent-soft/40">
                  <div
                    className="w-full rounded-md bg-accent"
                    style={{ height: day.completedMinutes > 0 ? `${Math.max(6, heightPercent)}%` : '0%' }}
                  />
                </div>
                <span className="text-caption">{DAY_LABELS[dayIndex]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardSection>
  );
}
