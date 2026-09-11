import { api } from './api';
import type { ApiSuccess, PaginationMeta } from '../types/api';
import type { SessionStatus, SessionType, StudySession } from '../types/dashboard';
import type { ActivityType, StudyPlanEntry } from '../types/academic';

const SESSION_TYPE_BY_ACTIVITY: Record<ActivityType, SessionType> = {
  study: 'focus',
  revision: 'revision',
  assignment: 'assignment',
  practice: 'practice',
  review: 'review',
};

export async function startFocusSessionForEntry(planId: string, entry: StudyPlanEntry): Promise<StudySession> {
  const created = await api.post<ApiSuccess<{ session: StudySession }>>('/study-sessions', {
    studyPlan: planId,
    studyPlanEntry: entry._id,
    subject: entry.subject ?? undefined,
    topic: entry.topic ?? undefined,
    sessionType: SESSION_TYPE_BY_ACTIVITY[entry.activityType] ?? 'focus',
    plannedDurationMinutes: entry.durationMinutes,
  });

  const started = await api.post<ApiSuccess<{ session: StudySession }>>(
    `/study-sessions/${created.data.data.session._id}/start`
  );
  return started.data.data.session;
}

export interface CreateManualSessionInput {
  subject?: string;
  topic?: string;
  sessionType: SessionType;
  plannedDurationMinutes: number;
  focusDurationMinutes?: number;
  shortBreakDurationMinutes?: number;
  longBreakDurationMinutes?: number;
  cyclesPlanned?: number;
}

export async function createManualSession(input: CreateManualSessionInput): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>('/study-sessions', input);
  return response.data.data.session;
}

export async function startSession(sessionId: string): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>(`/study-sessions/${sessionId}/start`);
  return response.data.data.session;
}

export async function pauseSession(sessionId: string): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>(`/study-sessions/${sessionId}/pause`);
  return response.data.data.session;
}

export async function resumeSession(sessionId: string): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>(`/study-sessions/${sessionId}/resume`);
  return response.data.data.session;
}

export interface CompleteSessionInput {
  focusRating?: number;
  notes?: string;
}

export async function completeSession(sessionId: string, input: CompleteSessionInput = {}): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>(`/study-sessions/${sessionId}/complete`, input);
  return response.data.data.session;
}

export async function cancelSession(sessionId: string): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>(`/study-sessions/${sessionId}/cancel`);
  return response.data.data.session;
}

export async function completeCycle(sessionId: string): Promise<StudySession> {
  const response = await api.post<ApiSuccess<{ session: StudySession }>>(`/study-sessions/${sessionId}/cycle`);
  return response.data.data.session;
}

export interface SessionHistoryFilters {
  status?: SessionStatus;
  subjectId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function listSessionHistory(
  filters: SessionHistoryFilters = {}
): Promise<{ sessions: StudySession[]; pagination: PaginationMeta }> {
  const response = await api.get<ApiSuccess<{ sessions: StudySession[]; pagination: PaginationMeta }>>(
    '/study-sessions',
    { params: { limit: 10, ...filters } }
  );
  return response.data.data;
}
