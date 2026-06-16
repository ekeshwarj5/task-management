import type {
  AuthUser,
  CreateTask,
  ListTasksResult,
  Task,
  UpdateTask,
} from '@task/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ValidationIssue {
  path: Array<string | number>;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: { error?: string; message?: string; issues?: ValidationIssue[] },
  ) {
    super(body.message ?? body.error ?? `Request failed with ${statusCode}`);
    this.name = 'ApiError';
  }
}

const buildQuery = (params: object): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};

/**
 * Cookie-bearing fetch. The backend issues an HTTP-only JWT cookie on
 * login; credentials:'include' tells the browser to send it on every
 * subsequent call without us touching localStorage.
 *
 * Only sets Content-Type: application/json when we're actually sending
 * a body. Otherwise Fastify's JSON parser sees the content-type on a
 * body-less request (logout, delete) and rejects with
 * FST_ERR_CTP_EMPTY_JSON_BODY.
 */
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && init.body !== null && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

// Auth ----------------------------------------------------------------------

export interface AuthResponse {
  user: AuthUser;
}

export const signup = (email: string, password: string) =>
  request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const login = (email: string, password: string) =>
  request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const logout = () => request<void>('/auth/logout', { method: 'POST' });

export const fetchMe = () =>
  request<{ user: { sub: string; email: string; role: 'user' | 'admin' } }>('/auth/me');

// Tasks ---------------------------------------------------------------------

export interface ListTasksParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
}

export const listTasks = (params: ListTasksParams = {}) =>
  request<ListTasksResult>(`/tasks${buildQuery(params)}`);

export const getTask = (id: string) => request<Task>(`/tasks/${id}`);

export const createTask = (input: CreateTask) =>
  request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) });

export const updateTask = (id: string, patch: UpdateTask) =>
  request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteTask = (id: string) =>
  request<void>(`/tasks/${id}`, { method: 'DELETE' });
