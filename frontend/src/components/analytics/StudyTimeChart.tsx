import { Card } from '../ui/Card';
import { formatMinutes } from '../../utils/dashboardFormat';
import type { WeeklyPerformance } from '../../types/dashboard';

interface StudyTimeChartProps {
  weekly: WeeklyPerformance;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDayLabel(dateIso: string, index: number): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return DAY_LABELS[index] ?? '';
  return parsed.toLocaleDateString(undefined, { weekday: 'short' });
}

export function StudyTimeChart({ weekly }: StudyTimeChartProps) {
  const maxMinutes = Math.max(1, ...weekly.days.map((day) => Math.max(day.plannedMinutes, day.completedMinutes)));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-section-heading">Study Time This Week</h2>
        <div className="flex items-center gap-3 text-caption">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-border" /> Planned
          </span>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 sm:gap-4" role="img" aria-label="Study minutes per day this week">
        {weekly.days.map((day, index) => {
          const completedHeight = Math.round((day.completedMinutes / maxMinutes) * 100);
          const plannedHeight = Math.round((day.plannedMinutes / maxMinutes) * 100);

          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-32 w-full max-w-10 items-end justify-center rounded-md bg-border/30">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-md border-2 border-dashed border-border"
                  style={{ height: `${plannedHeight}%` }}
                  aria-hidden="true"
                />
                <div
                  className="relative w-full rounded-md bg-accent"
                  style={{ height: `${completedHeight}%` }}
                  title={`${formatMinutes(day.completedMinutes)} of ${formatMinutes(day.plannedMinutes)} planned`}
                />
              </div>
              <span className="text-label">{toDayLabel(day.date, index)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
