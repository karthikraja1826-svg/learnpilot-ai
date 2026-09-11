import { CheckCircle2, Circle, CircleDashed, CircleX, Play, Info, Pencil, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';
import { formatHourMinuteLabel, formatMinutes } from '../../utils/dashboardFormat';
import type { StudyPlan, StudyPlanEntry } from '../../types/academic';

interface DailyPlanViewProps {
  plan: StudyPlan | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  canGenerate: boolean;
  blockedReason: string | null;
  onGenerate: () => void;
  onStartFocus: (entry: StudyPlanEntry) => void;
  onMarkComplete: (entry: StudyPlanEntry) => void;
  onViewDetails: (entry: StudyPlanEntry) => void;
  onEdit: (entry: StudyPlanEntry) => void;
  busyEntryId: string | null;
  onRegenerate: () => void;
}

const STATUS_ICON = {
  completed: CheckCircle2,
  in_progress: CircleDashed,
  scheduled: Circle,
  skipped: CircleX,
  missed: CircleX,
};

const STATUS_LABEL: Record<StudyPlanEntry['status'], string> = {
  completed: 'Completed',
  in_progress: 'In progress',
  scheduled: 'Upcoming',
  skipped: 'Skipped',
  missed: 'Missed',
};

export function DailyPlanView({
  plan,
  isLoading,
  error,
  onRetry,
  canGenerate,
  blockedReason,
  onGenerate,
  onStartFocus,
  onMarkComplete,
  onViewDetails,
  onEdit,
  busyEntryId,
  onRegenerate,
}: DailyPlanViewProps) {
  if (isLoading) {
    return (
      <Card>
        <LoadingState label="Loading today's plan" />
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

  const entries = plan?.entries ?? [];

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No study plan for this period yet."
          description={
            blockedReason ?? 'Generate an AI-powered study plan based on your subjects, deadlines, and availability.'
          }
          action={
            canGenerate ? (
              <Button onClick={onGenerate}>Generate Plan</Button>
            ) : (
              <Button variant="secondary" disabled>
                Generate Plan
              </Button>
            )
          }
        />
      </Card>
    );
  }

  const completedMinutes = entries
    .filter((entry) => entry.status === 'completed')
    .reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const totalMinutes = plan?.totalPlannedMinutes ?? 0;
  const completionPercent = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{formatMinutes(totalMinutes)} planned</Badge>
          <Badge tone="success">{formatMinutes(completedMinutes)} completed</Badge>
          {plan?.summary.constrained && <Badge tone="warning">{plan.summary.notes}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-caption">{plan?.source === 'ai' ? 'AI-generated' : 'Algorithm-generated'}</span>
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>
      </div>

      <ProgressBar value={completionPercent} label={`${completionPercent}% complete`} />

      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const Icon = STATUS_ICON[entry.status] ?? Circle;
          const isBusy = busyEntryId === entry._id;
          return (
            <li key={entry._id} className="flex flex-col gap-2.5 rounded-lg border border-border px-3.5 py-3 sm:flex-row sm:items-center">
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
              <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                <span className="text-label">
                  {formatHourMinuteLabel(entry.startTime)} – {formatHourMinuteLabel(entry.endTime)}
                </span>
                <span className="text-caption">{formatMinutes(entry.durationMinutes)}</span>
              </div>
              <span className="shrink-0 text-caption sm:w-24 sm:text-right">{STATUS_LABEL[entry.status]}</span>
              <div className="flex shrink-0 items-center gap-1.5">
                {entry.status !== 'completed' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onStartFocus(entry)}
                    disabled={isBusy}
                    isLoading={isBusy}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start Focus
                  </Button>
                )}
                {entry.status !== 'completed' && (
                  <IconButton aria-label="Mark complete" onClick={() => onMarkComplete(entry)} disabled={isBusy}>
                    <CheckCircle2 className="h-4 w-4" />
                  </IconButton>
                )}
                <IconButton aria-label="Edit session" onClick={() => onEdit(entry)} disabled={isBusy}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <IconButton aria-label="View details" onClick={() => onViewDetails(entry)}>
                  <Info className="h-4 w-4" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
