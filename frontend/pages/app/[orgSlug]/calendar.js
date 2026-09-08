import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../../lib/better-auth-client';
import { useEffect, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { formatMeetingTime } from '../../../lib/meeting-time.mjs';

const clerkEnabled = true;

function CalendarContent({ orgSlug }) {
  const auth = useAuth();
  const { status } = useClerkPageState(auth, orgSlug);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (status) return undefined;
    let active = true;
    auth.getToken().then((token) => saasApi.listMeetings({}, token)).then((result) => { if (active) setMeetings((result.meetings || []).filter((meeting) => meeting.status !== 'cancelled').sort((a, b) => new Date(a.startAt) - new Date(b.startAt))); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Calendar data is unavailable.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth, status]);
  return <WorkspaceFrame orgSlug={orgSlug} active="Calendar"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">COORDINATION</p><h1 className="text-2xl font-semibold">Calendar</h1><p className="muted mt-1">Your upcoming organization meetings, shown as an agenda.</p></div><Button asChild><Link href={`/app/${orgSlug}/meetings`}>Schedule meeting</Link></Button></div>{status && <p className="muted" role="status">{status}</p>}{!status && loading && <p className="muted" role="status" aria-busy="true">Loading calendar…</p>}{!status && !loading && error && <Card role="alert"><CardHeader><CardTitle>Calendar could not load</CardTitle><CardDescription>{error}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card>}{!status && !loading && !error && <Card><CardHeader><CardTitle>Upcoming agenda</CardTitle><CardDescription>{meetings.length ? `${meetings.length} upcoming meeting${meetings.length === 1 ? '' : 's'}` : 'Your schedule is clear.'}</CardDescription></CardHeader><CardContent>{meetings.length ? <ol className="grid gap-3">{meetings.map((meeting) => <li key={meeting.id} className="rounded-lg border border-border p-4"><p className="font-medium">{meeting.title}</p><p className="mt-1 text-sm text-muted-foreground">{formatMeetingTime(meeting.startAt, meeting.timezone)} · {meeting.timezone || 'UTC'}</p><p className="mt-1 text-xs text-muted-foreground">{meeting.projectName || 'Organization meeting'}</p></li>)}</ol> : <div className="rounded-lg border border-dashed border-border p-6 text-center"><p className="font-medium">No upcoming meetings</p><p className="muted mt-1">Schedule one when your team needs a shared next step.</p></div>}</CardContent></Card>}</WorkspaceFrame>;
}

export default function CalendarPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <CalendarContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}

export { CalendarContent };
