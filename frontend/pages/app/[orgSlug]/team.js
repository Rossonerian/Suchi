import { useRouter } from 'next/router';
import { useAuth } from '../../../lib/better-auth-client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

const clerkEnabled = true;

function TeamContent({ orgSlug }) {
  const auth = useAuth();
  const { getToken } = auth;
  const { status } = useClerkPageState(auth, orgSlug);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMembers([]);
    setError('');
  }, [orgSlug]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const token = await getToken();
      const result = await saasApi.listMembers(token);
      setMembers(result.members || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Team data is unavailable.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!status) load();
  }, [load, status, orgSlug]);

  async function invite(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const token = await getToken();
      await saasApi.inviteMember({ email, role }, token);
      setEmail('');
      toast.success(`Invitation sent to ${email}`);
      await load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to send invitation.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return <WorkspaceFrame orgSlug={orgSlug} active="Team"><div><h2 className="text-2xl font-semibold">Team</h2><p className="muted mt-1">People in this organization are managed by Clerk invitations.</p></div>{status && <p className="muted" role="status">{status}</p>}{!status && loading && <p className="muted" role="status" aria-busy="true">Loading team members…</p>}{!status && !loading && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]"><Card><CardHeader><CardTitle>Members</CardTitle><CardDescription>{members.length} current member{members.length === 1 ? '' : 's'}</CardDescription></CardHeader><CardContent>{error ? <div className="grid gap-3" role="alert"><p className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={load}>Retry</Button></div> : members.length ? <ul className="grid gap-3">{members.map((member) => <li key={member.id} className="rounded-md border border-border p-3"><p className="font-medium">{member.displayName || member.email || member.userId}</p><p className="text-sm text-muted-foreground">{member.email || 'No email'} · {member.role}</p></li>)}</ul> : <p className="muted">No members are available yet.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Invite teammate</CardTitle><CardDescription>Only organization owners and admins can send invitations.</CardDescription></CardHeader><CardContent><form className="grid gap-4" onSubmit={invite}><div className="grid gap-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="invite-role">Role</Label><select id="invite-role" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value)}><option value="member">Member</option><option value="admin">Admin</option></select></div><Button type="submit" disabled={saving}>{saving ? 'Inviting…' : 'Send invitation'}</Button>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</form></CardContent></Card></div>}</WorkspaceFrame>;
}

export default function TeamPage() {
  const { orgSlug } = useRouter().query;
  if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page"><p>Loading workspace…</p></main>;
  return clerkEnabled ? <TeamContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />;
}
