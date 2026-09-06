import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const statuses = ['backlog', 'todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled'];
const priorities = ['none', 'low', 'medium', 'high', 'urgent'];

function TasksContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('none');
  const [dueAt, setDueAt] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  useEffect(() => {
    if (status) return undefined;
    let active = true;
    getToken().then(async (token) => {
      const [projectResult, taskResult] = await Promise.all([saasApi.listProjects(token), saasApi.listTasks({}, token)]);
      if (!active) return;
      setProjects(projectResult.projects || []); setTasks(taskResult.tasks || []);
      if (!projectId && projectResult.projects?.[0]) setProjectId(projectResult.projects[0].id);
    }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Tasks are unavailable.'); });
    return () => { active = false; };
  }, [getToken, projectId, status]);

  async function createTask(event) {
    event.preventDefault();
    if (!projectId) { setError('Create a project before adding a task.'); return; }
    setSaving(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.createTask({ projectId, title, priority, dueAt: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : null }, token);
      setTasks((current) => [result.task, ...current]); setTitle(''); setDueAt(''); toast.success('Task created');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to create the task.'); } finally { setSaving(false); }
  }

  async function changeStatus(task, nextStatus) {
    const previous = tasks;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
    try { const token = await getToken(); await saasApi.updateTask(task.id, { status: nextStatus }, token); toast.success('Task status updated'); }
    catch (err) { setTasks(previous); toast.error(err instanceof ApiError ? err.message : 'Unable to update task.'); }
  }

  return <WorkspaceFrame orgSlug={orgSlug} active="Tasks">
    <div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">Tasks</h2><p className="muted">Create, assign, and move work through a shared lifecycle.</p></div>
    {status && <p className="muted" role="status">{status}</p>}
    {!status && (projects.length === 0 ? <Card><CardHeader><CardTitle>Create a project first</CardTitle><CardDescription>Tasks belong to a project so deadlines and progress stay meaningful.</CardDescription></CardHeader><CardContent><Button asChild><Link href={`/app/${orgSlug}/projects`}>Create project</Link></Button></CardContent></Card> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <section aria-label="Task list" className="grid gap-3">
        {tasks.length ? tasks.map((task) => <Card key={task.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-medium">{task.title}</p><p className="text-sm text-muted-foreground">{projectById.get(task.projectId) || 'Project'} · {task.priority || 'none'}{task.dueAt ? ` · due ${new Date(task.dueAt).toLocaleDateString()}` : ''}</p></div><label className="flex items-center gap-2 text-sm"><span className="sr-only">Status for {task.title}</span><select aria-label={`Status for ${task.title}`} className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={task.status} onChange={(event) => changeStatus(task, event.target.value)}>{statuses.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></label></CardContent></Card>) : <Card><CardHeader><CardTitle>No tasks yet</CardTitle><CardDescription>Add the first task for this project or invite a teammate to collaborate.</CardDescription></CardHeader></Card>}
      </section>
      <Card><CardHeader><CardTitle>Create task</CardTitle><CardDescription>Start with a clear outcome and optional deadline.</CardDescription></CardHeader><CardContent><form className="grid gap-4" onSubmit={createTask}><div className="grid gap-2"><Label htmlFor="task-project">Project</Label><select id="task-project" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)} required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="task-title">Title</Label><Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={240} /></div><div className="grid gap-2"><Label htmlFor="task-priority">Priority</Label><select id="task-priority" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="task-due">Due date</Label><Input id="task-due" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create task'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form></CardContent></Card>
    </div>)}
  </WorkspaceFrame>;
}

export default function TasksPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <TasksContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
