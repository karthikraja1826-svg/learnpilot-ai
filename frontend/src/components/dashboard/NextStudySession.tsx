import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/LinkButton';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import type { StudyPlan, StudyPlanEntry, StudySession } from '../../types/dashboard';
import { formatHourMinuteLabel, formatMinutes } from '../../utils/dashboardFormat';
import { getMinutesSinceMidnightInTimezone } from '../../utils/timezone';

interface NextStudySessionProps {
  plan: StudyPlan | null;
  activeSession: StudySession | null;
  subjectNameById: Map<string, string>;
  topicNameById: Map<string, string>;
  timezone?: string;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function toSessionTypeLabel(sessionType: string): string {
  return sessionType
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toMinutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function NextStudySession({
  plan,
  activeSession,
  subjectNameById,
  topicNameById,
  timezone,
  isLoading,
  error,
  onRetry,
}: NextStudySessionProps) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4">
        <LoadingState label="Loading next session" className="py-8" />
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
  const isCurrentlyStudying = activeSession?.status === 'active';

  if (isCurrentlyStudying) {
    const matchedEntry: StudyPlanEntry | undefined =
      (activeSession.studyPlanEntry && entries.find((entry) => entry._id === activeSession.studyPlanEntry)) ||
      entries.find((entry) => entry.status === 'in_progress');

    const subjectName = matchedEntry
      ? matchedEntry.subjectName || 'Study session'
      : (activeSession.subject && subjectNameById.get(activeSession.subject)) || 'Study session';
    const topicName = matchedEntry
      ? matchedEntry.topicName
      : activeSession.topic && topicNameById.get(activeSession.topic);

    return (
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-section-heading">Currently studying</h2>
          {matchedEntry && matchedEntry.priority >= 70 && <Badge tone="accent">High priority</Badge>}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-body font-medium">{subjectName}</p>
          {topicName && <p className="text-secondary">{topicName}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {matchedEntry ? (
            <>
              <span className="text-label">{formatHourMinuteLabel(matchedEntry.startTime)}</span>
              <span className="text-caption">{formatMinutes(matchedEntry.durationMinutes)}</span>
            </>
          ) : (
            <>
              <span className="text-label">{toSessionTypeLabel(activeSession.sessionType)}</span>
              <span className="text-caption">
                {formatMinutes(activeSession.completedDurationMinutes)} / {formatMinutes(activeSession.plannedDurationMinutes)}
              </span>
            </>
          )}
        </div>

        <LinkButton to="/app/pomodoro" variant="primary" size="md" className="w-fit">
          Resume Focus
        </LinkButton>
      </Card>
    );
  }

  const nowMinutes = getMinutesSinceMidnightInTimezone(timezone);
  const scheduledEntries = entries
    .filter((entry) => entry.status === 'scheduled')
    .sort((a, b) => toMinutesSinceMidnight(a.startTime) - toMinutesSinceMidnight(b.startTime));
  const nextEntry = scheduledEntries.find((entry) => toMinutesSinceMidnight(entry.startTime) >= nowMinutes) ?? scheduledEntries[0];

  if (!nextEntry) {
    return (
      <Card className="flex flex-col gap-4">
        <h2 className="text-section-heading">Next up</h2>
        <p className="text-secondary">No study session scheduled.</p>
        <LinkButton to="/app/study-plan" variant="secondary" size="sm" className="w-fit">
          View Study Plan
        </LinkButton>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-section-heading">Next up</h2>
        {nextEntry.priority >= 70 && <Badge tone="accent">High priority</Badge>}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-body font-medium">{nextEntry.subjectName || 'Study session'}</p>
        {nextEntry.topicName && <p className="text-secondary">{nextEntry.topicName}</p>}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-label">{formatHourMinuteLabel(nextEntry.startTime)}</span>
        <span className="text-caption">{formatMinutes(nextEntry.durationMinutes)}</span>
      </div>

      <LinkButton to="/app/pomodoro" variant="primary" size="md" className="w-fit">
        Start Focus
      </LinkButton>
    </Card>
  );
}
