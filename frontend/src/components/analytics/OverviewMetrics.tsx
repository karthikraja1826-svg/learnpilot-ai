import { Card } from '../ui/Card';
import { formatMinutes } from '../../utils/dashboardFormat';
import type { AnalyticsOverview } from '../../types/analytics';

interface OverviewMetricsProps {
  overview: AnalyticsOverview;
}

export function OverviewMetrics({ overview }: OverviewMetricsProps) {
  const metrics = [
    { label: 'Total study time', value: formatMinutes(overview.totalStudyMinutes) },
    { label: 'Sessions completed', value: String(overview.sessionsCompleted) },
    { label: 'Completion rate', value: `${Math.round(overview.completionPercentage)}%` },
    { label: 'Avg. session length', value: formatMinutes(overview.averageSessionDuration) },
    { label: 'Current streak', value: `${overview.currentStreak}d` },
    { label: 'Best streak', value: `${overview.longestStreak}d` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {metrics.map((metric) => (
        <Card key={metric.label} className="flex flex-col gap-1 p-4">
          <span className="font-display text-2xl text-text-primary">{metric.value}</span>
          <span className="text-caption">{metric.label}</span>
        </Card>
      ))}
    </div>
  );
}
