import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { Exam, PriorityLevel } from '../types/academic';

export interface ExamInput {
  title: string;
  subject?: string | null;
  examDate: string;
  description?: string;
  priority?: PriorityLevel;
}

export interface ListExamsParams {
  filter?: 'upcoming' | 'past' | 'completed';
  sortBy?: 'examDate' | 'priority' | 'title' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export async function listExams(params: ListExamsParams = {}): Promise<Exam[]> {
  const response = await api.get<ApiSuccess<{ exams: Exam[] }>>('/exams', {
    params: { limit: 100, sortBy: 'examDate', order: 'asc', ...params },
  });
  return response.data.data.exams;
}

export async function createExam(input: ExamInput): Promise<Exam> {
  const response = await api.post<ApiSuccess<{ exam: Exam }>>('/exams', input);
  return response.data.data.exam;
}

export async function updateExam(id: string, input: Partial<ExamInput>): Promise<Exam> {
  const response = await api.put<ApiSuccess<{ exam: Exam }>>(`/exams/${id}`, input);
  return response.data.data.exam;
}

export async function deleteExam(id: string): Promise<void> {
  await api.delete(`/exams/${id}`);
}
