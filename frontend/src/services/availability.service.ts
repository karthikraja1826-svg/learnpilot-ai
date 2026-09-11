import { api, ApiRequestError } from './api';
import type { ApiSuccess } from '../types/api';
import type { StudyAvailability } from '../types/academic';

export type StudyAvailabilityInput = Partial<StudyAvailability>;

export async function getAvailability(): Promise<StudyAvailability | null> {
  try {
    const response = await api.get<ApiSuccess<{ availability: StudyAvailability }>>('/availability');
    return response.data.data.availability;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createAvailability(input: StudyAvailabilityInput): Promise<StudyAvailability> {
  const response = await api.post<ApiSuccess<{ availability: StudyAvailability }>>('/availability', input);
  return response.data.data.availability;
}

export async function updateAvailability(input: StudyAvailabilityInput): Promise<StudyAvailability> {
  const response = await api.put<ApiSuccess<{ availability: StudyAvailability }>>('/availability', input);
  return response.data.data.availability;
}
