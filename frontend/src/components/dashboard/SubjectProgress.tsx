import { DashboardSection } from './DashboardSection';
import { ProgressBar } from '../ui/ProgressBar';
import type { Subject } from '../../types/dashboard';

interface SubjectProgressProps {
  subjects: Subject[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SubjectProgress({ subjects, isLoading, error, onRetry }: SubjectProgressProps) {
  const list = subjects ?? [];

  return (
    <DashboardSection
      title="Subject Progress"
      actionLabel="View Subjects"
      actionTo="/app/subjects"
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={list.length === 0}
      emptyTitle="No subjects added yet."
    >
      <ul className="flex flex-col gap-4">
        {list.slice(0, 6).map((subject) => (
          <li key={subject._id}>
            <ProgressBar
              value={subject.currentPerformance}
              label={`${subject.name} · ${Math.round(subject.currentPerformance)}%`}
            />
          </li>
        ))}
      </ul>
    </DashboardSection>
  );
}
