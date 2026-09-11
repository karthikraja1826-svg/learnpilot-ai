import type { StudyPlan, Subject } from './academic';
import type { EodTest } from './eodTest';
import type { Evaluation } from './evaluation';

export type OptimizationBlockReason =
  | 'no_active_subject'
  | 'test_not_generated'
  | 'test_not_submitted'
  | 'evaluation_missing';

export interface OptimizationStatus {
  canOptimize: boolean;
  reason: OptimizationBlockReason | null;
  subject: Subject | null;
  test: EodTest | null;
  evaluation: Evaluation | null;
  nextDayPlan: StudyPlan | null;
}

export interface OptimizeNextDayResult {
  plan: StudyPlan;
  subject: Subject;
  // Present (possibly empty) when a new plan was generated this call; null
  // when an already-existing next-day plan was simply returned untouched.
  changes: string[] | null;
}
