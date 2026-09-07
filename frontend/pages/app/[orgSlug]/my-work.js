import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { isDueToday, isOverdue } from '../../../lib/saas-task-utils.mjs';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function WorkGroup({ title, description, tasks, orgSlug }) {
  return <section aria-labelledby={`my-work-${title.toLowerCase().replace(/\s+/g, '-')}`} className="grid gap-2">
    <div><h2 id={`my-work-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>
    {tasks.length ? <div className="grid gap-2">{tasks.map((task) => <Link key={task.id} href={`/app/${orgSlug}/tasks/${task.id}`} className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{task.title}</span><span className="text-xs capitalize text-muted-foreground">{String(task.status || 'todo').replaceAll('_', ' ')}</span></div><p className="mt-1 text-xs text-muted-foreground">{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleDateString()}` : 'No due date'}</p></Link>)}</div> : <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Nothing in this group.</p>}
  </section>;
}

function MyWorkContent({ orgSlug }) {
  const auth = useAuth();
  const { status } = useClerkPageState(auth);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status) return undefined;
    let active = true;
    async function load() {
      setLoading(true); setError('');
      try {
        const token = await auth.getToken();
        const membersResult = await saasApi.listMembers(token);
        const membership = (membersResult.members || []).find((member) => member.userId === auth.userId);
        if (!membership) { if (active) setTasks([]); return; }
        const result = await saasApi.listTasks({ assigneeMembershipId: membership.id }, token);
        if (active) setTasks(result.tasks || []);
      } catch (err) { if (active) setError(err instanceof ApiError ? err.message : 'Your work is unavailable.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [auth, status]);

  const groups = useMemo(() => {
    const now = new Date();
    return [
      { title: 'Overdue', description: 'Assigned work that needs attention.', tasks: tasks.filter((task) => isOverdue(task, now)) },
      { title: 'Today', description: 'Commitments due today.', tasks: tasks.filter((task) => isDueToday(task, now)) },
      { title: 'Upcoming', description: 'The next assigned deadlines.', tasks: tasks.filter((task) => task.dueAt && new Date(task.dueAt) > now && !isDueToday(task, now) && task.status !== 'done' && task.status !== 'cancelled').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 12) },
      { title: 'Completed', description: 'Recently finished assigned work.', tasks: tasks.filter((task) => task.status === 'done').slice(0, 12) },
    ];
  }, [tasks]);

  return <WorkspaceFrame orgSlug={orgSlug} active="My Work">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="eyebrow">PERSONAL WORK</p><h1 className="text-2xl font-semibold">My Work</h1><p className="muted mt-1">Focus on the tasks assigned to you in this workspace.</p></div>
      <Button asChild variant="outline"><Link href={`/app/${orgSlug}/tasks`}>All tasks</Link></Button>
    </div>
    {status && <p className="muted" role="status">{status}</p>}
    {!status && loading && <p className="muted" role="status" aria-busy="true">Loading your work…</p>}
    {!status && !loading && error && <Card role="alert"><CardHeader><CardTitle>Your work could not load</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card>}
    {!status && !loading && !error && !tasks.length && <Card><CardHeader><CardTitle>No assigned tasks yet</CardTitle><CardDescription>When someone assigns work to you, it will appear here.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={`/app/${orgSlug}/tasks`}>Browse all tasks</Link></Button></CardContent></Card>}
    {!status && !loading && !error && tasks.length > 0 && <div className="grid gap-6">{groups.map((group) => <WorkGroup key={group.title} {...group} orgSlug={orgSlug} />)}</div>}
  </WorkspaceFrame>;
}

export default function MyWorkPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <MyWorkContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}

export { MyWorkContent, WorkGroup };
