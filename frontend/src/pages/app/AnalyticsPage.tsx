import { useCallback, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Tabs } from '../../components/ui/Tabs';
import { OverviewMetrics } from '../../components/analytics/OverviewMetrics';
import { StudyTimeChart } from '../../components/analytics/StudyTimeChart';
import { SubjectPerformanceList } from '../../components/analytics/SubjectPerformanceList';
import { ConsistencyPanel } from '../../components/analytics/ConsistencyPanel';
import { StreakPanel } from '../../components/analytics/StreakPanel';
import { ProductivityInsights } from '../../components/analytics/ProductivityInsights';
import { AdaptiveScheduleCard } from '../../components/analytics/AdaptiveScheduleCard';
import { SessionHistoryList } from '../../components/pomodoro/SessionHistoryList';
import { useResource } from '../../hooks/useResource';
import { getDailyAnalytics, getWeeklyAnalytics, getStreak } from '../../services/dashboard.service';
import { listSubjects } from '../../services/subjects.service';
import { listTopics } from '../../services/topics.service';
import { listSessionHistory, type SessionHistoryFilters } from '../../services/studySessions.service';
import {
  getAdaptiveRecommendations,
  getAnalyticsOverview,
  getProductivityAnalytics,
  getSubjectsAnalytics,
} from '../../services/analytics.service';
import { formatMinutes } from '../../utils/dashboardFormat';
import type { DailyPerformance, WeeklyPerformance } from '../../types/dashboard';

function PeriodSummary({ label, data }: { label: string; data: DailyPerformance | WeeklyPerformance }) {
  const percent = Math.round(data.completionRate * 100);
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-section-heading">{label}</h2>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl text-text-primary">{formatMinutes(data.completedMinutes)}</span>
        <span className="text-secondary">/ {formatMinutes(data.plannedMinutes)} planned</span>
      </div>
      <ProgressBar value={percent} label={`${percent}% complete`} />
      <p className="text-caption">
        {data.sessionsCompleted} session{data.sessionsCompleted === 1 ? '' : 's'} completed · productivity score{' '}
        {data.productivityScore}
      </p>
    </Card>
  );
}

export function AnalyticsPage() {
  const overviewRes = useResource(getAnalyticsOverview, []);
  const dailyRes = useResource(getDailyAnalytics, []);
  const weeklyRes = useResource(getWeeklyAnalytics, []);
  const streakRes = useResource(getStreak, []);
  const subjectsAnalyticsRes = useResource(getSubjectsAnalytics, []);
  const productivityRes = useResource(getProductivityAnalytics, []);
  const adaptiveRes = useResource(getAdaptiveRecommendations, []);
  const subjectsRes = useResource(listSubjects, []);
  const topicsRes = useResource(useCallback(() => listTopics(), []), []);

  const [historyFilters, setHistoryFilters] = useState<SessionHistoryFilters>({ page: 1, limit: 10 });
  const historyRes = useResource(
    useCallback(() => listSessionHistory(historyFilters), [historyFilters]),
    [historyFilters]
  );

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    (subjectsRes.data ?? []).forEach((subject) => map.set(subject._id, subject.name));
    return map;
  }, [subjectsRes.data]);

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>();
    (topicsRes.data ?? []).forEach((topic) => map.set(topic._id, topic.name));
    return map;
  }, [topicsRes.data]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-page-heading">Study Analytics</h1>
        <p className="text-secondary">Understand your study habits and make every week more intentional.</p>
      </div>

      {overviewRes.isLoading ? (
        <Card>
          <LoadingState label="Loading overview" className="py-8" />
        </Card>
      ) : overviewRes.error ? (
        <Card>
          <ErrorState description={overviewRes.error} onRetry={overviewRes.reload} className="border-none px-0 py-8" />
        </Card>
      ) : overviewRes.data ? (
        <OverviewMetrics overview={overviewRes.data} />
      ) : null}

      <Tabs
        tabs={[
          {
            id: 'today',
            label: 'Today',
            content: dailyRes.isLoading ? (
              <Card>
                <LoadingState label="Loading today's analytics" className="py-8" />
              </Card>
            ) : dailyRes.error ? (
              <Card>
                <ErrorState description={dailyRes.error} onRetry={dailyRes.reload} className="border-none px-0 py-8" />
              </Card>
            ) : dailyRes.data ? (
              <PeriodSummary label="Today" data={dailyRes.data} />
            ) : null,
          },
          {
            id: 'week',
            label: 'This Week',
            content: weeklyRes.isLoading ? (
              <Card>
                <LoadingState label="Loading weekly analytics" className="py-8" />
              </Card>
            ) : weeklyRes.error ? (
              <Card>
                <ErrorState description={weeklyRes.error} onRetry={weeklyRes.reload} className="border-none px-0 py-8" />
              </Card>
            ) : weeklyRes.data ? (
              <PeriodSummary label="This Week" data={weeklyRes.data} />
            ) : null,
          },
        ]}
      />

      {weeklyRes.data && !weeklyRes.isLoading && !weeklyRes.error && (
        <>
          <StudyTimeChart weekly={weeklyRes.data} />
          <ConsistencyPanel weekly={weeklyRes.data} />
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {subjectsAnalyticsRes.isLoading ? (
          <Card>
            <LoadingState label="Loading subject performance" className="py-8" />
          </Card>
        ) : subjectsAnalyticsRes.error ? (
          <Card>
            <ErrorState
              description={subjectsAnalyticsRes.error}
              onRetry={subjectsAnalyticsRes.reload}
              className="border-none px-0 py-8"
            />
          </Card>
        ) : subjectsAnalyticsRes.data ? (
          <SubjectPerformanceList subjects={subjectsAnalyticsRes.data.subjects} />
        ) : null}

        {streakRes.isLoading ? (
          <Card>
            <LoadingState label="Loading streak" className="py-8" />
          </Card>
        ) : streakRes.error ? (
          <Card>
            <ErrorState description={streakRes.error} onRetry={streakRes.reload} className="border-none px-0 py-8" />
          </Card>
        ) : streakRes.data ? (
          <StreakPanel streak={streakRes.data} />
        ) : null}
      </div>

      {overviewRes.data && subjectsAnalyticsRes.data && productivityRes.data && (
        <ProductivityInsights
          overview={overviewRes.data}
          subjects={subjectsAnalyticsRes.data.subjects}
          productivity={productivityRes.data}
        />
      )}
      {productivityRes.isLoading && (
        <Card>
          <LoadingState label="Loading productivity insights" className="py-8" />
        </Card>
      )}
      {productivityRes.error && (
        <Card>
          <ErrorState description={productivityRes.error} onRetry={productivityRes.reload} className="border-none px-0 py-8" />
        </Card>
      )}

      {adaptiveRes.isLoading ? (
        <Card>
          <LoadingState label="Loading adaptive schedule" className="py-8" />
        </Card>
      ) : adaptiveRes.error ? (
        <Card>
          <ErrorState description={adaptiveRes.error} onRetry={adaptiveRes.reload} className="border-none px-0 py-8" />
        </Card>
      ) : adaptiveRes.data ? (
        <AdaptiveScheduleCard analysis={adaptiveRes.data} />
      ) : null}

      <SessionHistoryList
        sessions={historyRes.data?.sessions ?? []}
        pagination={historyRes.data?.pagination}
        onPageChange={(page) => setHistoryFilters((prev) => ({ ...prev, page }))}
        subjectNameById={subjectNameById}
        topicNameById={topicNameById}
        isLoading={historyRes.isLoading}
        error={historyRes.error}
        onRetry={historyRes.reload}
        subjects={subjectsRes.data ?? []}
        filters={historyFilters}
        onFilterChange={(next) => setHistoryFilters({ ...next, page: 1, limit: 10 })}
      />
    </div>
  );
}
