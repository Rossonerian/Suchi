import Link from 'next/link';
import { OrganizationSwitcher } from '@clerk/nextjs';
import { Button } from '../ui/button';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const links = [
  ['Home', ''],
  ['My Work', 'my-work'],
  ['Projects', 'projects'],
  ['Tasks', 'tasks'],
  ['Calendar', 'calendar'],
  ['Meetings', 'meetings'],
  ['Team', 'team'],
  ['AI Assistant', 'ai'],
  ['Integrations', 'integrations'],
  ['Settings', 'settings'],
];

export function WorkspaceFrame({ orgSlug, children, active }) {
  return <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
        <div><p className="eyebrow">WORKSPACE</p><h1 className="text-3xl font-semibold">{orgSlug}</h1></div>
        {clerkEnabled && <OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/onboarding" />}
      </header>
      <nav aria-label="Workspace navigation" className="flex flex-wrap gap-2">
        {links.map(([label, path]) => <Button key={label} asChild variant={active === label ? 'secondary' : 'outline'} size="sm"><Link href={`/app/${orgSlug}${path ? `/${path}` : ''}`}>{label}</Link></Button>)}
      </nav>
      {children}
    </div>
  </main>;
}

export function FeatureDisabled({ orgSlug }) {
  return <WorkspaceFrame orgSlug={orgSlug}>
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-xl font-semibold">Workspace migration is pending</h2>
      <p className="muted mt-2">Enable Clerk and the SaaS API to use this organization-scoped workflow.</p>
      <Button asChild className="mt-4"><Link href="/dashboard">Open legacy board</Link></Button>
    </div>
  </WorkspaceFrame>;
}

export function useClerkPageState(auth) {
  if (!auth.isLoaded) return { status: 'Loading your session…' };
  if (!auth.isSignedIn) return { status: 'Sign in to open this workspace.' };
  return { status: '' };
}
