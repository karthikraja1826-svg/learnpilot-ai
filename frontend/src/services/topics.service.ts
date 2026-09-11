import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type { Topic } from '../types/academic';

export interface TopicInput {
  subject: string;
  name: string;
  description?: string;
  difficulty?: number;
  estimatedHours: number;
  currentMastery?: number;
  targetMastery?: number;
  status?: Topic['status'];
}

export async function listTopics(subjectId?: string): Promise<Topic[]> {
  const response = await api.get<ApiSuccess<{ topics: Topic[] }>>('/topics', {
    params: { limit: 100, sortBy: 'name', order: 'asc', ...(subjectId ? { subjectId } : {}) },
  });
  return response.data.data.topics;
}

export async function createTopic(input: TopicInput): Promise<Topic> {
  const response = await api.post<ApiSuccess<{ topic: Topic }>>('/topics', input);
  return response.data.data.topic;
}

export async function updateTopic(id: string, input: Partial<TopicInput>): Promise<Topic> {
  const response = await api.put<ApiSuccess<{ topic: Topic }>>(`/topics/${id}`, input);
  return response.data.data.topic;
}

export async function deleteTopic(id: string): Promise<void> {
  await api.delete(`/topics/${id}`);
}
