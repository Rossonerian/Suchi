export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled'];
export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'];

export function filterSaasTasks(tasks = [], {
  query = '',
  status = 'all',
  priority = 'all',
  projectId = 'all',
  due = 'all',
  overdue = false,
  now = new Date(),
} = {}) {
  const needle = query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (status !== 'all' && task.status !== status) return false;
    if (priority !== 'all' && task.priority !== priority) return false;
    if (projectId !== 'all' && task.projectId !== projectId) return false;
    if (due === 'today' && !isDueToday(task, now)) return false;
    if (overdue && !isOverdue(task, now)) return false;
    if (!needle) return true;
    return [task.title, task.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
  });
}

export function taskFiltersFromQuery(query = {}) {
  const value = (key) => typeof query[key] === 'string' ? query[key] : '';
  return {
    query: value('q'),
    status: value('status') || 'all',
    priority: value('priority') || 'all',
    projectId: value('project') || 'all',
    due: value('due') || 'all',
    overdue: value('overdue') === 'true',
  };
}

export function dateInputToIso(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function taskProgress(tasks = []) {
  const eligible = tasks.filter((task) => task.status !== 'cancelled');
  if (!eligible.length) return null;
  return Math.round((eligible.filter((task) => task.status === 'done').length / eligible.length) * 100);
}

export function isOverdue(task, now = new Date()) {
  return Boolean(task.dueAt && !['done', 'cancelled'].includes(task.status) && new Date(task.dueAt).getTime() < now.getTime());
}

export function isDueToday(task, now = new Date()) {
  if (!task.dueAt || ['done', 'cancelled'].includes(task.status)) return false;
  const due = new Date(task.dueAt);
  return due.getUTCFullYear() === now.getUTCFullYear() && due.getUTCMonth() === now.getUTCMonth() && due.getUTCDate() === now.getUTCDate();
}
