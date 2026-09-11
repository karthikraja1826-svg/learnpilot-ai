import { ClipboardCheck, ListChecks, Timer } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import type { EodTestPreview } from '../../types/eodTest';

interface TestIntroCardProps {
  preview: EodTestPreview | null;
  blockedReason: string | null;
  onStart: () => void;
  isStarting: boolean;
}

export function TestIntroCard({ preview, blockedReason, onStart, isStarting }: TestIntroCardProps) {
  if (blockedReason) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="No end-of-day test yet."
          description={blockedReason}
        />
      </Card>
    );
  }

  if (!preview) return null;

  const testDateLabel = new Date(preview.testDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{preview.subject.name}</Badge>
          <span className="text-caption">{testDateLabel}</span>
        </div>
        <h2 className="text-section-heading">End-of-Day Test</h2>
        <p className="text-secondary">
          A short assessment based on what you actually studied today &mdash; {preview.totalActualMinutes} focused
          minutes across {preview.topics.length} topic{preview.topics.length === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          {preview.questionCount} question{preview.questionCount === 1 ? '' : 's'}
        </Badge>
        <Badge tone="neutral">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          ~{preview.estimatedTestDurationMinutes} min estimated
        </Badge>
      </div>

      <ul className="flex flex-col gap-2">
        {preview.topics.map((topic) => (
          <li
            key={topic.topicName}
            className="flex items-center justify-between rounded-lg border border-border px-3.5 py-2.5"
          >
            <span className="text-body">{topic.topicName}</span>
            <span className="text-caption">{topic.actualMinutes} min focused</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-elevated px-3.5 py-2.5">
        <span className="text-caption">Answers stay hidden until you submit.</span>
        <Button onClick={onStart} isLoading={isStarting} disabled={isStarting}>
          Start Test
        </Button>
      </div>
    </Card>
  );
}
