import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function MeetingsContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth);
  const [meetings, setMeetings] = useState([]);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status) return undefined;
    let active = true;
    getToken().then((token) => saasApi.listMeetings({}, token)).then((result) => { if (active) setMeetings(result.meetings || []); }).catch((err) => { if (active) setError(err instanceof ApiError ? err.message : 'Meetings are unavailable.'); });
    return () => { active = false; };
  }, [getToken, status]);

  async function schedule(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.createMeeting({ title, startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), timezone }, token);
      setMeetings((current) => [...current, result.meeting].sort((a, b) => new Date(a.startAt) - new Date(b.startAt)));
      setTitle(''); setStartAt(''); setEndAt(''); toast.success('Meeting scheduled');
    } catch (err) { setError(err instanceof ApiError ? err.message : 'Unable to schedule the meeting.'); } finally { setSaving(false); }
  }

  return <WorkspaceFrame orgSlug={orgSlug} active="Meetings">
    <div className="flex flex-col gap-2"><h2 className="text-2xl font-semibold">Meetings</h2><p className="muted">Schedule meetings for this organization; calendar sync can be connected separately.</p></div>
    {status && <p className="muted" role="status">{status}</p>}
    {!status && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <Card><CardHeader><CardTitle>Upcoming meetings</CardTitle><CardDescription>{meetings.length ? `${meetings.length} scheduled meeting${meetings.length === 1 ? '' : 's'}` : 'No meetings are scheduled yet.'}</CardDescription></CardHeader><CardContent>{meetings.length ? <ul className="grid gap-3" aria-label="Scheduled meetings">{meetings.map((meeting) => <li key={meeting.id} className="rounded-md border border-border p-3"><p className="font-medium">{meeting.title}</p><p className="text-sm text-muted-foreground">{new Date(meeting.startAt).toLocaleString()} – {new Date(meeting.endAt).toLocaleTimeString()} ({meeting.timezone})</p><p className="mt-1 text-xs uppercase text-muted-foreground">{meeting.status || 'scheduled'}</p></li>)}</ul> : <p className="muted">Create a meeting to give your team a shared next step.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Schedule meeting</CardTitle><CardDescription>Use your local time; the timezone is stored with the meeting.</CardDescription></CardHeader><CardContent><form className="grid gap-4" onSubmit={schedule}><div className="grid gap-2"><Label htmlFor="meeting-title">Title</Label><Input id="meeting-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={240} /></div><div className="grid gap-2"><Label htmlFor="meeting-start">Starts</Label><Input id="meeting-start" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="meeting-end">Ends</Label><Input id="meeting-end" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="meeting-timezone">Timezone</Label><Input id="meeting-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} required maxLength={80} /></div><Button type="submit" disabled={saving}>{saving ? 'Scheduling…' : 'Schedule meeting'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form></CardContent></Card>
    </div>}
  </WorkspaceFrame>;
}

export default function MeetingsPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <MeetingsContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
