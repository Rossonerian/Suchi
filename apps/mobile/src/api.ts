const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code;
  }
}

export async function apiRequest<T>(path: string, cookie: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(typeof body.error === 'string' ? body.error : 'Request failed.', response.status, body.code);
  return body as T;
}

export type Project = { id: string; name: string; description?: string; status?: string | null };
export type Task = { id: string; title: string; projectId: string; status: string; priority: string; dueAt?: string | null };
export type Meeting = { id: string; title: string; startAt: string; endAt: string; timezone: string; status?: string };
export type MobileNotification = { id: string; title: string; body: string; createdAt?: string | null; readAt?: string | null; organizationId?: string | null; resourceType?: string | null; resourceId?: string | null };

export const mobileApi = {
  projects: (cookie: string) => apiRequest<{ projects: Project[] }>('/v1/projects', cookie),
  tasks: (cookie: string, filters: { projectId?: string; assigneeMembershipId?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.projectId) query.set('projectId', filters.projectId);
    if (filters.assigneeMembershipId) query.set('assigneeMembershipId', filters.assigneeMembershipId);
    const suffix = query.toString();
    return apiRequest<{ tasks: Task[] }>(`/v1/tasks${suffix ? `?${suffix}` : ''}`, cookie);
  },
  task: (cookie: string, id: string) => apiRequest<{ task: Task }>(`/v1/tasks/${encodeURIComponent(id)}`, cookie),
  createTask: (cookie: string, payload: { projectId: string; title: string; priority?: string; dueAt?: string | null }) => apiRequest<{ task: Task }>('/v1/tasks', cookie, { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (cookie: string, id: string, payload: Partial<Pick<Task, 'status' | 'priority'>>) => apiRequest<{ task: Task }>(`/v1/tasks/${encodeURIComponent(id)}`, cookie, { method: 'PATCH', body: JSON.stringify(payload) }),
  meetings: (cookie: string) => apiRequest<{ meetings: Meeting[] }>('/v1/meetings', cookie),
  notifications: (cookie: string) => apiRequest<{ notifications: MobileNotification[] }>('/v1/notifications', cookie),
  markNotificationRead: (cookie: string, id: string) => apiRequest(`/v1/notifications/${encodeURIComponent(id)}/read`, cookie, { method: 'POST' }),
  askAi: (cookie: string, question: string, conversationId?: string) => apiRequest<{ conversationId: string; answer: string; proposals: { operation: string; arguments: Record<string, unknown>; confirmationToken: string }[] }>('/v1/ai/ask', cookie, { method: 'POST', body: JSON.stringify({ question, conversationId }) }),
  confirmAiWrite: (cookie: string, confirmationToken: string) => apiRequest<{ task: Task }>('/v1/ai/confirm', cookie, { method: 'POST', body: JSON.stringify({ token: confirmationToken }) }),
};
