import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { IconButton } from '../ui/IconButton';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { formatMinutes, formatShortDate } from '../../utils/dashboardFormat';
import type { Subject } from '../../types/academic';
import type { SessionStatus, StudySession } from '../../types/dashboard';
import type { PaginationMeta } from '../../types/api';
import type { SessionHistoryFilters } from '../../services/studySessions.service';

const STATUS_TONE: Record<SessionStatus, 'neutral' | 'accent' | 'success' | 'warning' | 'error'> = {
  planned: 'neutral',
  active: 'accent',
  paused: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  abandoned: 'error',
};

function toSessionTypeLabel(sessionType: string): string {
  return sessionType
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface SessionHistoryListProps {
  sessions: StudySession[];
  subjectNameById: Map<string, string>;
  topicNameById: Map<string, string>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  compact?: boolean;
  subjects?: Subject[];
  filters?: SessionHistoryFilters;
  onFilterChange?: (filters: SessionHistoryFilters) => void;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
}

export function SessionHistoryList({
  sessions,
  subjectNameById,
  topicNameById,
  isLoading,
  error,
  onRetry,
  compact,
  subjects,
  filters,
  onFilterChange,
  pagination,
  onPageChange,
}: SessionHistoryListProps) {
  const showFilters = !compact && Boolean(onFilterChange);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section-heading">Session History</h2>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            aria-label="Filter by status"
            value={filters?.status ?? ''}
            onChange={(event) =>
              onFilterChange?.({ ...filters, status: (event.target.value || undefined) as SessionStatus | undefined })
            }
          >
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="abandoned">Abandoned</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </Select>
          <Select
            aria-label="Filter by subject"
            value={filters?.subjectId ?? ''}
            onChange={(event) => onFilterChange?.({ ...filters, subjectId: event.target.value || undefined })}
          >
            <option value="">All subjects</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Loading session history" className="py-6" />
      ) : error ? (
        <ErrorState description={error} onRetry={onRetry} className="border-none px-0 py-6" />
      ) : sessions.length === 0 ? (
        <EmptyState title="No study sessions yet." className="border-none py-6" icon={<History className="h-6 w-6" />} />
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {sessions.map((session) => {
            const subjectName = (session.subject && subjectNameById.get(session.subject)) || 'General study';
            const topicName = session.topic && topicNameById.get(session.topic);
            const durationLabel =
              session.status === 'completed'
                ? formatMinutes(session.completedDurationMinutes)
                : formatMinutes(session.actualDurationMinutes);

            return (
              <div key={session._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body font-medium">{subjectName}</span>
                    {topicName && <span className="text-caption">· {topicName}</span>}
                  </div>
                  <span className="text-caption">
                    {session.startTime ? formatShortDate(session.startTime) : 'Not started'} ·{' '}
                    {toSessionTypeLabel(session.sessionType)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-label">
                    {durationLabel} / {formatMinutes(session.plannedDurationMinutes)}
                  </span>
                  <Badge tone={STATUS_TONE[session.status]}>{toSessionTypeLabel(session.status)}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-caption">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              aria-label="Previous page"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>
            <IconButton
              aria-label="Next page"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      )}
    </Card>
  );
}
