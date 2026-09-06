const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code;
  }
}

export async function apiRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(typeof body.error === 'string' ? body.error : 'Request failed.', response.status, body.code);
  return body as T;
}

export type Project = { id: string; name: string; description?: string; status?: string | null };
export type Task = { id: string; title: string; projectId: string; status: string; priority: string; dueAt?: string | null };
export type Meeting = { id: string; title: string; startAt: string; endAt: string; timezone: string; status?: string };

export const mobileApi = {
  projects: (token: string) => apiRequest<{ projects: Project[] }>('/v1/projects', token),
  tasks: (token: string) => apiRequest<{ tasks: Task[] }>('/v1/tasks', token),
  meetings: (token: string) => apiRequest<{ meetings: Meeting[] }>('/v1/meetings', token),
  notifications: (token: string) => apiRequest<{ notifications: { id: string; title: string; body: string; readAt?: string | null }[] }>('/v1/notifications', token),
  askAi: (token: string, question: string, conversationId?: string) => apiRequest<{ conversationId: string; answer: string; proposals: { operation: string; arguments: Record<string, unknown>; confirmationToken: string }[] }>('/v1/ai/ask', token, { method: 'POST', body: JSON.stringify({ question, conversationId }) }),
};
