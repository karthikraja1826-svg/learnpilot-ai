import { CheckCircle2, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import type { AdaptiveAnalysis, AdaptiveRecommendation } from '../../types/analytics';

interface AdaptiveScheduleCardProps {
  analysis: AdaptiveAnalysis;
}

const RECOMMENDATION_LABEL: Record<AdaptiveRecommendation['type'], string> = {
  increase_study_time: 'Consider increasing study time',
  reduce_study_time: 'Consider reducing study time',
  reschedule_missed_work: 'Reschedule missed work',
  prioritize_exam: 'Prioritize an upcoming exam',
};

export function AdaptiveScheduleCard({ analysis }: AdaptiveScheduleCardProps) {
  const hasChanges =
    analysis.recommendations.length > 0 || analysis.missedEntries.length > 0 || analysis.upcomingExams.length > 0;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">Adaptive Scheduling</h2>

      {!hasChanges ? (
        <div className="flex items-center gap-2.5 py-2">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
          <span className="text-secondary">Your current plan is on track.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-accent" aria-hidden="true" />
            <span className="text-body font-medium">Your plan was adjusted</span>
          </div>

          {analysis.recommendations.length > 0 && (
            <ul className="flex flex-col gap-2">
              {analysis.recommendations.map((recommendation, index) => (
                <li key={`${recommendation.type}-${index}`} className="flex flex-col gap-0.5 rounded-md bg-surface-elevated p-3">
                  <span className="text-label">{RECOMMENDATION_LABEL[recommendation.type]}</span>
                  <span className="text-caption">{recommendation.reason}</span>
                </li>
              ))}
            </ul>
          )}

          {analysis.missedEntries.length > 0 && (
            <p className="text-caption">
              {analysis.missedEntries.length} missed session{analysis.missedEntries.length === 1 ? '' : 's'} identified
              for rescheduling.
            </p>
          )}

          {analysis.upcomingExams.length > 0 && (
            <p className="text-caption">
              {analysis.upcomingExams.length} upcoming exam{analysis.upcomingExams.length === 1 ? '' : 's'} factored
              into your schedule.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
