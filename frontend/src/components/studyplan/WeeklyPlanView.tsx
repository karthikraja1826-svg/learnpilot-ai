import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, CircleDashed, CircleX, Play, Info, Pencil, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';
import { formatHourMinuteLabel, formatMinutes } from '../../utils/dashboardFormat';
import type { StudyPlan, StudyPlanEntry } from '../../types/academic';

interface WeeklyPlanViewProps {
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

const dateKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

const addDays = (dateKeyValue: string, days: number) => {
  const date = new Date(`${dateKeyValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const dayLabel = (dateKeyValue: string) =>
  new Date(`${dateKeyValue}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export function WeeklyPlanView({
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
}: WeeklyPlanViewProps) {
  const days = useMemo(() => {
    if (!plan) return [];
    const start = dateKey(plan.startDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [plan]);

  const entriesByDay = useMemo(() => {
    const map = new Map<string, StudyPlanEntry[]>();
    (plan?.entries ?? []).forEach((entry) => {
      const key = dateKey(entry.date);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [plan]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <LoadingState label="Loading this week's plan" />
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

  if (!plan || plan.entries.length === 0) {
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

  const activeDay = selectedDay && entriesByDay.has(selectedDay) ? selectedDay : days.find((day) => (entriesByDay.get(day)?.length ?? 0) > 0) ?? days[0];
  const activeEntries = entriesByDay.get(activeDay) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap gap-2">
        {days.map((day) => {
          const dayEntries = entriesByDay.get(day) ?? [];
          const plannedMinutes = dayEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0);
          const completedCount = dayEntries.filter((entry) => entry.status === 'completed').length;
          const isActive = day === activeDay;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                'flex min-w-[7.5rem] flex-1 flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors duration-250',
                isActive ? 'border-accent bg-accent-soft' : 'border-border hover:bg-accent-soft/50'
              )}
            >
              <span className="text-label">{dayLabel(day)}</span>
              <span className="text-body font-medium">{formatMinutes(plannedMinutes)}</span>
              <span className="text-caption">
                {dayEntries.length} session{dayEntries.length === 1 ? '' : 's'}
                {dayEntries.length > 0 ? ` · ${completedCount} done` : ''}
              </span>
            </button>
          );
        })}
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-section-heading">{dayLabel(activeDay)}</h3>
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>
        {activeEntries.length === 0 ? (
          <p className="text-secondary">No sessions scheduled for this day.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeEntries.map((entry) => {
              const Icon = STATUS_ICON[entry.status] ?? Circle;
              const isBusy = busyEntryId === entry._id;
              return (
                <li
                  key={entry._id}
                  className="flex flex-col gap-2.5 rounded-lg border border-border px-3.5 py-3 sm:flex-row sm:items-center"
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
                  <div className="flex shrink-0 flex-col items-start gap-0.5 sm:items-end">
                    <span className="text-label">
                      {formatHourMinuteLabel(entry.startTime)} – {formatHourMinuteLabel(entry.endTime)}
                    </span>
                    <span className="text-caption">{formatMinutes(entry.durationMinutes)}</span>
                  </div>
                  <Badge tone="neutral">{STATUS_LABEL[entry.status]}</Badge>
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
        )}
      </Card>
    </div>
  );
}
