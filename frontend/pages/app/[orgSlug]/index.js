import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, OrganizationSwitcher } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { ApiError, saasApi } from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function WorkspaceNav({ orgSlug }) {
  const links = [
    ['Home', `/app/${orgSlug}`],
    ['My Work', `/app/${orgSlug}/my-work`],
    ['Projects', `/app/${orgSlug}/projects`],
    ['Tasks', `/app/${orgSlug}/tasks`],
    ['Calendar', `/app/${orgSlug}/calendar`],
    ['Meetings', `/app/${orgSlug}/meetings`],
    ['Team', `/app/${orgSlug}/team`],
    ['AI Assistant', `/app/${orgSlug}/ai`],
    ['Integrations', `/app/${orgSlug}/integrations`],
    ['Settings', `/app/${orgSlug}/settings`],
  ];
  return <nav aria-label="Workspace navigation" className="flex flex-wrap gap-2">{links.map(([label, href]) => <Button key={href} asChild variant={label === 'Home' ? 'secondary' : 'outline'} size="sm"><Link href={href}>{label}</Link></Button>)}</nav>;
}

function ClerkWorkspaceHome({ orgSlug }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState('Loading workspace…');

  useEffect(() => {
    let active = true;
    if (!isLoaded) return undefined;
    if (!isSignedIn) {
      setMessage('Sign in to open this workspace.');
      return undefined;
    }
    getToken().then((token) => saasApi.listProjects(token)).then((result) => {
      if (!active) return;
      setProjects(result.projects || []);
      setMessage('');
    }).catch((error) => {
      if (!active) return;
      setMessage(error instanceof ApiError ? error.message : 'Workspace data is unavailable.');
    });
    return () => { active = false; };
  }, [getToken, isLoaded, isSignedIn]);

  return <WorkspaceFrame orgSlug={orgSlug}>
    {message && <p className="muted" role="status">{message}</p>}
    {!message && <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{projects.length ? projects.map((project) => <Card key={project.id}><CardHeader><CardTitle>{project.name}</CardTitle><CardDescription>{project.status}</CardDescription></CardHeader><CardContent><p className="muted">{project.description || 'No description yet.'}</p></CardContent></Card>) : <Card><CardHeader><CardTitle>Start your first project</CardTitle><CardDescription>Your workspace is ready for a project brief and task list.</CardDescription></CardHeader><CardContent><Button asChild><Link href={`/app/${orgSlug}/projects`}>Create project</Link></Button></CardContent></Card>}</div>}
  </WorkspaceFrame>;
}

function WorkspaceFrame({ orgSlug, children }) {
  return <main className="min-h-screen bg-background p-4 text-foreground md:p-8"><div className="mx-auto max-w-7xl space-y-6"><header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between"><div><p className="eyebrow">WORKSPACE</p><h1 className="text-3xl font-semibold">{orgSlug}</h1></div>{clerkEnabled && <OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/onboarding" />}</header><WorkspaceNav orgSlug={orgSlug} />{children}</div></main>;
}

export default function WorkspaceHome() {
  const router = useRouter();
  const { orgSlug } = router.query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page" aria-busy="true"><p>Loading workspace…</p></main>;
  if (!clerkEnabled) return <WorkspaceFrame orgSlug={orgSlug}><Card><CardHeader><CardTitle>Workspace migration is pending</CardTitle><CardDescription>Enable Clerk to open organization-scoped workspaces.</CardDescription></CardHeader><CardContent><Button asChild><Link href="/">Return to sign in</Link></Button></CardContent></Card></WorkspaceFrame>;
  return <ClerkWorkspaceHome orgSlug={orgSlug} />;
}
