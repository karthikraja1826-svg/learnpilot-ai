import { Trophy } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import type { EodResult } from '../../types/eodTest';

interface TestResultCardProps {
  result: EodResult;
}

export function TestResultCard({ result }: TestResultCardProps) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <span className="text-section-heading">Test Submitted</span>
          <span className="text-caption">
            {result.completionStatus === 'completed' ? 'All questions answered' : 'Submitted with unanswered questions'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success">{result.percentage}% score</Badge>
        <Badge tone="neutral">
          {result.correctAnswers}/{result.totalQuestions} correct
        </Badge>
        <Badge tone="neutral">
          {result.attemptedQuestions}/{result.totalQuestions} attempted
        </Badge>
      </div>

      <ProgressBar value={result.percentage} label={`${result.percentage}% overall`} />

      <div className="flex flex-col gap-2">
        <span className="text-label">Topic-wise performance</span>
        {result.topicPerformance.map((topic) => (
          <div key={topic.topicName} className="flex flex-col gap-1.5 rounded-lg border border-border px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-body">{topic.topicName}</span>
              <span className="text-caption">
                {topic.correct}/{topic.total} &middot; {topic.percentage}%
              </span>
            </div>
            <ProgressBar value={topic.percentage} />
          </div>
        ))}
      </div>
    </Card>
  );
}
