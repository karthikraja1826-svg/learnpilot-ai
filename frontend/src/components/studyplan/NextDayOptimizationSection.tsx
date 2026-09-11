import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LinkButton } from '../ui/LinkButton';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../../hooks/useToast';
import { ApiRequestError } from '../../services/api';
import { getOptimizationStatus, optimizeNextDay } from '../../services/nextDayOptimization.service';
import { formatMinutes } from '../../utils/dashboardFormat';
import type { OptimizationBlockReason, OptimizationStatus } from '../../types/nextDayOptimization';

interface NextDayOptimizationSectionProps {
  // Used only to re-run the load when a new test is submitted.
  testId: string;
}

const BLOCK_MESSAGE: Record<OptimizationBlockReason, string> = {
  no_active_subject: 'Choose a subject to optimize before generating tomorrow\u2019s roadmap.',
  test_not_generated: "Complete today's study flow before optimizing tomorrow's roadmap.",
  test_not_submitted: "Submit today's test before optimizing tomorrow's roadmap.",
  evaluation_missing: 'Generate today\u2019s AI evaluation above before optimizing tomorrow\u2019s roadmap.',
};

const formatDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export function NextDayOptimizationSection({ testId }: NextDayOptimizationSectionProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<OptimizationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [changes, setChanges] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOptimizationStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load tomorrow's optimization status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const handleOptimize = async (regenerate: boolean) => {
    setIsOptimizing(true);
    try {
      const result = await optimizeNextDay(regenerate);
      setChanges(result.changes);
      setStatus((current) => (current ? { ...current, nextDayPlan: result.plan } : current));
      showToast(
        regenerate ? 'Tomorrow\u2019s roadmap has been re-optimized.' : 'Tomorrow\u2019s roadmap is ready.',
        'success'
      );
    } catch (err) {
      showToast(
        err instanceof ApiRequestError ? err.message : 'Could not optimize tomorrow\u2019s roadmap. Please try again.',
        'error'
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <LoadingState label="Checking tomorrow's optimization status" className="py-10" />
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

  if (!status) {
    return null;
  }

  if (!status.canOptimize) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Optimize Next Day"
          description={status.reason ? BLOCK_MESSAGE[status.reason] : 'Not available yet.'}
        />
      </Card>
    );
  }

  const nextDayPlan = status.nextDayPlan;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <CalendarClock className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-section-heading">Optimize Next Day</span>
            <span className="text-caption">
              {nextDayPlan
                ? `Roadmap ready for ${formatDateLabel(nextDayPlan.startDate)}`
                : "Build tomorrow's roadmap from today's evaluation."}
            </span>
          </div>
        </div>

        {nextDayPlan ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOptimize(true)}
            isLoading={isOptimizing}
            disabled={isOptimizing}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Re-optimize
          </Button>
        ) : (
          <Button onClick={() => handleOptimize(false)} isLoading={isOptimizing} disabled={isOptimizing}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Optimize Next Day
          </Button>
        )}
      </div>

      {nextDayPlan && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{formatMinutes(nextDayPlan.totalPlannedMinutes)} planned</Badge>
            <Badge tone="accent">
              {nextDayPlan.entries.length} {nextDayPlan.entries.length === 1 ? 'session' : 'sessions'}
            </Badge>
            <Badge tone="neutral">{nextDayPlan.source === 'ai' ? 'AI-generated' : 'Algorithm-generated'}</Badge>
          </div>

          {changes && changes.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-border px-3.5 py-2.5">
              <span className="text-label">What changed</span>
              <ul className="flex flex-col gap-1">
                {changes.map((change) => (
                  <li key={change} className="text-body flex gap-2">
                    <span aria-hidden="true">&bull;</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <LinkButton to="/app/study-plan" size="sm">
              View Next Day Roadmap
            </LinkButton>
          </div>
        </>
      )}
    </Card>
  );
}
