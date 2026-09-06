// Single responsibility: one fetch wrapper the whole app calls through,
// so the API base URL and error handling live in exactly one place.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}, accessToken = '') {
  let res;
  try {
    const { headers = {}, ...requestOptions } = options;
    res = await fetch(`${API_URL}/api${path}`, {
      ...requestOptions,
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...headers },
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Cannot reach the mission board. Check your connection and try again.', 0, 'NETWORK_ERROR');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = data.error;
    const message = typeof error === 'string'
      ? error
      : error?.message || data.message || `Request failed (${res.status})`;
    const code = data.code || (typeof error === 'object' ? error?.code : undefined);
    throw new ApiError(message, res.status, code);
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getCurrentMember: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getInvite: async (token) => {
    const data = await request(`/auth/invite/${encodeURIComponent(token)}`);
    return data.invitation || data.invite || data;
  },
  claimInvite: (token, password) => request('/auth/claim-invite', { method: 'POST', body: JSON.stringify({ token, password }) }),
  getTeams: () => request('/teams'),
  getTasks: (teamId) => request(`/tasks${teamId ? `?team=${teamId}` : ''}`),
  createTask: (payload) => request('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  seedModules: () => request('/tasks/seed-modules', { method: 'POST' }),
  updateTask: (id, payload) =>
    request(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getMission: () => request('/mission'),
  getMembers: () => request('/members'),
  updateMember: (id, payload) =>
    request(`/members/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  getTasksForMember: (memberId) => request(`/tasks?assignee=${memberId}`),
  getMeetings: () => request('/meetings'),
  createMeeting: (payload) => request('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  retryMeeting: (id) => request(`/meetings/${id}/notifications/retry`, { method: 'POST' }),
  getPlans: () => request('/plans'),
  getPlanPhases: () => request('/plans/phases'),
  createPlan: (payload) => request('/plans', { method: 'POST', body: JSON.stringify(payload) }),
  deletePlan: (id) => request(`/plans/${id}`, { method: 'DELETE' }),
  getAdminMembers: () => request('/admin/members'),
  createInvite: (payload) => request('/admin/invites', { method: 'POST', body: JSON.stringify(payload) }),
  resetMemberAccess: (id, payload = {}) => request(`/admin/members/${encodeURIComponent(id)}/reset-access`, { method: 'POST', body: JSON.stringify(payload) }),
  updateMember: (id, payload) => request(`/admin/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  revokeMemberSessions: (id) => request(`/admin/members/${encodeURIComponent(id)}/revoke-sessions`, { method: 'POST' }),
};

export const saasApi = {
  listOrganizations: (accessToken) => request('/v1/organizations', {}, accessToken),
  createOrganization: (payload, accessToken) => request('/v1/organizations', { method: 'POST', body: JSON.stringify(payload) }, accessToken),
  listProjects: (accessToken) => request('/v1/projects', {}, accessToken),
  getProject: (id, accessToken) => request(`/v1/projects/${encodeURIComponent(id)}`, {}, accessToken),
  createProject: (payload, accessToken) => request('/v1/projects', { method: 'POST', body: JSON.stringify(payload) }, accessToken),
  listTasks: (filters = {}, accessToken) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
    return request(`/v1/tasks${query ? `?${query}` : ''}`, {}, accessToken);
  },
  getTask: (id, accessToken) => request(`/v1/tasks/${encodeURIComponent(id)}`, {}, accessToken),
  createTask: (payload, accessToken) => request('/v1/tasks', { method: 'POST', body: JSON.stringify(payload) }, accessToken),
  updateTask: (id, payload, accessToken) => request(`/v1/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }, accessToken),
  deleteTask: (id, accessToken) => request(`/v1/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }, accessToken),
  listMeetings: (filters = {}, accessToken) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
    return request(`/v1/meetings${query ? `?${query}` : ''}`, {}, accessToken);
  },
  createMeeting: (payload, accessToken) => request('/v1/meetings', { method: 'POST', body: JSON.stringify(payload) }, accessToken),
  updateMeeting: (id, payload, accessToken) => request(`/v1/meetings/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }, accessToken),
  cancelMeeting: (id, accessToken) => request(`/v1/meetings/${encodeURIComponent(id)}/cancel`, { method: 'POST' }, accessToken),
  askAi: (payload, accessToken) => request('/v1/ai/ask', { method: 'POST', body: JSON.stringify(payload) }, accessToken),
  confirmAiWrite: (token, accessToken) => request('/v1/ai/confirm', { method: 'POST', body: JSON.stringify({ token }) }, accessToken),
  startGoogleCalendar: (accessToken) => request('/v1/integrations/google/calendar/start', {}, accessToken),
  googleCalendarStatus: (accessToken) => request('/v1/integrations/google/calendar/status', {}, accessToken),
};
