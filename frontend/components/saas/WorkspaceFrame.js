import Link from 'next/link';
import { OrganizationSwitcher } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { Bell, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ApiError, saasApi } from '../../lib/api';

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
        {clerkEnabled && <div className="flex items-center gap-2"><WorkspaceSearch orgSlug={orgSlug} /><NotificationCenter /><OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/onboarding" /></div>}
      </header>
      <nav aria-label="Workspace navigation" className="flex flex-wrap gap-2">
        {links.map(([label, path]) => <Button key={label} asChild variant={active === label ? 'secondary' : 'outline'} size="sm"><Link href={`/app/${orgSlug}${path ? `/${path}` : ''}`}>{label}</Link></Button>)}
      </nav>
      {children}
    </div>
  </main>;
}

function NotificationCenter() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unread = notifications.filter((item) => !item.readAt).length;
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    getToken().then((token) => saasApi.listNotifications({}, token)).then((result) => { if (active) setNotifications(result.notifications || []); }).catch(() => undefined);
    return () => { active = false; };
  }, [getToken, open]);
  async function markRead(notification) {
    try { const token = await getToken(); await saasApi.markNotificationRead(notification.id, token); setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)); } catch (error) { if (error instanceof ApiError) return; }
  }
  return <><div aria-live="polite" aria-atomic="true" className="sr-only">{unread ? `${unread} unread notifications` : 'No unread notifications'}</div><DropdownMenu open={open} onOpenChange={setOpen}><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative"><Bell aria-hidden="true" />{unread ? <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread > 9 ? '9+' : unread}</span> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator />{notifications.length ? notifications.slice(0, 10).map((notification) => <DropdownMenuItem key={notification.id} className="items-start gap-2" onSelect={() => markRead(notification)}><span className={notification.readAt ? 'text-sm' : 'text-sm font-semibold'}>{notification.title}<span className="block text-xs font-normal text-muted-foreground">{notification.body}</span></span></DropdownMenuItem>) : <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></>;
}

function WorkspaceSearch({ orgSlug }) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return undefined; }
    let active = true;
    const timer = setTimeout(() => getToken().then((token) => saasApi.searchWorkspace(query.trim(), token)).then((result) => { if (active) setResults(result); }).catch(() => { if (active) setResults(null); }), 220);
    return () => { active = false; clearTimeout(timer); };
  }, [getToken, query]);
  const all = results ? [...(results.projects || []).map((item) => ({ ...item, type: 'Project' })), ...(results.tasks || []).map((item) => ({ ...item, type: 'Task' })), ...(results.meetings || []).map((item) => ({ ...item, type: 'Meeting' }))].slice(0, 8) : [];
  return <div className="relative hidden w-52 lg:block"><label htmlFor="workspace-search" className="sr-only">Search workspace</label><div className="flex items-center gap-2 rounded-md border border-input bg-background px-2"><Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" /><input id="workspace-search" className="h-8 min-h-0 border-0 bg-transparent px-0 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" /></div>{results && <div className="absolute right-0 top-10 z-20 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">{all.length ? all.map((item) => <Link key={`${item.type}-${item.id}`} href={`/app/${orgSlug}/${item.type === 'Project' ? `projects/${item.id}` : item.type === 'Task' ? `tasks?task=${item.id}` : `meetings?meeting=${item.id}`}`} className="block rounded px-2 py-1.5 text-sm hover:bg-muted"><span className="mr-2 text-xs text-muted-foreground">{item.type}</span>{item.name || item.title}</Link>) : <p className="p-2 text-sm text-muted-foreground">No matches.</p>}</div>}</div>;
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
