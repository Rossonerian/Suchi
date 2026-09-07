import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../../components/saas/WorkspaceFrame';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { TASK_PRIORITIES, TASK_STATUSES, dateInputToIso } from '../../../../lib/saas-task-utils.mjs';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function taskDate(value) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }

function TaskContent({ orgSlug, taskId }) {
  const auth = useAuth();
  const { status } = useClerkPageState(auth);
  const [task, setTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'none', dueAt: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (status) return undefined;
    let active = true;
    setLoading(true); setError('');
    auth.getToken().then(async (token) => {
      const [taskResult, projectResult] = await Promise.all([saasApi.getTask(taskId, token), saasApi.listProjects(token)]);
      if (!active) return;
      const next = taskResult.task;
      setTask(next); setProjects(projectResult.projects || []); setForm({ title: next.title || '', description: next.description || '', status: next.status || 'todo', priority: next.priority || 'none', dueAt: taskDate(next.dueAt) });
    }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Task details are unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth, status, taskId]);
  function change(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function save(event) {
    event.preventDefault();
    if (!form.title.trim()) { setError('Give this task a title.'); return; }
    setSaving(true); setError('');
    try { const token = await auth.getToken(); const result = await saasApi.updateTask(taskId, { title: form.title.trim(), description: form.description, status: form.status, priority: form.priority, dueAt: dateInputToIso(form.dueAt) }, token); setTask(result.task || { ...task, ...form }); toast.success('Task saved'); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to save this task.'); }
    finally { setSaving(false); }
  }
  if (status) return <WorkspaceFrame orgSlug={orgSlug} active="Tasks"><p className="muted" role="status">{status}</p></WorkspaceFrame>;
  return <WorkspaceFrame orgSlug={orgSlug} active="Tasks"><p className="mb-4 text-sm"><Link href={`/app/${orgSlug}/tasks`} className="text-primary underline-offset-4 hover:underline">← Tasks</Link></p>{loading && <Card aria-busy="true"><CardHeader><CardTitle>Loading task…</CardTitle></CardHeader></Card>}{!loading && error && !task && <Card role="alert"><CardHeader><CardTitle>Task could not load</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card>}{!loading && task && <Card><CardHeader><CardTitle>Edit task</CardTitle><CardDescription>{projects.find((project) => project.id === task.projectId)?.name || 'Project'} · {task.id}</CardDescription></CardHeader><CardContent><form className="grid gap-5" onSubmit={save}><div className="grid gap-2"><Label htmlFor="saas-task-title">Title</Label><Input id="saas-task-title" value={form.title} onChange={(event) => change('title', event.target.value)} maxLength={240} required autoFocus /></div><div className="grid gap-2"><Label htmlFor="saas-task-description">Description</Label><Textarea id="saas-task-description" value={form.description} onChange={(event) => change('description', event.target.value)} maxLength={20000} rows={6} /></div><div className="grid gap-4 sm:grid-cols-3"><div className="grid gap-2"><Label htmlFor="saas-task-status">Status</Label><select id="saas-task-status" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.status} onChange={(event) => change('status', event.target.value)}>{TASK_STATUSES.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="saas-task-priority">Priority</Label><select id="saas-task-priority" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.priority} onChange={(event) => change('priority', event.target.value)}>{TASK_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="saas-task-due">Due date</Label><Input id="saas-task-due" type="date" value={form.dueAt} onChange={(event) => change('dueAt', event.target.value)} /></div></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button><Button type="button" variant="outline" asChild><Link href={`/app/${orgSlug}/tasks`}>Cancel</Link></Button></div></form></CardContent></Card>}</WorkspaceFrame>;
}

export default function TaskDetailPage() {
  const { orgSlug, taskId } = useRouter().query;
  if (!orgSlug || !taskId || Array.isArray(orgSlug) || Array.isArray(taskId)) return <main className="loading-page"><p>Loading task…</p></main>;
  return clerkEnabled ? <TaskContent orgSlug={orgSlug} taskId={taskId} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
