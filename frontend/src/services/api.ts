import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../config/env';
import { firebaseAuth } from '../config/firebase';

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

// No default Content-Type header is set here on purpose. Axios already sets
// 'application/json' automatically for plain-object request bodies, and
// leaving no Content-Type default means a FormData body (e.g. the profile
// photo upload) is never forced into JSON — the browser generates the
// correct 'multipart/form-data; boundary=...' header itself.
export const api = axios.create({
  baseURL: env.apiBaseUrl,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const currentUser = firebaseAuth.currentUser;

  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: unknown }>) => {
    const status = error.response?.status ?? 0;
    const message = error.response?.data?.message ?? error.message ?? 'Something went wrong. Please try again.';
    const code = error.code;

    return Promise.reject(new ApiRequestError(message, status, code));
  }
);
