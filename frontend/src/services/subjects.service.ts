import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { Subject } from '../types/academic';

export interface SubjectInput {
  name: string;
  description?: string;
  difficulty?: number;
  importance?: number;
  targetPerformance?: number;
  color?: string;
}

export async function listSubjects(): Promise<Subject[]> {
  const response = await api.get<ApiSuccess<{ subjects: Subject[] }>>('/subjects', {
    params: { limit: 100, sortBy: 'name', order: 'asc' },
  });
  return response.data.data.subjects;
}

export async function createSubject(input: SubjectInput): Promise<Subject> {
  const response = await api.post<ApiSuccess<{ subject: Subject }>>('/subjects', input);
  return response.data.data.subject;
}

export async function updateSubject(id: string, input: Partial<SubjectInput>): Promise<Subject> {
  const response = await api.put<ApiSuccess<{ subject: Subject }>>(`/subjects/${id}`, input);
  return response.data.data.subject;
}

export async function deleteSubject(id: string): Promise<void> {
  await api.delete(`/subjects/${id}`);
}

// The subject the user has chosen to optimize. Persisted on the backend
// (on the user's profile) rather than in local component state, so it
// survives refresh, navigation, and logout/login.
export async function getActiveSubject(): Promise<Subject | null> {
  const response = await api.get<ApiSuccess<{ subject: Subject | null }>>('/subjects/active');
  return response.data.data.subject;
}

export async function setActiveSubject(subjectId: string | null): Promise<Subject | null> {
  const response = await api.put<ApiSuccess<{ subject: Subject | null }>>('/subjects/active', { subjectId });
  return response.data.data.subject;
}
