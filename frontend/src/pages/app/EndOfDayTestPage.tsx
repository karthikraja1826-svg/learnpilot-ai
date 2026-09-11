import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { LinkButton } from '../../components/ui/LinkButton';
import { TestIntroCard } from '../../components/eodtest/TestIntroCard';
import { TestQuestionCard } from '../../components/eodtest/TestQuestionCard';
import { TestResultCard } from '../../components/eodtest/TestResultCard';
import { EvaluationSection } from '../../components/evaluation/EvaluationSection';
import { NextDayOptimizationSection } from '../../components/studyplan/NextDayOptimizationSection';
import { useResource } from '../../hooks/useResource';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import {
  generateTodayTest,
  getTodayTest,
  getTodayTestPreview,
  startTodayTest,
  submitTodayTest,
} from '../../services/eodTest.service';
import type { EodTest, EodTestPreview } from '../../types/eodTest';

type ViewMode = 'loading' | 'intro' | 'active' | 'result';

async function loadInitialState(): Promise<{ test: EodTest | null; preview: EodTestPreview | null; blockedReason: string | null }> {
  const test = await getTodayTest();
  try {
    const preview = await getTodayTestPreview();
    return { test, preview, blockedReason: null };
  } catch (err) {
    const message =
      err instanceof ApiRequestError ? err.message : 'Could not load today\u2019s test information right now.';
    return { test, preview: null, blockedReason: message };
  }
}

export function EndOfDayTestPage() {
  const { showToast } = useToast();
  const initialRes = useResource(loadInitialState, []);

  const [test, setTest] = useState<EodTest | null>(null);
  const [mode, setMode] = useState<ViewMode>('loading');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyLoadedTest = useCallback((loaded: EodTest | null) => {
    setTest(loaded);
    if (loaded?.status === 'submitted') {
      setMode('result');
    } else if (loaded?.status === 'started') {
      setAnswers(
        Object.fromEntries(loaded.answers.map((a) => [a.question, a.answerText]))
      );
      setQuestionIndex(0);
      setMode('active');
    } else {
      setMode('intro');
    }
  }, []);

  useEffect(() => {
    if (initialRes.isLoading) return;
    if (initialRes.data) {
      applyLoadedTest(initialRes.data.test);
    }
  }, [initialRes.isLoading, initialRes.data, applyLoadedTest]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      if (!test) {
        await generateTodayTest();
      }
      const started = await startTodayTest();
      setTest(started);
      setAnswers({});
      setQuestionIndex(0);
      setMode('active');
    } catch (err) {
      showToast(
        err instanceof ApiRequestError ? err.message : 'Could not start today\u2019s test. Please try again.',
        'error'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!test) return;
    setIsSubmitting(true);
    try {
      const payload = test.questions.map((q) => ({
        questionId: q._id,
        answerText: answers[q._id] ?? '',
      }));
      const submitted = await submitTodayTest(payload);
      setTest(submitted);
      setMode('result');
      showToast('Test submitted.', 'success');
    } catch (err) {
      showToast(
        err instanceof ApiRequestError ? err.message : 'Could not submit your test. Please try again.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = useMemo(
    () => (test ? test.questions.filter((q) => (answers[q._id] ?? '').trim().length > 0).length : 0),
    [test, answers]
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">End-of-Day Test</h1>
        <p className="text-secondary">A quick check on what you studied today.</p>
      </div>

      {initialRes.isLoading ? (
        <Card>
          <LoadingState label="Loading today's test" className="py-10" />
        </Card>
      ) : initialRes.error ? (
        <Card>
          <ErrorState description={initialRes.error} onRetry={initialRes.reload} className="border-none px-0 py-10" />
        </Card>
      ) : mode === 'intro' ? (
        <TestIntroCard
          preview={initialRes.data?.preview ?? null}
          blockedReason={initialRes.data?.blockedReason ?? null}
          onStart={handleStart}
          isStarting={isStarting}
        />
      ) : mode === 'active' && test ? (
        <TestQuestionCard
          question={test.questions[questionIndex]}
          index={questionIndex}
          total={test.questions.length}
          answer={answers[test.questions[questionIndex]._id] ?? ''}
          answeredCount={answeredCount}
          onAnswer={(value) =>
            setAnswers((current) => ({ ...current, [test.questions[questionIndex]._id]: value }))
          }
          onPrevious={() => setQuestionIndex((i) => Math.max(0, i - 1))}
          onNext={() => setQuestionIndex((i) => Math.min(test.questions.length - 1, i + 1))}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      ) : mode === 'result' && test?.result ? (
        <>
          <TestResultCard result={test.result} />
          <EvaluationSection testId={test._id} />
          <NextDayOptimizationSection testId={test._id} />
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <LinkButton to="/app/study-plan" variant="ghost" size="sm">
          Back to Study Plan
        </LinkButton>
        <LinkButton to="/app/dashboard" variant="ghost" size="sm">
          Back to Dashboard
        </LinkButton>
      </div>
    </div>
  );
}
