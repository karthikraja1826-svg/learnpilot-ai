import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { Assignment, DailyPerformance, Exam, StreakInfo, StudySession, Task, WeeklyPerformance } from '../types/dashboard';

export async function getDailyAnalytics(): Promise<DailyPerformance> {
  const response = await api.get<ApiSuccess<{ daily: DailyPerformance }>>('/analytics/daily');
  return response.data.data.daily;
}

export async function getWeeklyAnalytics(): Promise<WeeklyPerformance> {
  const response = await api.get<ApiSuccess<{ weekly: WeeklyPerformance }>>('/analytics/weekly');
  return response.data.data.weekly;
}

export async function getStreak(): Promise<StreakInfo> {
  const response = await api.get<ApiSuccess<{ streak: StreakInfo }>>('/streaks');
  return response.data.data.streak;
}

export async function getActiveSession(): Promise<StudySession | null> {
  const response = await api.get<ApiSuccess<{ session: StudySession | null }>>('/study-sessions/active');
  return response.data.data.session;
}

export async function listIncompleteTasks(): Promise<Task[]> {
  const response = await api.get<ApiSuccess<{ tasks: Task[] }>>('/tasks', {
    params: { limit: 50, sortBy: 'dueDate', order: 'asc' },
  });
  return response.data.data.tasks.filter((task) => task.status === 'pending' || task.status === 'in_progress');
}

export async function listUpcomingExams(limit = 5): Promise<Exam[]> {
  const response = await api.get<ApiSuccess<{ exams: Exam[] }>>('/exams', {
    params: { filter: 'upcoming', sortBy: 'examDate', order: 'asc', limit },
  });
  return response.data.data.exams;
}

export async function listUpcomingAssignments(limit = 5): Promise<Assignment[]> {
  const response = await api.get<ApiSuccess<{ assignments: Assignment[] }>>('/assignments', {
    params: { filter: 'upcoming', sortBy: 'deadline', order: 'asc', limit },
  });
  return response.data.data.assignments;
}

export async function listRecentCompletedTasks(limit = 5): Promise<Task[]> {
  const response = await api.get<ApiSuccess<{ tasks: Task[] }>>('/tasks', {
    params: { status: 'completed', sortBy: 'updatedAt', order: 'desc', limit },
  });
  return response.data.data.tasks;
}

export async function listRecentCompletedSessions(limit = 5): Promise<StudySession[]> {
  const response = await api.get<ApiSuccess<{ sessions: StudySession[] }>>('/study-sessions', {
    params: { status: 'completed', limit },
  });
  return response.data.data.sessions;
}
