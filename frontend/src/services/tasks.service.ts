import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { Task, TaskPriority, TaskStatus } from '../types/academic';

export interface TaskInput {
  title: string;
  description?: string;
  subject?: string | null;
  topic?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface ListTasksParams {
  status?: TaskStatus;
  filter?: 'today' | 'upcoming' | 'overdue';
  sortBy?: 'dueDate' | 'priority' | 'status' | 'title' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}

export async function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  const response = await api.get<ApiSuccess<{ tasks: Task[] }>>('/tasks', {
    params: { limit: 100, sortBy: 'dueDate', order: 'asc', ...params },
  });
  return response.data.data.tasks;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const response = await api.post<ApiSuccess<{ task: Task }>>('/tasks', input);
  return response.data.data.task;
}

export async function updateTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const response = await api.put<ApiSuccess<{ task: Task }>>(`/tasks/${id}`, input);
  return response.data.data.task;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const response = await api.patch<ApiSuccess<{ task: Task }>>(`/tasks/${id}/status`, { status });
  return response.data.data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
