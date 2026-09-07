import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, saasApi } from '../../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../../components/saas/WorkspaceFrame';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { taskProgress } from '../../../../lib/saas-task-utils.mjs';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ProjectContent({ orgSlug, projectId }) {
  const auth = useAuth();
  const { status } = useClerkPageState(auth, orgSlug);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (status) return undefined;
    let active = true;
    setLoading(true); setError('');
    auth.getToken().then((token) => saasApi.getProject(projectId, token)).then((result) => { if (active) setProject(result.project || null); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Project details are unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth, projectId, status]);
  const tasks = useMemo(() => project?.tasks || [], [project?.tasks]);
  const progress = useMemo(() => taskProgress(tasks), [tasks]);
  if (status) return <WorkspaceFrame orgSlug={orgSlug} active="Projects"><p className="muted" role="status">{status}</p></WorkspaceFrame>;
  return <WorkspaceFrame orgSlug={orgSlug} active="Projects"><p className="mb-4 text-sm"><Link href={`/app/${orgSlug}/projects`} className="text-primary underline-offset-4 hover:underline">← Projects</Link></p>{loading && <div aria-busy="true" className="grid gap-4"><div className="h-32 animate-pulse rounded-lg bg-muted" /><div className="h-48 animate-pulse rounded-lg bg-muted" /></div>}{!loading && error && <Card role="alert"><CardHeader><CardTitle>Project could not load</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card>}{!loading && !error && !project && <Card><CardHeader><CardTitle>Project not found</CardTitle><CardDescription>This project may have been archived or you may not have access.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link href={`/app/${orgSlug}/projects`}>Back to projects</Link></Button></CardContent></Card>}{!loading && !error && project && <><header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-start md:justify-between"><div><p className="eyebrow">PROJECT</p><h1 className="text-3xl font-semibold">{project.name}</h1><p className="muted mt-2 max-w-2xl">{project.description || 'No project brief yet.'}</p></div><Button asChild><Link href={`/app/${orgSlug}/tasks?project=${project.id}`}>Open work</Link></Button></header><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>Status</CardDescription><CardTitle className="capitalize">{project.status || 'Active'}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Target date</CardDescription><CardTitle>{project.targetDate ? new Date(project.targetDate).toLocaleDateString() : 'Not set'}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Progress</CardDescription><CardTitle>{progress === null ? 'No tasks yet' : `${progress}%`}</CardTitle></CardHeader></Card></div><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]"><Card><CardHeader><CardTitle>Work</CardTitle><CardDescription>{tasks.length ? `${tasks.length} task${tasks.length === 1 ? '' : 's'} in this project.` : 'Add a task to start moving this project forward.'}</CardDescription></CardHeader><CardContent>{tasks.length ? <ul className="grid gap-2" aria-label="Project tasks">{tasks.map((task) => <li key={task.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3"><Link href={`/app/${orgSlug}/tasks/${task.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">{task.title}</Link><span className="shrink-0 text-xs capitalize text-muted-foreground">{String(task.status || 'todo').replace('_', ' ')}</span></li>)}</ul> : <Button asChild><Link href={`/app/${orgSlug}/tasks?project=${project.id}`}>Create first task</Link></Button>}</CardContent></Card><Card><CardHeader><CardTitle>Milestones</CardTitle><CardDescription>Checkpoints for this project.</CardDescription></CardHeader><CardContent>{project.milestones?.length ? <ul className="grid gap-3">{project.milestones.map((milestone) => <li key={milestone.id}><p className="font-medium">{milestone.name}</p><p className="text-xs text-muted-foreground">{milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString() : 'No target date'}</p></li>)}</ul> : <p className="muted">No milestones yet.</p>}</CardContent></Card></div></>}</WorkspaceFrame>;
}

export default function ProjectDetailPage() {
  const { orgSlug, projectId } = useRouter().query;
  if (!orgSlug || !projectId || Array.isArray(orgSlug) || Array.isArray(projectId)) return <main className="loading-page"><p>Loading project…</p></main>;
  return clerkEnabled ? <ProjectContent orgSlug={orgSlug} projectId={projectId} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
