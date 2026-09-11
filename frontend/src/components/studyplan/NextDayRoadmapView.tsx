import { useNavigate } from 'react-router-dom';
import { CalendarClock, Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { formatHourMinuteLabel, formatMinutes } from '../../utils/dashboardFormat';
import type { StudyPlan, StudyPlanEntry, Subject } from '../../types/academic';

interface NextDayRoadmapViewProps {
  subject: Subject | null;
  plan: StudyPlan | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onViewDetails: (entry: StudyPlanEntry) => void;
}

// Part 6 — Next-Day Optimization. Deliberately read-only and visually
// distinct from TodaysRoadmapView: this plan belongs to a future study day,
// so there is no "Start Focus"/"Mark Complete" here — those only make sense
// once that day actually arrives and the roadmap becomes "today's" roadmap.
export function NextDayRoadmapView({ subject, plan, isLoading, error, onRetry, onViewDetails }: NextDayRoadmapViewProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <LoadingState label="Loading next day's roadmap" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState description={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!subject) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="No optimization subject selected yet."
          description="Choose a subject to optimize first, then come back here after completing a study day."
          action={<Button onClick={() => navigate('/app/optimize')}>Choose a Subject</Button>}
        />
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="No optimized roadmap yet."
          description="Complete today's study flow, submit the end-of-day test, generate the AI evaluation, then use the &quot;Optimize Next Day&quot; action on that page."
          action={<Button onClick={() => navigate('/app/eod-test')}>Go to End-of-Day Test</Button>}
        />
      </Card>
    );
  }

  const dateLabel = new Date(plan.startDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{subject.name}</Badge>
        <span className="text-caption">{dateLabel}</span>
        <Badge tone="neutral">Next day</Badge>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{formatMinutes(plan.totalPlannedMinutes)} planned</Badge>
            {plan.summary.constrained && <Badge tone="warning">Constrained schedule</Badge>}
          </div>
          <span className="text-caption">{plan.source === 'ai' ? 'AI-generated' : 'Algorithm-generated'}</span>
        </div>

        {plan.summary.notes && <p className="text-secondary">{plan.summary.notes}</p>}

        <ul className="flex flex-col gap-2">
          {plan.entries.map((entry) => (
            <li
              key={entry._id}
              className="flex flex-col gap-2.5 rounded-lg border border-border px-3.5 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">{entry.subjectName || 'Study session'}</span>
                {entry.topicName && <span className="truncate text-caption">{entry.topicName}</span>}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                <span className="text-label">
                  {formatHourMinuteLabel(entry.startTime)} &ndash; {formatHourMinuteLabel(entry.endTime)}
                </span>
                <span className="text-caption">{formatMinutes(entry.durationMinutes)}</span>
              </div>
              <IconButton aria-label="View details" onClick={() => onViewDetails(entry)}>
                <Info className="h-4 w-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
