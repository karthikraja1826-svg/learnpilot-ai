import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { PlanStatus, StudyPlan, StudyPlanEntry, Subject } from '../types/academic';

export async function getTodayPlan(): Promise<StudyPlan | null> {
  const response = await api.get<ApiSuccess<{ plan: StudyPlan | null }>>('/study-plans/today');
  return response.data.data.plan;
}

export async function getCurrentWeekPlan(): Promise<StudyPlan | null> {
  const response = await api.get<ApiSuccess<{ plan: StudyPlan | null }>>('/study-plans/current-week');
  return response.data.data.plan;
}

export async function generateDailyPlan(date?: string): Promise<StudyPlan> {
  const response = await api.post<ApiSuccess<{ plan: StudyPlan }>>('/study-plans/generate/daily', date ? { date } : {});
  return response.data.data.plan;
}

export async function generateWeeklyPlan(startDate?: string): Promise<StudyPlan> {
  const response = await api.post<ApiSuccess<{ plan: StudyPlan }>>(
    '/study-plans/generate/weekly',
    startDate ? { startDate } : {}
  );
  return response.data.data.plan;
}

// Part 2 — AI Daily Roadmap: a daily plan scoped to the user's active
// optimization subject (see subjects.service.ts getActiveSubject/setActiveSubject).
export interface TodayRoadmap {
  plan: StudyPlan | null;
  subject: Subject | null;
}

export async function getTodayRoadmap(): Promise<TodayRoadmap> {
  const response = await api.get<ApiSuccess<{ plan: StudyPlan | null; subject: Subject | null }>>(
    '/study-plans/roadmap/today'
  );
  return { plan: response.data.data.plan, subject: response.data.data.subject };
}

export async function generateRoadmap(date?: string): Promise<StudyPlan> {
  const response = await api.post<ApiSuccess<{ plan: StudyPlan }>>(
    '/study-plans/roadmap/generate',
    date ? { date } : {}
  );
  return response.data.data.plan;
}

export async function regeneratePlan(planId: string): Promise<StudyPlan> {
  const response = await api.post<ApiSuccess<{ plan: StudyPlan }>>(`/study-plans/${planId}/regenerate`);
  return response.data.data.plan;
}

export interface ManualEntryInput {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  subject?: string | null;
  topic?: string | null;
  assignment?: string | null;
  task?: string | null;
  subjectName?: string;
  topicName?: string;
  activityType: StudyPlanEntry['activityType'];
  priority: number;
  status?: StudyPlanEntry['status'];
  reason?: string;
}

export function entryToManualInput(entry: StudyPlanEntry): ManualEntryInput {
  return {
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    durationMinutes: entry.durationMinutes,
    subject: entry.subject ?? null,
    topic: entry.topic ?? null,
    assignment: entry.assignment ?? null,
    task: entry.task ?? null,
    subjectName: entry.subjectName,
    topicName: entry.topicName,
    activityType: entry.activityType,
    priority: entry.priority,
    status: entry.status,
    reason: entry.reason ?? '',
  };
}

export async function updatePlanEntries(planId: string, entries: ManualEntryInput[]): Promise<StudyPlan> {
  const response = await api.put<ApiSuccess<{ plan: StudyPlan }>>(`/study-plans/${planId}`, { entries });
  return response.data.data.plan;
}

export async function updatePlanStatus(planId: string, status: PlanStatus): Promise<StudyPlan> {
  const response = await api.put<ApiSuccess<{ plan: StudyPlan }>>(`/study-plans/${planId}`, { status });
  return response.data.data.plan;
}
