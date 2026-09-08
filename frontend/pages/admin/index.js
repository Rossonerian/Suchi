import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import AdminShell from '../../components/admin/AdminShell';

function Metric({ label, value, detail }) {
  return <div className="rounded-[14px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-4"><p className="font-mono text-[10px] uppercase tracking-[.1em] text-[var(--banani-text-muted)]">{label}</p><p className="mt-3 text-2xl font-semibold text-[var(--banani-text)]">{value}</p>{detail ? <p className="mt-1 text-xs text-[var(--banani-text-secondary)]">{detail}</p> : null}</div>;
}

export default function AdminOverview() {
  const [current, setCurrent] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([api.getCurrentMember(), api.getAdminMembers(), api.getTeams()]).then(([meData, memberData, teamData]) => {
      if (!active) return;
      setCurrent(meData.member || meData); setMembers(memberData.members || memberData); setTeams(teamData.teams || teamData);
    }).catch((err) => { if (active) { if (err instanceof ApiError && err.status === 401) window.location.assign('/'); else setError(err.message || 'Unable to load admin overview.'); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <main className="loading-page" aria-busy="true"><p>Loading admin overview…</p></main>;
  if (error) return <main className="loading-page"><section className="loading-card" role="alert"><h1>Admin data unavailable</h1><p className="muted">{error}</p><Link className="button button-secondary" href="/dashboard">Back to workspace</Link></section></main>;
  if (!current || current.role !== 'admin') return <main className="signin-shell"><section className="signin-panel"><p className="eyebrow">ACCESS CONTROL</p><h1>Admin access required</h1><p className="form-hint">Only administrators can view platform operations.</p><Link className="button button-secondary" href="/dashboard">Back to workspace</Link></section></main>;
  const activeMembers = members.filter((member) => member.status === 'active').length;
  const invited = members.filter((member) => member.status === 'invited').length;
  return <AdminShell active="Overview" operator={current.name}><div className="mb-5"><p className="eyebrow"><span aria-hidden="true" />OPERATIONS</p><h2 className="text-2xl font-semibold">Workspace administration</h2><p className="muted mt-1">A compact view of the access data available to this deployment.</p></div><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Administration summary"><Metric label="Members" value={members.length} detail="Accounts in the admin directory" /><Metric label="Active" value={activeMembers} detail="Members with active access" /><Metric label="Teams" value={teams.length} detail="Configured legacy teams" /><Metric label="Invited" value={invited} detail="Invitations awaiting claim" /></section><div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]"><section className="rounded-[18px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-5" aria-labelledby="admin-activity-title"><div className="flex items-center justify-between gap-3"><div><h3 id="admin-activity-title" className="text-base font-semibold">Access activity</h3><p className="mt-1 text-xs text-[var(--banani-text-secondary)]">Current member status from the legacy administration API.</p></div><Link href="/admin/members" className="text-xs font-medium text-[var(--banani-accent)] hover:underline">Manage users</Link></div><ul className="mt-5 grid gap-3">{members.slice(0, 6).map((member) => <li key={member._id} className="flex items-center justify-between gap-3 border-b border-[var(--banani-border)] pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{member.name}</p><p className="truncate text-xs text-[var(--banani-text-secondary)]">{member.email}</p></div><span className="font-mono text-[10px] uppercase tracking-[.08em] text-[var(--banani-text-muted)]">{member.status || 'unknown'}</span></li>)}</ul></section><section className="rounded-[18px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-5" aria-labelledby="admin-scope-title"><h3 id="admin-scope-title" className="text-base font-semibold">Available scope</h3><p className="mt-2 text-sm leading-6 text-[var(--banani-text-secondary)]">Organization, billing, audit-log, and system-health views are not exposed by this deployment&apos;s administration API.</p><p className="mt-4 rounded-xl border border-[var(--banani-border)] bg-[rgba(255,255,255,.025)] p-3 text-xs text-[var(--banani-text-muted)]">No operational status is inferred here. The metrics above are limited to records returned by the server.</p></section></div></AdminShell>;
}
