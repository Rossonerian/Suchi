import Link from 'next/link';
import { useAuth, useOrganization, useOrganizationList } from '../../lib/better-auth-client';
import { Bell, CalendarDays, CheckSquare, ChevronDown, Home, Inbox, Menu, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, Search, Settings, Sparkles, Users, Video } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../ui/sheet';
import { ApiError, saasApi } from '../../lib/api';
import { workspaceContextState } from '../../lib/workspace-context.mjs';
import { workspaceDisplayName } from '../../lib/workspace-selection.mjs';
import { SuchiLogo } from '../brand/SuchiLogo';

const saasAuthEnabled = true;

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

const navIcons = {
  Home,
  'My Work': CheckSquare,
  Inbox,
  Projects: PanelsTopLeft,
  Calendar: CalendarDays,
  'AI Assistant': Sparkles,
  Tasks: CheckSquare,
  Meetings: Video,
  Team: Users,
  Integrations: PanelsTopLeft,
  Billing: PanelsTopLeft,
  Settings,
};

export function WorkspaceFrame({ orgSlug, children, active }) {
  const { organization } = useOrganization();
  const workspaceName = workspaceDisplayName(organization, orgSlug);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const wasOpen = useRef(false);
  const current = active || 'Home';

  useEffect(() => {
    if (wasOpen.current && !mobileOpen) document.getElementById('workspace-navigation-trigger')?.focus();
    wasOpen.current = mobileOpen;
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return <div className={`workspace-shell${sidebarCollapsed ? ' is-collapsed' : ''}`}>
    <aside className="workspace-sidebar" aria-label="Workspace navigation">
      <WorkspaceBrand workspaceName={workspaceName} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <WorkspaceNavigation orgSlug={orgSlug} active={current} />
      <div className="workspace-sidebar-footer"><span className="muted">Team workspace</span></div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar banani-glass-surface">
        <div className="workspace-topbar-context">
          <Button id="workspace-navigation-trigger" type="button" className="workspace-mobile-trigger" variant="outline" size="icon" aria-label="Open workspace navigation" onClick={() => setMobileOpen(true)}><Menu aria-hidden="true" /></Button>
          <div className="workspace-breadcrumb"><p className="eyebrow">WORKSPACE</p><h1>{workspaceName}</h1></div>
        </div>
        {saasAuthEnabled && <div className="workspace-topbar-actions"><WorkspaceSearch orgSlug={orgSlug} /><NotificationCenter orgSlug={orgSlug} /><WorkspaceSwitcher /></div>}
      </header>
      <main className="workspace-content">{saasAuthEnabled ? <WorkspaceGate orgSlug={orgSlug}>{children}</WorkspaceGate> : children}</main>
    </div>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="workspace-mobile-sheet">
        <SheetHeader><SheetTitle>{workspaceName}</SheetTitle><SheetDescription>Workspace navigation</SheetDescription></SheetHeader>
        <WorkspaceNavigation orgSlug={orgSlug} active={current} onNavigate={closeMobile} />
        {saasAuthEnabled && <div className="workspace-mobile-switcher"><WorkspaceSwitcher /></div>}
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
  const auth = useAuth();
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
    if (!state.membership || organization?.id === state.membership.organization.id) return undefined;

    let active = true;
    Promise.resolve(setActive?.({ organization: state.membership.organization.id }))
      .catch(() => {
        if (active) setSwitchError('This workspace could not be activated. Try switching organizations again.');
      });
    return () => { active = false; };
  }, [organization, setActive, state.membership]);

  if (!auth.isLoaded) return <p className="muted" role="status" aria-busy="true">Loading your session…</p>;
  if (!auth.isSignedIn) return <p className="muted" role="alert">Sign in to open this workspace.</p>;
  if (switchError) return <p className="muted" role="alert">{switchError}</p>;
  if (!state.ready) return <p className="muted" role="status" aria-busy="true">{state.status}</p>;
  return children;
}

function WorkspaceBrand({ workspaceName, collapsed, onToggle }) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return <div className="workspace-brand"><SuchiLogo variant="symbol" className="workspace-logo" decorative /><div className="workspace-brand-copy"><p className="eyebrow">SUCHI WORKSPACE</p><strong>{workspaceName}</strong></div><button type="button" className="workspace-brand-collapse" onClick={onToggle} aria-label={collapsed ? 'Expand workspace navigation' : 'Collapse workspace navigation'} title={collapsed ? 'Expand navigation' : 'Collapse navigation'}><ToggleIcon aria-hidden="true" /></button><span className="workspace-brand-chevron" aria-hidden="true"><ChevronDown /></span></div>;
}

function WorkspaceSwitcher() {
  const router = useRouter();
  const { organization } = useOrganization();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { pageSize: 50 } });
  const [switching, setSwitching] = useState(false);
  const memberships = userMemberships?.data || [];

  async function switchWorkspace(membership) {
    const target = membership?.organization;
    if (!target || target.id === organization?.id || switching) return;
    setSwitching(true);
    try {
      await router.push(`/app/${encodeURIComponent(target.slug || target.id)}`);
      await setActive?.({ organization: target.id });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Unable to switch workspace.');
    } finally {
      setSwitching(false);
    }
  }

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="workspace-switcher-trigger" aria-label={`Workspace: ${organization?.name || 'Choose workspace'}`} disabled={!isLoaded || switching}>
        {switching ? 'Switching…' : organization?.name || 'Choose workspace'}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-56">
      <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {memberships.length ? memberships.map((membership) => <DropdownMenuItem key={membership.organization.id} onSelect={() => switchWorkspace(membership)}>{membership.organization.name || membership.organization.slug || membership.organization.id}{membership.organization.id === organization?.id ? ' (current)' : ''}</DropdownMenuItem>) : <DropdownMenuItem disabled>No workspaces available</DropdownMenuItem>}
    </DropdownMenuContent>
  </DropdownMenu>;
}

function WorkspaceNavigation({ orgSlug, active, onNavigate }) {
  const renderLinks = (items) => items.map(([label, path]) => {
    const selected = active === label || (label === 'Inbox' && active === 'Notifications');
    const Icon = navIcons[label] || PanelsTopLeft;
    return <Link key={label} href={`/app/${orgSlug}${path ? `/${path}` : ''}`} className="workspace-nav-link" aria-label={label} aria-current={selected ? 'page' : undefined} onClick={onNavigate}>
      <Icon aria-hidden="true" className="workspace-nav-icon" /><span>{label}</span>
    </Link>;
  });

  return <nav className="workspace-navigation" aria-label="Workspace navigation">
    <div className="workspace-nav-group">{renderLinks(primaryLinks)}</div>
    <div className="workspace-nav-section"><p>WORK</p>{renderLinks(workLinks)}</div>
    <div className="workspace-nav-section"><p>SETTINGS</p>{renderLinks(settingsLinks)}</div>
  </nav>;
}

function NotificationCenter({ orgSlug }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const unread = notifications.filter((item) => !item.readAt).length;
  useEffect(() => {
    setNotifications([]);
    setError('');
  }, [orgSlug]);
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    setError('');
    getToken().then((token) => saasApi.listNotifications({}, token)).then((result) => { if (active) setNotifications(result.notifications || []); }).catch((requestError) => { if (active) setError(requestError instanceof ApiError ? requestError.message : 'Notifications are unavailable.'); });
    return () => { active = false; };
  }, [getToken, open, orgSlug]);
  async function markRead(notification) {
    try { const token = await getToken(); await saasApi.markNotificationRead(notification.id, token); setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)); } catch (markError) { toast.error(markError instanceof ApiError ? markError.message : 'Unable to mark notification read.'); }
  }
  return <><div aria-live="polite" aria-atomic="true" className="sr-only">{error ? 'Notifications unavailable' : unread ? `${unread} unread notifications` : 'No unread notifications'}</div><DropdownMenu open={open} onOpenChange={setOpen}><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative"><Bell aria-hidden="true" />{unread ? <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread > 9 ? '9+' : unread}</span> : null}</Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-80"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator />{error ? <DropdownMenuItem disabled>{error}</DropdownMenuItem> : notifications.length ? notifications.slice(0, 10).map((notification) => <DropdownMenuItem key={notification.id} className="items-start gap-2" onSelect={() => markRead(notification)}><span className={notification.readAt ? 'text-sm' : 'text-sm font-semibold'}>{notification.title}<span className="block text-xs font-normal text-muted-foreground">{notification.body}</span></span></DropdownMenuItem>) : <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></>;
}

function WorkspaceSearch({ orgSlug }) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setQuery('');
    setResults(null);
    setError('');
  }, [orgSlug]);
  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return undefined; }
    let active = true;
    setError('');
    const timer = setTimeout(() => getToken().then((token) => saasApi.searchWorkspace(query.trim(), token)).then((result) => { if (active) setResults(result); }).catch((searchError) => { if (active) { setResults(null); setError(searchError instanceof ApiError ? searchError.message : 'Search is unavailable.'); } }), 220);
    return () => { active = false; clearTimeout(timer); };
  }, [getToken, orgSlug, query]);
  const all = results ? [...(results.projects || []).map((item) => ({ ...item, type: 'Project' })), ...(results.tasks || []).map((item) => ({ ...item, type: 'Task' })), ...(results.meetings || []).map((item) => ({ ...item, type: 'Meeting' }))].slice(0, 8) : [];
  return <div className="workspace-search relative hidden w-52 lg:block"><label htmlFor="workspace-search" className="sr-only">Search workspace</label><div className="flex items-center gap-2 rounded-md border border-input bg-background px-2"><Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" /><input id="workspace-search" className="h-8 min-h-0 border-0 bg-transparent px-0 text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" /></div>{(results || error) && <div className="absolute right-0 top-10 z-20 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">{error ? <p className="p-2 text-sm text-destructive" role="alert">{error}</p> : all.length ? all.map((item) => <Link key={`${item.type}-${item.id}`} href={`/app/${orgSlug}/${item.type === 'Project' ? `projects/${item.id}` : item.type === 'Task' ? `tasks/${item.id}` : `meetings?meeting=${item.id}`}`} className="block rounded px-2 py-1.5 text-sm hover:bg-muted"><span className="mr-2 text-xs text-muted-foreground">{item.type}</span>{item.name || item.title}</Link>) : <p className="p-2 text-sm text-muted-foreground">No matches.</p>}</div>}</div>;
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
