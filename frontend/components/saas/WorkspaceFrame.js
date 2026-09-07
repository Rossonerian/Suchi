import Link from 'next/link';
import { OrganizationSwitcher, useOrganization, useOrganizationList } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { Bell, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { ApiError, saasApi } from '../../lib/api';
import { workspaceContextState } from '../../lib/workspace-context.mjs';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk'
  && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const primaryLinks = [
  ['Home', ''],
  ['My Work', 'my-work'],
  ['Inbox', 'notifications'],
  ['Projects', 'projects'],
  ['Calendar', 'calendar'],
  ['AI Assistant', 'ai'],
];

const workLinks = [
  ['Tasks', 'tasks'],
  ['Meetings', 'meetings'],
  ['Team', 'team'],
];

const settingsLinks = [
  ['Integrations', 'integrations'],
  ['Billing', 'billing'],
  ['Settings', 'settings'],
];

export function WorkspaceFrame({ orgSlug, children, active }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const wasOpen = useRef(false);
  const current = active || 'Home';

  useEffect(() => {
    if (wasOpen.current && !mobileOpen) document.getElementById('workspace-navigation-trigger')?.focus();
    wasOpen.current = mobileOpen;
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return <div className="workspace-shell">
    <aside className="workspace-sidebar" aria-label="Workspace navigation">
      <WorkspaceBrand orgSlug={orgSlug} />
      <WorkspaceNavigation orgSlug={orgSlug} active={current} />
      <div className="workspace-sidebar-footer"><span className="muted">Team workspace</span></div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar">
        <div className="workspace-topbar-context">
          <Button id="workspace-navigation-trigger" type="button" className="workspace-mobile-trigger" variant="outline" size="icon" aria-label="Open workspace navigation" onClick={() => setMobileOpen(true)}><Menu aria-hidden="true" /></Button>
          <div><p className="eyebrow">WORKSPACE</p><h1>{orgSlug || 'Workspace'}</h1></div>
        </div>
        {clerkEnabled && <div className="workspace-topbar-actions"><WorkspaceSearch orgSlug={orgSlug} /><NotificationCenter /><OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/onboarding" /></div>}
      </header>
      <main className="workspace-content">{clerkEnabled ? <WorkspaceGate orgSlug={orgSlug}>{children}</WorkspaceGate> : children}</main>
    </div>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="workspace-mobile-sheet">
        <SheetHeader><SheetTitle>{orgSlug || 'Workspace'}</SheetTitle><SheetDescription>Workspace navigation</SheetDescription></SheetHeader>
        <WorkspaceNavigation orgSlug={orgSlug} active={current} onNavigate={closeMobile} />
        {clerkEnabled && <div className="workspace-mobile-switcher"><OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/onboarding" /></div>}
      </SheetContent>
    </Sheet>
  </div>;
}

/**
 * Do not mount workspace data consumers until Clerk has activated the
 * organization represented by the URL. Without this gate a fast navigation
 * from /app/acme to /app/beta can issue the first request with Acme's token
 * and briefly render the wrong tenant's data under Beta's heading.
 */
function WorkspaceGate({ orgSlug, children }) {
  const { organization } = useOrganization();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { pageSize: 50 } });
  const state = workspaceContextState({
    isLoaded,
    organization,
    memberships: userMemberships?.data || [],
    orgSlug,
  });
  const [switchError, setSwitchError] = useState('');

  useEffect(() => {
    setSwitchError('');
    if (!state.membership || !organization || organization.id === state.membership.organization.id) return undefined;

    let active = true;
    Promise.resolve(setActive?.({ organization: state.membership.organization.id }))
      .catch(() => {
        if (active) setSwitchError('This workspace could not be activated. Try switching organizations again.');
      });
    return () => { active = false; };
  }, [organization, setActive, state.membership]);

  if (switchError) return <p className="muted" role="alert">{switchError}</p>;
  if (!state.ready) return <p className="muted" role="status" aria-busy="true">{state.status}</p>;
  return children;
}

function WorkspaceBrand({ orgSlug }) {
  return <div className="workspace-brand"><span className="workspace-brand-mark" aria-hidden="true">A</span><div><p className="eyebrow">ASTRA WORKSPACE</p><strong>{orgSlug || 'Workspace'}</strong></div></div>;
}

function WorkspaceNavigation({ orgSlug, active, onNavigate }) {
  const renderLinks = (items) => items.map(([label, path]) => {
    const selected = active === label || (label === 'Inbox' && active === 'Notifications');
    return <Link key={label} href={`/app/${orgSlug}${path ? `/${path}` : ''}`} className="workspace-nav-link" aria-label={label} aria-current={selected ? 'page' : undefined} onClick={onNavigate}>
      <span>{label}</span>
    </Link>;
  });

  return <nav className="workspace-navigation" aria-label="Workspace navigation">
    <div className="workspace-nav-group">{renderLinks(primaryLinks)}</div>
    <div className="workspace-nav-section"><p>WORK</p>{renderLinks(workLinks)}</div>
    <div className="workspace-nav-section"><p>SETTINGS</p>{renderLinks(settingsLinks)}</div>
  </nav>;
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
  return <div className="workspace-search relative hidden w-52 lg:block"><label htmlFor="workspace-search" className="sr-only">Search workspace</label><div className="flex items-center gap-2 rounded-md border border-input bg-background px-2"><Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" /><input id="workspace-search" className="h-8 min-h-0 border-0 bg-transparent px-0 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" /></div>{results && <div className="absolute right-0 top-10 z-20 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">{all.length ? all.map((item) => <Link key={`${item.type}-${item.id}`} href={`/app/${orgSlug}/${item.type === 'Project' ? `projects/${item.id}` : item.type === 'Task' ? `tasks/${item.id}` : `meetings?meeting=${item.id}`}`} className="block rounded px-2 py-1.5 text-sm hover:bg-muted"><span className="mr-2 text-xs text-muted-foreground">{item.type}</span>{item.name || item.title}</Link>) : <p className="p-2 text-sm text-muted-foreground">No matches.</p>}</div>}</div>;
}

export function FeatureDisabled({ orgSlug }) {
  return <WorkspaceFrame orgSlug={orgSlug}>
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
      <h2 className="text-xl font-semibold">Workspace access is unavailable</h2>
      <p className="muted mt-2">This local environment is not connected to the organization service. Sign in with a configured workspace account to continue.</p>
      <Button asChild className="mt-4"><Link href="/">Return to sign in</Link></Button>
    </div>
  </WorkspaceFrame>;
}

export function useClerkPageState(auth, orgSlug) {
  const workspace = useWorkspaceState(orgSlug);
  if (!auth.isLoaded) return { status: 'Loading your session…' };
  if (!auth.isSignedIn) return { status: 'Sign in to open this workspace.' };
  if (orgSlug && !workspace.ready) return { status: workspace.status };
  return { status: '', workspace };
}

export function useWorkspaceState(orgSlug) {
  const { organization } = useOrganization();
  const { isLoaded, userMemberships } = useOrganizationList({ userMemberships: { pageSize: 50 } });
  if (!orgSlug) return { ready: true, status: '' };
  return workspaceContextState({
    isLoaded,
    organization,
    memberships: userMemberships?.data || [],
    orgSlug,
  });
}
