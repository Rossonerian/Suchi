import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function ProjectsContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status) return undefined;
    let active = true;
    getToken().then((token) => saasApi.listProjects(token)).then((result) => { if (active) setProjects(result.projects || []); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Projects are unavailable.'); });
    return () => { active = false; };
  }, [getToken, status]);

  async function createProject(event) {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.createProject({ name, description }, token);
      setProjects((current) => [result.project, ...current]); setName(''); setDescription('');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to create the project.'); } finally { setSaving(false); }
  }

  return <WorkspaceFrame orgSlug={orgSlug} active="Projects">
    <div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">Projects</h2><p className="muted">Projects keep goals, milestones, and task work together.</p></div>
    {status && <p className="muted" role="status">{status}</p>}
    {!status && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <section aria-label="Projects" className="grid gap-4 sm:grid-cols-2">
        {projects.length ? projects.map((project) => <Card key={project.id}><CardHeader><CardTitle>{project.name}</CardTitle><CardDescription>{project.status || 'Active'}</CardDescription></CardHeader><CardContent><p className="muted">{project.description || 'No description yet.'}</p>{project.targetDate && <p className="mt-3 text-xs text-muted-foreground">Target {new Date(project.targetDate).toLocaleDateString()}</p>}</CardContent></Card>) : <Card className="sm:col-span-2"><CardHeader><CardTitle>No projects yet</CardTitle><CardDescription>Create your first project to start organizing work.</CardDescription></CardHeader></Card>}
      </section>
      <Card><CardHeader><CardTitle>Create project</CardTitle><CardDescription>Start with a name; milestones and members can follow.</CardDescription></CardHeader><CardContent><form className="grid gap-4" onSubmit={createProject}><div className="grid gap-2"><Label htmlFor="project-name">Name</Label><Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} /></div><div className="grid gap-2"><Label htmlFor="project-description">Description</Label><textarea id="project-description" className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={10000} /></div><Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create project'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form></CardContent></Card>
    </div>}
    <p className="text-sm"><Link className="text-primary underline-offset-4 hover:underline" href={`/app/${orgSlug}/tasks`}>Go to tasks →</Link></p>
  </WorkspaceFrame>;
}

export default function ProjectsPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <ProjectsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
