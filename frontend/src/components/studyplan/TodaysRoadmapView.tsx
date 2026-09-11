import { useNavigate } from 'react-router-dom';
import { Target } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { DailyPlanView } from './DailyPlanView';
import type { StudyPlan, StudyPlanEntry, Subject } from '../../types/academic';

interface TodaysRoadmapViewProps {
  subject: Subject | null;
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

// "Today's Study Roadmap" — Part 2. Same DailyPlanView UI used for the
// general daily plan, but scoped to the user's active optimization subject
// (Part 1). Adds a subject + date header, and a dedicated empty state that
// sends the user to the Optimize page when no subject has been chosen yet.
export function TodaysRoadmapView({ subject, plan, isLoading, error, onRetry, ...rest }: TodaysRoadmapViewProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <LoadingState label="Loading today's roadmap" />
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
          icon={<Target className="h-6 w-6" />}
          title="No optimization subject selected yet."
          description="Choose a subject to optimize first, then come back here to generate today's roadmap for it."
          action={<Button onClick={() => navigate('/app/optimize')}>Choose a Subject</Button>}
        />
      </Card>
    );
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{subject.name}</Badge>
        <span className="text-caption">{todayLabel}</span>
      </div>
      <DailyPlanView plan={plan} isLoading={false} error={null} onRetry={onRetry} {...rest} />
    </div>
  );
}
