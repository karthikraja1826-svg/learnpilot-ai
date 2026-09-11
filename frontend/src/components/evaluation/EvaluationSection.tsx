import { useCallback, useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EvaluationCard } from './EvaluationCard';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { generateTodayEvaluation, getTodayEvaluation } from '../../services/evaluation.service';
import type { Evaluation } from '../../types/evaluation';

interface EvaluationSectionProps {
  // Used only to re-run the load when a new test is submitted.
  testId: string;
}

export function EvaluationSection({ testId }: EvaluationSectionProps) {
  const { showToast } = useToast();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { evaluation: existing } = await getTodayEvaluation();
      setEvaluation(existing);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load your evaluation right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const handleGenerate = async (regenerate: boolean) => {
    setIsGenerating(true);
    try {
      const { evaluation: generated } = await generateTodayEvaluation(regenerate);
      setEvaluation(generated);
    } catch (err) {
      showToast(
        err instanceof ApiRequestError ? err.message : 'Could not generate your evaluation. Please try again.',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <LoadingState label="Loading your evaluation" className="py-10" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <ErrorState description={error} onRetry={load} className="border-none px-0 py-10" />
      </Card>
    );
  }

  return (
    <EvaluationCard
      evaluation={evaluation}
      isGenerating={isGenerating}
      onGenerate={() => handleGenerate(false)}
      onRegenerate={() => handleGenerate(true)}
    />
  );
}
