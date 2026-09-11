import { Brain, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { EmptyState } from '../ui/EmptyState';
import type { Evaluation, EvaluationUnderstandingLevel } from '../../types/evaluation';

interface EvaluationCardProps {
  evaluation: Evaluation | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
}

const understandingToneByLevel: Record<EvaluationUnderstandingLevel, 'error' | 'warning' | 'accent' | 'success'> = {
  weak: 'error',
  developing: 'warning',
  proficient: 'accent',
  strong: 'success',
};

const understandingLabelByLevel: Record<EvaluationUnderstandingLevel, string> = {
  weak: 'Needs work',
  developing: 'Developing',
  proficient: 'Proficient',
  strong: 'Strong',
};

export function EvaluationCard({ evaluation, isGenerating, onGenerate, onRegenerate }: EvaluationCardProps) {
  if (!evaluation) {
    return (
      <Card>
        <EmptyState
          icon={<Brain className="h-6 w-6" />}
          title="AI Evaluation"
          description="Get a deeper read on what you actually understood today, beyond just the score."
          action={
            <Button onClick={onGenerate} isLoading={isGenerating} disabled={isGenerating}>
              Evaluate My Performance
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-section-heading">AI Evaluation</span>
            <span className="text-caption">
              {evaluation.generationMetadata.aiUsed ? 'AI-generated insight' : 'Calculated from your study data'}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} isLoading={isGenerating} disabled={isGenerating}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Re-evaluate
        </Button>
      </div>

      <p className="text-secondary">{evaluation.overallAssessment}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border border-border px-3.5 py-2.5">
          <span className="text-label">Strengths</span>
          <ul className="flex flex-col gap-1">
            {evaluation.strengths.map((item) => (
              <li key={item} className="text-body flex gap-2">
                <span aria-hidden="true">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-border px-3.5 py-2.5">
          <span className="text-label">Weaknesses</span>
          <ul className="flex flex-col gap-1">
            {evaluation.weaknesses.map((item) => (
              <li key={item} className="text-body flex gap-2">
                <span aria-hidden="true">&minus;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label">Topic-wise insight</span>
        {evaluation.topicInsights.map((topic) => (
          <div key={topic.topicName} className="flex flex-col gap-1.5 rounded-lg border border-border px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-body">{topic.topicName}</span>
              <Badge tone={understandingToneByLevel[topic.understandingLevel]}>
                {understandingLabelByLevel[topic.understandingLevel]}
              </Badge>
            </div>
            <p className="text-caption">{topic.recommendation}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-surface-elevated px-3.5 py-2.5">
        <span className="text-label">Study consistency</span>
        <ProgressBar
          value={evaluation.studyConsistency.consistencyScore}
          label={`${evaluation.studyConsistency.consistencyScore}% consistent with your plan`}
        />
        <p className="text-caption">{evaluation.studyConsistency.assessment}</p>
      </div>

      <p className="text-caption">{evaluation.plannedVsActualInsight}</p>

      <div className="flex flex-col gap-2">
        <span className="text-label">Recommended focus areas</span>
        <div className="flex flex-wrap gap-2">
          {evaluation.recommendedFocusAreas.map((area) => (
            <Badge key={area} tone="accent">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {area}
            </Badge>
          ))}
        </div>
      </div>

      <p className="text-secondary">{evaluation.learningSummary}</p>
    </Card>
  );
}
