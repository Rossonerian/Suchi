import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../../lib/better-auth-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { TASK_PRIORITIES, TASK_STATUSES, dateInputToIso, filterSaasTasks, isDueToday, isOverdue, taskFiltersFromQuery } from '../../../lib/saas-task-utils.mjs';

const clerkEnabled = true;
const statusLabel = (value) => String(value || 'todo').replaceAll('_', ' ');

function CreateTaskDialog({ projects, onCreated }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false); const [projectId, setProjectId] = useState(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [priority, setPriority] = useState('none'); const [dueAt, setDueAt] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); if (!projectId) { setError('Choose a project before creating a task.'); return; } if (!title.trim()) return;
    setSaving(true); setError('');
    try { const token = await getToken(); const result = await saasApi.createTask({ projectId, title: title.trim(), description, priority, dueAt: dateInputToIso(dueAt) }, token); onCreated(result.task); setProjectId(''); setTitle(''); setDescription(''); setPriority('none'); setDueAt(''); setOpen(false); toast.success('Task created'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to create the task.'); } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button disabled={!projects.length}>Create task</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create task</DialogTitle><DialogDescription>Give the task a clear outcome, then add ownership and detail from its task page.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="saas-create-project">Project</Label><select id="saas-create-project" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)} required><option value="">Choose a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="saas-create-title">Title</Label><Input id="saas-create-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={240} autoFocus /></div><div className="grid gap-2"><Label htmlFor="saas-create-description">Description <span className="text-muted-foreground">(optional)</span></Label><Textarea id="saas-create-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} rows={3} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="saas-create-priority">Priority</Label><select id="saas-create-priority" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>{TASK_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="saas-create-due">Due date <span className="text-muted-foreground">(optional)</span></Label><Input id="saas-create-due" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create task'}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function TaskRow({ task, projectName, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  async function update(event) { const next = event.target.value; setUpdating(true); await onStatusChange(task, next); setUpdating(false); }
  return <article className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_9rem_7rem_8rem] sm:items-center"><div className="min-w-0"><Link href={`/app/${task.organizationSlug || ''}/tasks/${task.id}`} className="font-medium underline-offset-4 hover:underline">{task.title}</Link><p className="mt-1 truncate text-sm text-muted-foreground">{projectName} {task.description ? `· ${task.description}` : ''}</p></div><div className="text-sm capitalize text-muted-foreground"><span className="mr-1 text-xs text-muted-foreground sm:hidden">Priority:</span>{task.priority || 'none'}</div><div className="text-sm text-muted-foreground"><span className="mr-1 text-xs sm:hidden">Due:</span>{task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'No due date'}</div><label className="flex items-center gap-2 text-sm"><span className="text-xs text-muted-foreground sm:sr-only">Status</span><select aria-label={`Status for ${task.title}`} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm capitalize" value={task.status} onChange={update} disabled={updating}>{TASK_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label></article>;
}

function TasksContent({ orgSlug }) {
  const router = useRouter(); const auth = useAuth(); const { getToken } = auth; const { status } = useClerkPageState(auth, orgSlug);
  const initialFilters = taskFiltersFromQuery(router.query);
  const [tasks, setTasks] = useState([]); const [projects, setProjects] = useState([]); const [query, setQuery] = useState(initialFilters.query); const [statusFilter, setStatusFilter] = useState(initialFilters.status); const [priorityFilter, setPriorityFilter] = useState(initialFilters.priority); const [projectFilter, setProjectFilter] = useState(initialFilters.projectId); const [dueFilter, setDueFilter] = useState(initialFilters.due); const [overdueFilter, setOverdueFilter] = useState(initialFilters.overdue); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const token = await getToken(); const [projectResult, taskResult] = await Promise.all([saasApi.listProjects(token), saasApi.listTasks({}, token)]); setProjects(projectResult.projects || []); setTasks(taskResult.tasks || []); } catch (err) { setError(err instanceof ApiError ? err.message : 'Tasks are unavailable.'); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { if (!status) load(); }, [load, status]);
  useEffect(() => {
    const next = taskFiltersFromQuery({
      q: router.query.q,
      status: router.query.status,
      priority: router.query.priority,
      project: router.query.project,
      due: router.query.due,
      overdue: router.query.overdue,
    });
    setQuery(next.query); setStatusFilter(next.status); setPriorityFilter(next.priority); setProjectFilter(next.projectId); setDueFilter(next.due); setOverdueFilter(next.overdue);
  }, [router.query.due, router.query.overdue, router.query.priority, router.query.project, router.query.q, router.query.status]);
  const visibleTasks = filterSaasTasks(tasks, { query, status: statusFilter, priority: priorityFilter, projectId: projectFilter, due: dueFilter, overdue: overdueFilter });
  function updateFilters(changes) {
    const defaults = { q: '', status: 'all', priority: 'all', project: 'all', due: 'all', overdue: false };
    const setters = { q: setQuery, status: setStatusFilter, priority: setPriorityFilter, project: setProjectFilter, due: setDueFilter, overdue: setOverdueFilter };
    Object.entries(changes).forEach(([name, next]) => setters[name](next));
    const queryParams = { ...router.query };
    Object.entries(changes).forEach(([name, next]) => {
      if (next === defaults[name]) delete queryParams[name];
      else queryParams[name] = String(next);
    });
    router.replace({ pathname: router.pathname, query: queryParams }, undefined, { shallow: true });
  }
  function updateFilter(name, next) { updateFilters({ [name]: next }); }
  function clearFilters() {
    setQuery(''); setStatusFilter('all'); setPriorityFilter('all'); setProjectFilter('all'); setDueFilter('all'); setOverdueFilter(false);
    const queryParams = { ...router.query };
    ['q', 'status', 'priority', 'project', 'due', 'overdue'].forEach((name) => delete queryParams[name]);
    router.replace({ pathname: router.pathname, query: queryParams }, undefined, { shallow: true });
  }
  async function changeStatus(task, nextStatus) { const previous = tasks; setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item)); try { const token = await getToken(); const result = await saasApi.updateTask(task.id, { status: nextStatus }, token); if (result.task) setTasks((current) => current.map((item) => item.id === task.id ? result.task : item)); toast.success('Task status updated'); } catch (err) { setTasks(previous); toast.error(err instanceof ApiError ? err.message : 'Unable to update task.'); } }
  return <WorkspaceFrame orgSlug={orgSlug} active="Tasks"><header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">WORK</p><h1 className="text-2xl font-semibold">Tasks</h1><p className="muted mt-1">A focused view of work across this workspace.</p></div>{!status && <CreateTaskDialog projects={projects} onCreated={(task) => setTasks((current) => [task, ...current])} />}</header>{status && <p className="muted" role="status">{status}</p>}{!status && loading && <div className="grid gap-3" aria-busy="true"><div className="h-20 animate-pulse rounded-lg bg-muted" /><div className="h-20 animate-pulse rounded-lg bg-muted" /></div>}{!status && !loading && error && <Card role="alert"><CardHeader><CardTitle>Tasks could not load</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={load}>Retry</Button></CardContent></Card>}{!status && !loading && !error && projects.length === 0 && <Card><CardHeader><CardTitle>Create a project first</CardTitle><CardDescription>Tasks belong to a project so ownership and progress stay meaningful.</CardDescription></CardHeader><CardContent><Button asChild><Link href={`/app/${orgSlug}/projects`}>Create project</Link></Button></CardContent></Card>}{!status && !loading && !error && projects.length > 0 && <><div className="grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[minmax(12rem,1fr)_10rem_10rem_12rem_10rem]" aria-label="Task filters"><div><Label htmlFor="task-search" className="sr-only">Search tasks</Label><Input id="task-search" type="search" value={query} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Search tasks…" /></div><div><Label htmlFor="task-status-filter" className="sr-only">Filter by status</Label><select id="task-status-filter" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={statusFilter} onChange={(event) => updateFilter('status', event.target.value)}><option value="all">All statuses</option>{TASK_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></div><div><Label htmlFor="task-priority-filter" className="sr-only">Filter by priority</Label><select id="task-priority-filter" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={priorityFilter} onChange={(event) => updateFilter('priority', event.target.value)}><option value="all">All priorities</option>{TASK_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div><Label htmlFor="task-project-filter" className="sr-only">Filter by project</Label><select id="task-project-filter" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={projectFilter} onChange={(event) => updateFilter('project', event.target.value)}><option value="all">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div><Label htmlFor="task-due-filter" className="sr-only">Filter by deadline</Label><select id="task-due-filter" className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={overdueFilter ? 'overdue' : dueFilter} onChange={(event) => { const value = event.target.value; updateFilters(value === 'overdue' ? { due: 'all', overdue: true } : { due: value, overdue: false }); }}><option value="all">All deadlines</option><option value="today">Due today</option><option value="overdue">Overdue</option></select></div></div><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{visibleTasks.length} result{visibleTasks.length === 1 ? '' : 's'}</span>{(query || statusFilter !== 'all' || priorityFilter !== 'all' || projectFilter !== 'all' || dueFilter !== 'all' || overdueFilter) && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}</div>{visibleTasks.length ? <section className="grid gap-2" aria-label="Task list">{visibleTasks.map((task) => <TaskRow key={task.id} task={{ ...task, organizationSlug: orgSlug }} projectName={projectById.get(task.projectId) || 'Project'} onStatusChange={changeStatus} />)}</section> : <Card><CardHeader><CardTitle>{tasks.length ? 'No tasks match these filters' : 'No tasks yet'}</CardTitle><CardDescription>{tasks.length ? 'Try clearing one or more filters.' : 'Create the first task for a project to make progress visible.'}</CardDescription></CardHeader><CardContent>{tasks.length ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : <CreateTaskDialog projects={projects} onCreated={(task) => setTasks((current) => [task, ...current])} />}</CardContent></Card>}</>}</WorkspaceFrame>;
}

export default function TasksPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <TasksContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}

export { TaskRow, isOverdue, isDueToday };
