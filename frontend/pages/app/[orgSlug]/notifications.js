import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function NotificationsContent({ orgSlug }) {
  const auth = useAuth();
  const { status } = useClerkPageState(auth);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (status) return undefined;
    let active = true;
    auth.getToken().then((token) => saasApi.listNotifications({}, token)).then((result) => { if (active) setNotifications(result.notifications || []); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Notifications are unavailable.'); });
    return () => { active = false; };
  }, [auth, status]);
  async function markRead(item) {
    try { const token = await auth.getToken(); await saasApi.markNotificationRead(item.id, token); setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)); } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Unable to mark notification read.'); }
  }
  return <WorkspaceFrame orgSlug={orgSlug} active="Notifications"><div><h2 className="text-2xl font-semibold">Notifications</h2><p className="muted mt-1">Updates for work in the active organization.</p></div>{status && <p className="muted" role="status">{status}</p>}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}{!status && <Card className="max-w-3xl"><CardHeader><CardTitle>Inbox</CardTitle><CardDescription>{notifications.filter((item) => !item.readAt).length} unread</CardDescription></CardHeader><CardContent>{notifications.length ? <ul className="grid gap-3">{notifications.map((item) => <li key={item.id} className={`rounded-md border border-border p-3 ${item.readAt ? '' : 'bg-muted/40'}`}><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.body}</p>{!item.readAt && <Button className="mt-3" size="sm" variant="outline" onClick={() => markRead(item)}>Mark read</Button>}</li>)}</ul> : <p className="muted">No notifications yet.</p>}</CardContent></Card>}</WorkspaceFrame>;
}

export default function NotificationsPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <NotificationsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
