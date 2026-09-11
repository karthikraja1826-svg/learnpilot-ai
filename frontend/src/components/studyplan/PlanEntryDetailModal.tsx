import { Badge } from '../ui/Badge';
import { formatHourMinuteLabel, formatMinutes } from '../../utils/dashboardFormat';
import type { StudyPlanEntry } from '../../types/academic';

interface PlanEntryDetailModalProps {
  entry: StudyPlanEntry;
}

const ACTIVITY_LABEL: Record<StudyPlanEntry['activityType'], string> = {
  study: 'Study',
  revision: 'Revision',
  assignment: 'Assignment',
  practice: 'Practice',
  review: 'Review',
};

const STATUS_LABEL: Record<StudyPlanEntry['status'], string> = {
  scheduled: 'Upcoming',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
  missed: 'Missed',
};

export function PlanEntryDetailModal({ entry }: PlanEntryDetailModalProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-section-heading">{entry.subjectName || 'Study session'}</span>
        {entry.topicName && <span className="text-secondary">{entry.topicName}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{ACTIVITY_LABEL[entry.activityType]}</Badge>
        <Badge tone="neutral">{STATUS_LABEL[entry.status]}</Badge>
        <Badge tone={entry.priority >= 70 ? 'warning' : 'neutral'}>Priority {entry.priority}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption">Time</span>
          <span className="text-body">
            {formatHourMinuteLabel(entry.startTime)} – {formatHourMinuteLabel(entry.endTime)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption">Duration</span>
          <span className="text-body">{formatMinutes(entry.durationMinutes)}</span>
        </div>
      </div>

      {entry.reason && (
        <div className="flex flex-col gap-1">
          <span className="text-label">Why this session</span>
          <p className="text-secondary">{entry.reason}</p>
        </div>
      )}
    </div>
  );
}
