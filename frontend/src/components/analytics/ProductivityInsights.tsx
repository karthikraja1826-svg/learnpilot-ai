import { Lightbulb } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { formatMinutes, formatShortDate } from '../../utils/dashboardFormat';
import type { AnalyticsOverview, ProductivityAnalytics, SubjectAnalyticsEntry } from '../../types/analytics';

interface ProductivityInsightsProps {
  overview: AnalyticsOverview;
  subjects: SubjectAnalyticsEntry[];
  productivity: ProductivityAnalytics;
}

export function ProductivityInsights({ overview, subjects, productivity }: ProductivityInsightsProps) {
  const insights: string[] = [];

  const mostStudiedSubject = subjects.reduce<SubjectAnalyticsEntry | null>((best, subject) => {
    if (!best || subject.studyMinutes > best.studyMinutes) return subject;
    return best;
  }, null);
  if (mostStudiedSubject && mostStudiedSubject.studyMinutes > 0) {
    insights.push(`${mostStudiedSubject.name} is your most studied subject this period, with ${formatMinutes(mostStudiedSubject.studyMinutes)} logged.`);
  }

  const mostProductiveDay = productivity.productivityTrend.reduce<ProductivityAnalytics['productivityTrend'][number] | null>(
    (best, point) => {
      if (!best || point.productivityScore > best.productivityScore) return point;
      return best;
    },
    null
  );
  if (mostProductiveDay && mostProductiveDay.productivityScore > 0) {
    insights.push(`Your most productive day recently was ${formatShortDate(mostProductiveDay.date)}.`);
  }

  if (overview.averageSessionDuration > 0) {
    insights.push(`Your average session runs ${formatMinutes(overview.averageSessionDuration)}.`);
  }

  const trend = productivity.productivityTrend;
  if (trend.length >= 2) {
    const first = trend[0].completionRate;
    const last = trend[trend.length - 1].completionRate;
    if (last > first + 0.1) {
      insights.push('Your weekly completion rate is trending upward.');
    } else if (last < first - 0.1) {
      insights.push('Your weekly completion rate has dipped recently.');
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Productivity Insights</h2>
      {insights.length === 0 ? (
        <EmptyState title="Complete more sessions to unlock insights." className="border-none py-6" />
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((insight) => (
            <li key={insight} className="flex items-start gap-2.5">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-secondary">{insight}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
