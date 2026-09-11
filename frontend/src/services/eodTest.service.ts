import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { EodResult, EodTest, EodTestPreview, SubmitAnswerInput } from '../types/eodTest';

export async function getTodayTestPreview(): Promise<EodTestPreview> {
  const response = await api.get<ApiSuccess<{ preview: EodTestPreview }>>('/eod-test/today/preview');
  return response.data.data.preview;
}

export async function getTodayTest(): Promise<EodTest | null> {
  const response = await api.get<ApiSuccess<{ test: EodTest | null }>>('/eod-test/today');
  return response.data.data.test;
}

export async function generateTodayTest(): Promise<EodTest> {
  const response = await api.post<ApiSuccess<{ test: EodTest }>>('/eod-test/today/generate');
  return response.data.data.test;
}

export async function startTodayTest(): Promise<EodTest> {
  const response = await api.post<ApiSuccess<{ test: EodTest }>>('/eod-test/today/start');
  return response.data.data.test;
}

export async function submitTodayTest(answers: SubmitAnswerInput[]): Promise<EodTest> {
  const response = await api.post<ApiSuccess<{ test: EodTest }>>('/eod-test/today/submit', { answers });
  return response.data.data.test;
}

export async function getTodayResult(): Promise<{ test: EodTest; result: EodResult }> {
  const response = await api.get<ApiSuccess<{ test: EodTest; result: EodResult }>>('/eod-test/today/result');
  return response.data.data;
}
