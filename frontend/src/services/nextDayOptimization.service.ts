import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { StudyPlan, Subject } from '../types/academic';
import type { OptimizationStatus, OptimizeNextDayResult } from '../types/nextDayOptimization';

export async function getOptimizationStatus(): Promise<OptimizationStatus> {
  const response = await api.get<ApiSuccess<OptimizationStatus>>('/study-plans/optimize-next-day/status');
  return response.data.data;
}

export interface NextDayRoadmap {
  plan: StudyPlan | null;
  subject: Subject | null;
}

export async function getNextDayPlan(): Promise<NextDayRoadmap> {
  const response = await api.get<ApiSuccess<{ plan: StudyPlan | null; subject: Subject | null }>>(
    '/study-plans/optimize-next-day'
  );
  return { plan: response.data.data.plan, subject: response.data.data.subject };
}

export async function optimizeNextDay(regenerate = false): Promise<OptimizeNextDayResult> {
  const response = await api.post<ApiSuccess<OptimizeNextDayResult>>('/study-plans/optimize-next-day', {
    regenerate,
  });
  return response.data.data;
}
