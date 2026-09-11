import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useResource } from '../../hooks/useResource';
import * as dashboardService from '../../services/dashboard.service';
import { getTodayPlan } from '../../services/studyPlans.service';
import { listSubjects } from '../../services/subjects.service';
import { listTopics } from '../../services/topics.service';
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { ProgressOverview } from '../../components/dashboard/ProgressOverview';
import { NextStudySession } from '../../components/dashboard/NextStudySession';
import { TodayStudyPlan } from '../../components/dashboard/TodayStudyPlan';
import { PriorityTasks } from '../../components/dashboard/PriorityTasks';
import { UpcomingDeadlines } from '../../components/dashboard/UpcomingDeadlines';
import { StreakCard } from '../../components/dashboard/StreakCard';
import { WeeklyStudySummary } from '../../components/dashboard/WeeklyStudySummary';
import { SubjectProgress } from '../../components/dashboard/SubjectProgress';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { QuickActions } from '../../components/dashboard/QuickActions';

export function DashboardPage() {
  const { profile } = useAuth();

  const plan = useResource(getTodayPlan);
  const daily = useResource(dashboardService.getDailyAnalytics);
  const weekly = useResource(dashboardService.getWeeklyAnalytics);
  const streak = useResource(dashboardService.getStreak);
  const activeSession = useResource(dashboardService.getActiveSession);
  const tasks = useResource(dashboardService.listIncompleteTasks);
  const exams = useResource(dashboardService.listUpcomingExams);
  const assignments = useResource(dashboardService.listUpcomingAssignments);
  const subjects = useResource(listSubjects);
  const topics = useResource(listTopics);
  const recentTasks = useResource(dashboardService.listRecentCompletedTasks);
  const recentSessions = useResource(dashboardService.listRecentCompletedSessions);

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    (subjects.data ?? []).forEach((subject) => map.set(subject._id, subject.name));
    return map;
  }, [subjects.data]);

  const topicNameById = useMemo(() => {
    const map = new Map<string, string>();
    (topics.data ?? []).forEach((topic) => map.set(topic._id, topic.name));
    return map;
  }, [topics.data]);

  const hasPlanToday = Boolean(plan.data && plan.data.entries.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader name={profile?.name} profileImage={profile?.profileImage} hasPlanToday={hasPlanToday} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProgressOverview
            plan={plan.data}
            daily={daily.data}
            isLoading={plan.isLoading || daily.isLoading}
            error={plan.error ?? daily.error}
            onRetry={() => {
              plan.reload();
              daily.reload();
            }}
          />
        </div>
        <NextStudySession
          plan={plan.data}
          activeSession={activeSession.data}
          subjectNameById={subjectNameById}
          topicNameById={topicNameById}
          timezone={profile?.timezone}
          isLoading={plan.isLoading || activeSession.isLoading}
          error={plan.error ?? activeSession.error}
          onRetry={() => {
            plan.reload();
            activeSession.reload();
          }}
        />
      </div>

      <TodayStudyPlan plan={plan.data} isLoading={plan.isLoading} error={plan.error} onRetry={plan.reload} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PriorityTasks
          tasks={tasks.data}
          subjectNameById={subjectNameById}
          isLoading={tasks.isLoading}
          error={tasks.error}
          onRetry={tasks.reload}
        />
        <UpcomingDeadlines
          exams={exams.data}
          assignments={assignments.data}
          subjectNameById={subjectNameById}
          isLoading={exams.isLoading || assignments.isLoading}
          error={exams.error ?? assignments.error}
          onRetry={() => {
            exams.reload();
            assignments.reload();
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <StreakCard streak={streak.data} isLoading={streak.isLoading} error={streak.error} onRetry={streak.reload} />
        <div className="lg:col-span-2">
          <WeeklyStudySummary weekly={weekly.data} isLoading={weekly.isLoading} error={weekly.error} onRetry={weekly.reload} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SubjectProgress
          subjects={subjects.data}
          isLoading={subjects.isLoading}
          error={subjects.error}
          onRetry={subjects.reload}
        />
        <RecentActivity
          completedTasks={recentTasks.data}
          completedSessions={recentSessions.data}
          subjectNameById={subjectNameById}
          isLoading={recentTasks.isLoading || recentSessions.isLoading}
          error={recentTasks.error ?? recentSessions.error}
          onRetry={() => {
            recentTasks.reload();
            recentSessions.reload();
          }}
        />
      </div>

      <QuickActions />
    </div>
  );
}
