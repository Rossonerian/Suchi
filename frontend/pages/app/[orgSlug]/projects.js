import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { taskProgress } from '../../../lib/saas-task-utils.mjs';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function formatDate(value) {
  if (!value) return 'No target date';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ProjectRow({ project }) {
  const progress = taskProgress(project.tasks || []);
  return <Link href={`/app/${project.organizationSlug}/projects/${project.id}`} className="group block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-project-id={project.id}>
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-medium group-hover:underline">{project.name}</h3><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description || 'No project brief yet.'}</p></div><span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs capitalize text-muted-foreground">{project.status || 'active'}</span></div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-3"><span>Owner: {project.owner?.displayName || project.ownerName || 'Workspace'}</span><span>Target: {formatDate(project.targetDate)}</span><span>{progress === null ? 'No tasks yet' : `${progress}% complete`}</span></div>
  </Link>;
}

function CreateProjectDialog({ onCreated }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.createProject({ name: name.trim(), description, targetDate: targetDate ? new Date(`${targetDate}T23:59:59`).toISOString() : null }, token);
      onCreated(result.project);
      setName(''); setDescription(''); setTargetDate(''); setOpen(false);
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to create the project.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button>Create project</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create project</DialogTitle><DialogDescription>Start with an outcome and an optional target date. You can add work and members next.</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="project-name">Name</Label><Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} autoFocus /></div><div className="grid gap-2"><Label htmlFor="project-description">Objective</Label><Textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} placeholder="What outcome should this project deliver?" /></div><div className="grid gap-2"><Label htmlFor="project-target-date">Target date <span className="text-muted-foreground">(optional)</span></Label><Input id="project-target-date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create project'}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function ProjectsContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth, orgSlug);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true); setError('');
    try { const token = await getToken(); const result = await saasApi.listProjects(token); setProjects(result.projects || []); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Projects are unavailable.'); }
    finally { setLoading(false); }
  }, [getToken]);
  useEffect(() => { if (!status) loadProjects(); }, [loadProjects, status]);
  const filtered = projects.filter((project) => !query.trim() || `${project.name} ${project.description || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <WorkspaceFrame orgSlug={orgSlug} active="Projects"><div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">WORKSPACE</p><h2 className="text-2xl font-semibold">Projects</h2><p className="muted mt-1">Keep outcomes, owners, and the work behind them together.</p></div>{!status && <CreateProjectDialog onCreated={(project) => setProjects((current) => [project, ...current])} />}</div>{status && <p className="muted" role="status">{status}</p>}{!status && loading && <div className="grid gap-3" aria-busy="true"><div className="h-24 animate-pulse rounded-lg bg-muted" /><div className="h-24 animate-pulse rounded-lg bg-muted" /></div>}{!status && !loading && error && <Card role="alert"><CardHeader><CardTitle>Projects could not load</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={loadProjects}>Retry</Button></CardContent></Card>}{!status && !loading && !error && <><div className="mb-4 max-w-sm"><Label htmlFor="project-search" className="sr-only">Search projects</Label><Input id="project-search" type="search" placeholder="Search projects…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>{filtered.length ? <section aria-label="Projects" className="grid gap-3">{filtered.map((project) => <ProjectRow key={project.id} project={{ ...project, organizationSlug: orgSlug }} />)}</section> : <Card><CardHeader><CardTitle>{query ? 'No projects match' : 'Start your first project'}</CardTitle><CardDescription>{query ? 'Try a different search or clear the filter.' : 'Define a shared outcome before adding tasks.'}</CardDescription></CardHeader><CardContent>{query ? <Button variant="outline" onClick={() => setQuery('')}>Clear search</Button> : <CreateProjectDialog onCreated={(project) => setProjects((current) => [project, ...current])} />}</CardContent></Card>}</>}</WorkspaceFrame>;
}

export default function ProjectsPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <ProjectsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
