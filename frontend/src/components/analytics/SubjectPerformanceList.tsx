import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { formatMinutes } from '../../utils/dashboardFormat';
import type { SubjectAnalyticsEntry } from '../../types/analytics';

interface SubjectPerformanceListProps {
  subjects: SubjectAnalyticsEntry[];
}

const TREND_TONE = {
  improving: 'success',
  declining: 'error',
  stable: 'neutral',
} as const;

export function SubjectPerformanceList({ subjects }: SubjectPerformanceListProps) {
  const maxMinutes = Math.max(1, ...subjects.map((subject) => subject.studyMinutes));

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Subject Performance</h2>

      {subjects.length === 0 ? (
        <EmptyState title="No subject study time yet." className="border-none py-6" />
      ) : (
        <div className="flex flex-col gap-3">
          {subjects.map((subject) => (
            <div key={subject.subjectId} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-medium">{subject.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-label">{formatMinutes(subject.studyMinutes)}</span>
                  <Badge tone={TREND_TONE[subject.trend]}>{subject.trend}</Badge>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.round((subject.studyMinutes / maxMinutes) * 100)}%` }}
                />
              </div>
              <span className="text-caption">
                {subject.sessionsCompleted} session{subject.sessionsCompleted === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
