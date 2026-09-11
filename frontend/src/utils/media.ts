import { env } from '../config/env';

const API_ORIGIN = env.apiBaseUrl.replace(/\/api\/?$/, '');

/**
 * Resolves a media path returned by the backend (e.g. a locally stored
 * profile photo at "/uploads/profile-photos/xyz.jpg") into an absolute URL.
 * Absolute URLs (e.g. a Google account picture) are returned unchanged.
 */
export function resolveMediaUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`;
}
