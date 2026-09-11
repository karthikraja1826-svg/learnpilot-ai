import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { EodTest } from '../types/eodTest';
import type { Evaluation } from '../types/evaluation';

export async function getTodayEvaluation(): Promise<{ test: EodTest | null; evaluation: Evaluation | null }> {
  const response = await api.get<ApiSuccess<{ test: EodTest | null; evaluation: Evaluation | null }>>(
    '/evaluation/today'
  );
  return response.data.data;
}

export async function generateTodayEvaluation(
  regenerate = false
): Promise<{ test: EodTest; evaluation: Evaluation }> {
  const response = await api.post<ApiSuccess<{ test: EodTest; evaluation: Evaluation }>>(
    '/evaluation/today/generate',
    { regenerate }
  );
  return response.data.data;
}
