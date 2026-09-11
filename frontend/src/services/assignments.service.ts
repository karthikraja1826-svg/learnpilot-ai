import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { Assignment, PriorityLevel } from '../types/academic';

export interface AssignmentInput {
  title: string;
  subject?: string | null;
  description?: string;
  deadline: string;
  estimatedHours: number;
  priority?: PriorityLevel;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ListAssignmentsParams {
  filter?: 'pending' | 'completed' | 'overdue' | 'upcoming';
  sortBy?: 'deadline' | 'priority' | 'title' | 'status' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export async function listAssignments(params: ListAssignmentsParams = {}): Promise<Assignment[]> {
  const response = await api.get<ApiSuccess<{ assignments: Assignment[] }>>('/assignments', {
    params: { limit: 100, sortBy: 'deadline', order: 'asc', ...params },
  });
  return response.data.data.assignments;
}

export async function createAssignment(input: AssignmentInput): Promise<Assignment> {
  const response = await api.post<ApiSuccess<{ assignment: Assignment }>>('/assignments', input);
  return response.data.data.assignment;
}

export async function updateAssignment(id: string, input: Partial<AssignmentInput>): Promise<Assignment> {
  const response = await api.put<ApiSuccess<{ assignment: Assignment }>>(`/assignments/${id}`, input);
  return response.data.data.assignment;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/assignments/${id}`);
}
