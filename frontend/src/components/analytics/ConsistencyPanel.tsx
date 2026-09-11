import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';
import type { WeeklyPerformance } from '../../types/dashboard';

interface ConsistencyPanelProps {
  weekly: WeeklyPerformance;
}

function toDayLabel(dateIso: string): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

export function ConsistencyPanel({ weekly }: ConsistencyPanelProps) {
  const hasAnyData = weekly.days.some((day) => day.completedMinutes > 0);
  const studyDays = weekly.days.filter((day) => day.completedMinutes > 0).length;
  const missedDays = weekly.days.filter((day) => day.plannedMinutes > 0 && day.completedMinutes === 0).length;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Study Consistency</h2>

      {!hasAnyData ? (
        <EmptyState title="Complete a few study sessions to see your consistency." className="border-none py-6" />
      ) : (
        <>
          <div className="flex items-center gap-2">
            {weekly.days.map((day) => {
              const intensity =
                day.completedMinutes === 0 ? 0 : day.completionRate >= 1 ? 3 : day.completionRate >= 0.5 ? 2 : 1;

              return (
                <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'h-8 w-full rounded-md',
                      intensity === 0 && 'bg-border/40',
                      intensity === 1 && 'bg-accent/30',
                      intensity === 2 && 'bg-accent/60',
                      intensity === 3 && 'bg-accent'
                    )}
                    title={`${day.completedMinutes} minutes studied`}
                  />
                  <span className="text-label">{toDayLabel(day.date)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-caption">
            {studyDays} of 7 days studied
            {missedDays > 0 ? ` · ${missedDays} missed planned session${missedDays === 1 ? '' : 's'}` : ''}
          </p>
        </>
      )}
    </Card>
  );
}
