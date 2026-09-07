import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function notificationHref(orgSlug, item) {
  if (!item.resourceId) return null;
  if (item.resourceType === 'task') return `/app/${orgSlug}/tasks/${encodeURIComponent(item.resourceId)}`;
  if (item.resourceType === 'project') return `/app/${orgSlug}/projects/${encodeURIComponent(item.resourceId)}`;
  if (item.resourceType === 'meeting') return `/app/${orgSlug}/meetings?meeting=${encodeURIComponent(item.resourceId)}`;
  return null;
}

function NotificationsContent({ orgSlug }) {
  const auth = useAuth(); const { getToken } = auth; const { status } = useClerkPageState(auth, orgSlug); const [notifications, setNotifications] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await getToken().then((token) => saasApi.listNotifications({}, token)); setNotifications(result.notifications || []); } catch (err) { setError(err instanceof ApiError ? err.message : 'Notifications are unavailable.'); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { if (!status) load(); }, [load, status]);
  async function markRead(item) { try { await saasApi.markNotificationRead(item.id, await auth.getToken()); setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)); } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Unable to mark notification read.'); } }
  return <WorkspaceFrame orgSlug={orgSlug} active="Notifications"><div><h2 className="text-2xl font-semibold">Inbox</h2><p className="muted mt-1">Updates that need your attention in this workspace.</p></div>{status && <p className="muted" role="status">{status}</p>}{!status && loading && <p className="muted" role="status" aria-busy="true">Loading notifications…</p>}{!status && !loading && <Card className="max-w-3xl"><CardHeader><CardTitle>Notifications</CardTitle><CardDescription>{notifications.filter((item) => !item.readAt).length} unread</CardDescription></CardHeader><CardContent>{error ? <div className="grid gap-3" role="alert"><p className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={load}>Retry</Button></div> : notifications.length ? <ul className="grid gap-3" aria-label="Notifications">{notifications.map((item) => { const href = notificationHref(orgSlug, item); return <li key={item.id} className={`rounded-lg border border-border p-4 ${item.readAt ? '' : 'bg-muted/40'}`}><div className="flex items-start justify-between gap-3"><div><p className={item.readAt ? 'font-medium' : 'font-semibold'}>{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={item.createdAt}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}</time></div>{!item.readAt ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}</div><div className="mt-3 flex flex-wrap gap-2">{href ? <Button asChild size="sm" variant="outline"><Link href={href} onClick={() => markRead(item)}>Open related work</Link></Button> : null}{!item.readAt ? <Button size="sm" variant="ghost" onClick={() => markRead(item)}>Mark read</Button> : null}</div></li>; })}</ul> : <div className="rounded-lg border border-dashed border-border p-6 text-center"><p className="font-medium">You’re all caught up</p><p className="muted mt-1">New assignments, comments, and meeting updates will appear here.</p></div>}</CardContent></Card>}</WorkspaceFrame>;
}

export default function NotificationsPage() { const { orgSlug } = useRouter().query; if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>; return clerkEnabled ? <NotificationsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />; }

export { notificationHref };
