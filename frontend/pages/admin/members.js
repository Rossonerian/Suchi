import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '../../lib/api';
import { toast } from 'sonner';
import AdminShell from '../../components/admin/AdminShell';

function teamId(member) {
  return member.team?._id || member.team || '';
}

function claimLink(data) {
  if (data?.claimUrl) return data.claimUrl;
  const token = data?.token || data?.claimToken || data?.invite?.token;
  if (typeof window === 'undefined' || !token) return '';
  return `${window.location.origin}/claim-invite?token=${encodeURIComponent(token)}`;
}

export default function MembersAdmin() {
  const [current, setCurrent] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', team: '', role: 'member' });
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const meData = await api.getCurrentMember();
      const me = meData.member || meData;
      setCurrent(me);
      if (me.role !== 'admin') return;
      const [memberData, teamData] = await Promise.all([api.getAdminMembers(), api.getTeams()]);
      setMembers(memberData.members || memberData);
      setTeams(teamData.teams || teamData);
      setForm((previous) => ({ ...previous, team: previous.team || (teamData.teams || teamData)[0]?._id || '' }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.location.assign('/');
        return;
      }
      setError(err.message || 'Unable to load member administration.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createInvite(event) {
    event.preventDefault();
    setBusy('invite'); setError(''); setInviteLink('');
    try {
      const data = await api.createInvite(form);
      setInviteLink(claimLink(data));
      toast.success('Invitation created. Copy the one-time claim link and send it securely.');
      setForm((previous) => ({ ...previous, name: '', email: '' }));
      await load();
    } catch (err) { toast.error(err.message || 'Unable to create invitation.'); } finally { setBusy(''); }
  }

  async function updateMember(id, payload, message) {
    setBusy(id); setError('');
    try {
      await api.updateMember(id, payload);
      toast.success(message);
      await load();
    } catch (err) { toast.error(err.message || 'Unable to update member.'); } finally { setBusy(''); }
  }

  async function resetAccess(member) {
    let email = member.email;
    if (!email) {
      email = window.prompt(`Email address for ${member.name}`) || '';
      if (!email.trim()) return;
    }
    setBusy(member._id); setError(''); setInviteLink('');
    try {
      const data = await api.resetMemberAccess(member._id, { email: email.trim() });
      setInviteLink(claimLink(data));
      toast.success(`A new access invitation was created for ${member.name}.`);
    } catch (err) { toast.error(err.message || 'Unable to reset access.'); } finally { setBusy(''); }
  }

  async function revokeSessions(member) {
    if (!window.confirm(`Sign ${member.name} out on all devices?`)) return;
    setBusy(member._id); setError('');
    try {
      await api.revokeMemberSessions(member._id);
      toast.success(`All sessions for ${member.name} were revoked.`);
    } catch (err) { toast.error(err.message || 'Unable to revoke sessions.'); } finally { setBusy(''); }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invitation link copied.');
    } catch { toast.error('Select and copy the invitation link manually.'); }
  }

  if (loading) return <main className="loading-page" aria-busy="true"><div className="loading-card"><span className="skeleton-line" /><span className="skeleton-line short" /><span className="skeleton-grid" /></div><p>Loading members…</p></main>;
  if (!current || current.role !== 'admin') return <main className="signin-shell"><section className="signin-panel"><p className="eyebrow">ACCESS CONTROL</p><h1>Admin access required</h1><p className="form-hint">Only administrators can manage member access.</p><Link className="button button-secondary" href="/dashboard">Back to dashboard</Link></section></main>;

  return (
    <AdminShell active="Users" operator={current.name}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow"><span aria-hidden="true" />ACCESS CONTROL</p><h2 className="text-2xl font-semibold">Users</h2><p className="muted mt-1">Invite teammates and keep account access current.</p></div><Link className="button button-secondary" href="/dashboard">Back to workspace</Link></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      {inviteLink && <section className="surface invite-link-panel" aria-labelledby="invite-link-title"><h2 id="invite-link-title">One-time invitation link</h2><p className="form-hint">Send this link privately. It is shown only now and expires.</p><div className="invite-link-row"><input value={inviteLink} readOnly aria-label="Invitation claim link" onFocus={(event) => event.target.select()} /><button className="button button-secondary" type="button" onClick={copyLink}>Copy link</button></div></section>}
      <section className="surface" aria-labelledby="invite-heading"><h2 id="invite-heading">Invite member</h2><form className="admin-invite-form" onSubmit={createInvite}>
        <label>Name<input id="invite-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" required /></label>
        <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required /></label>
        <label>Team<select value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} required>{teams.map((team) => <option key={team._id} value={team._id}>{team.displayName}</option>)}</select></label>
        <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="member">Member</option><option value="admin">Admin</option></select></label>
        <button className="button button-primary" disabled={busy === 'invite'}>{busy === 'invite' ? 'Creating…' : 'Create invitation'}</button>
      </form></section>
      <section className="surface" aria-labelledby="member-list-heading"><div className="section-heading"><div><h2 id="member-list-heading">Team members</h2><p className="muted">{members.length} account{members.length === 1 ? '' : 's'}</p></div></div><div className="members-table-wrap"><table className="members-table"><caption className="sr-only">Suchi member accounts</caption><thead><tr><th>Name</th><th>Email</th><th>Team</th><th>Status</th><th>Role</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{members.length === 0 ? <tr><td className="members-empty" colSpan="6"><p>No member accounts are active yet. Create an invitation to bring the first teammate aboard.</p><a className="button button-primary" href="#invite-name">Create invitation</a></td></tr> : members.map((member) => { const id = member._id; const disabled = busy === id; return <tr key={id}><td data-label="Name"><strong>{member.name}</strong></td><td data-label="Email">{member.email}</td><td data-label="Team"><select value={teamId(member)} onChange={(event) => updateMember(id, { team: event.target.value }, `${member.name}'s team was updated.`)} disabled={disabled}>{teams.map((team) => <option key={team._id} value={team._id}>{team.displayName}</option>)}</select></td><td data-label="Status"><select value={member.status || 'active'} onChange={(event) => updateMember(id, { status: event.target.value }, `${member.name}'s status was updated.`)} disabled={disabled}><option value="invited">Invited</option><option value="active">Active</option><option value="disabled">Disabled</option></select></td><td data-label="Role"><select value={member.role || 'member'} onChange={(event) => updateMember(id, { role: event.target.value }, `${member.name}'s role was updated.`)} disabled={disabled}><option value="member">Member</option><option value="admin">Admin</option></select></td><td data-label="Actions"><div className="member-actions"><button className="button button-secondary" type="button" onClick={() => resetAccess(member)} disabled={disabled}>Reset access</button><button className="button button-secondary" type="button" onClick={() => revokeSessions(member)} disabled={disabled}>Revoke sessions</button></div></td></tr>; })}</tbody></table></div></section>
    </AdminShell>
  );
}
