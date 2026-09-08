import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, saasApi } from '../../../lib/api';
import { WorkspaceFrame, FeatureDisabled, useClerkPageState } from '../../../components/saas/WorkspaceFrame';
import { Button } from '../../../components/ui/button';
import { isDueToday, isOverdue, taskProgress } from '../../../lib/saas-task-utils.mjs';

const clerkEnabled = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'clerk' && Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function formatDate(value) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(value) {
  if (!value) return 'Time to be confirmed';
  return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function firstName(user) {
  return user?.firstName || user?.fullName?.split(' ')[0] || user?.username || 'there';
}

function taskPriority(task) {
  if (isOverdue(task)) return { label: 'Overdue', color: 'bg-[var(--danger)]' };
  if (task.status === 'blocked') return { label: 'Blocked', color: 'bg-[var(--danger)]' };
  if (task.priority === 'high' || task.priority === 'urgent') return { label: task.priority, color: 'bg-[var(--banani-accent)]' };
  return { label: task.priority || 'Normal', color: 'bg-[var(--banani-cyan)]' };
}

function openTasks(tasks) {
  return tasks.filter((task) => !['done', 'cancelled'].includes(task.status));
}

function HomeLoading() {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-busy="true">
    <div className="grid gap-4"><div className="h-56 animate-pulse rounded-[22px] bg-[var(--banani-surface)]" /><div className="h-64 animate-pulse rounded-[18px] bg-[var(--banani-surface)]" /></div>
    <div className="h-64 animate-pulse rounded-[18px] bg-[var(--banani-surface)]" />
  </div>;
}

function FocusHero({ task, user, orgSlug }) {
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  return <section className="relative overflow-hidden rounded-[22px] border border-[var(--banani-border)] bg-[radial-gradient(circle_at_82%_0%,rgba(109,138,255,.22),transparent_48%),radial-gradient(circle_at_20%_100%,rgba(53,200,211,.08),transparent_54%),var(--banani-surface)] p-6 shadow-[0_24px_70px_rgba(0,0,0,.12)] sm:p-8" aria-labelledby="home-focus-title">
    <div className="relative z-[1] max-w-2xl"><p className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--banani-text-muted)]">{today} · your focus</p><h1 id="home-focus-title" className="mt-4 max-w-xl text-3xl font-semibold tracking-[-.045em] text-[var(--banani-text)] sm:text-[2.55rem]">Good morning, {firstName(user)}.</h1><p className="mt-3 max-w-xl text-base leading-7 text-[var(--banani-text-secondary)]">{task ? <>One thing matters: <strong className="font-medium text-[var(--banani-text)]">{task.title}</strong></> : 'Your workspace is clear. Choose the next commitment and make progress visible.'}</p><div className="mt-7 flex flex-wrap items-center gap-3">{task ? <Button asChild className="rounded-xl bg-[var(--banani-accent)] px-5 text-[var(--primary-foreground)] shadow-[0_10px_26px_rgba(109,138,255,.22)] hover:bg-[var(--accent-dim)]"><Link href={`/app/${orgSlug}/tasks/${task.id}`}>Open focus task</Link></Button> : <Button asChild className="rounded-xl bg-[var(--banani-accent)] px-5 text-[var(--primary-foreground)]"><Link href={`/app/${orgSlug}/tasks`}>Choose work</Link></Button>}{task?.dueAt ? <span className="text-sm text-[var(--banani-text-secondary)]">Due {formatDate(task.dueAt)}</span> : null}</div></div>
  </section>;
}

function TodayThree({ tasks, orgSlug }) {
  const todayTasks = tasks.filter((task) => isDueToday(task)).slice(0, 3);
  return <section className="rounded-[18px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-5 sm:p-6" aria-labelledby="today-three-title"><div className="flex items-start justify-between gap-3"><div><h2 id="today-three-title" className="text-base font-semibold text-[var(--banani-text)]">Today&apos;s three</h2><p className="mt-1 text-xs text-[var(--banani-text-secondary)]">{todayTasks.length} of 3 due today · keep the next step clear</p></div><Link href={`/app/${orgSlug}/tasks?due=today`} className="text-xs font-medium text-[var(--banani-accent)] hover:underline">View all</Link></div><ul className="mt-5 divide-y divide-[var(--banani-border)]" aria-label="Tasks due today">{todayTasks.length ? todayTasks.map((task) => { const meta = taskPriority(task); const done = task.status === 'done'; return <li key={task.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span aria-hidden="true" className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${done ? 'border-[var(--done)] bg-[var(--done)] text-[#0d0e13]' : 'border-[var(--banani-text-muted)]'}`}>{done ? '✓' : ''}</span><div className="min-w-0 flex-1"><Link href={`/app/${orgSlug}/tasks/${task.id}`} className={`block truncate text-sm font-medium ${done ? 'text-[var(--banani-text-muted)] line-through' : 'text-[var(--banani-text)]'} hover:text-[var(--banani-accent)]`}>{task.title}</Link><p className="mt-1 flex items-center gap-2 text-xs text-[var(--banani-text-muted)]"><span className={`h-1.5 w-1.5 rounded-full ${meta.color}`} />{done ? 'Done' : meta.label} · {task.dueAt ? formatTime(task.dueAt) : 'today'}</p></div><span className="hidden font-mono text-[11px] text-[var(--banani-text-muted)] sm:inline">{task.priority || 'normal'}</span></li>; }) : <li className="py-3 text-sm text-[var(--banani-text-secondary)]">Nothing is due today. Choose a commitment from your open work.</li>}</ul></section>;
}

function UpNext({ meetings, orgSlug }) {
  const meeting = meetings.filter((item) => item.status !== 'cancelled' && new Date(item.startAt) >= new Date()).sort((a, b) => new Date(a.startAt) - new Date(b.startAt))[0];
  return <section className="rounded-[18px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-5" aria-labelledby="up-next-title"><div className="flex items-center justify-between gap-3"><h2 id="up-next-title" className="text-base font-semibold text-[var(--banani-text)]">Up next</h2><span className="font-mono text-[10px] uppercase tracking-[.1em] text-[var(--banani-text-muted)]">Agenda</span></div>{meeting ? <div className="mt-5"><p className="font-mono text-xs text-[var(--banani-accent)]">{formatTime(meeting.startAt)}</p><Link href={`/app/${orgSlug}/meetings?meeting=${encodeURIComponent(meeting.id)}`} className="mt-2 block text-sm font-medium text-[var(--banani-text)] hover:text-[var(--banani-accent)]">{meeting.title}</Link><p className="mt-1 text-xs text-[var(--banani-text-secondary)]">{meeting.projectName || 'Workspace meeting'}</p><Button asChild size="sm" variant="outline" className="mt-4 rounded-lg border-[var(--banani-border)]"><Link href={`/app/${orgSlug}/meetings?meeting=${encodeURIComponent(meeting.id)}`}>Open meeting</Link></Button></div> : <p className="mt-5 text-sm text-[var(--banani-text-secondary)]">No upcoming meetings.</p>}</section>;
}

function ProjectPulse({ projects, orgSlug }) {
  return <section className="rounded-[18px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-5" aria-labelledby="project-pulse-title"><div className="flex items-center justify-between gap-3"><h2 id="project-pulse-title" className="text-base font-semibold text-[var(--banani-text)]">Pulse</h2><span className="font-mono text-[10px] uppercase tracking-[.1em] text-[var(--banani-text-muted)]">Projects</span></div><ul className="mt-5 grid gap-4">{projects.slice(0, 4).map((project) => { const progress = taskProgress(project.tasks || []); const value = progress === null ? 0 : progress; return <li key={project.id}><div className="flex items-center justify-between gap-3 text-xs"><Link href={`/app/${orgSlug}/projects/${project.id}`} className="truncate font-medium text-[var(--banani-text)] hover:text-[var(--banani-accent)]">{project.name}</Link><span className="font-mono text-[var(--banani-text-muted)]">{progress === null ? '—' : `${value}%`}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--banani-border)]"><span className="block h-full rounded-full bg-[var(--banani-accent)] transition-[width] duration-300" style={{ width: `${value}%` }} /></div></li>; })}</ul></section>;
}

function HomeContent({ orgSlug }) {
  const auth = useAuth(); const { getToken, user } = auth; const { status } = useClerkPageState(auth, orgSlug);
  const [projects, setProjects] = useState([]); const [tasks, setTasks] = useState([]); const [meetings, setMeetings] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const token = await getToken(); const [projectResult, taskResult, meetingResult] = await Promise.all([saasApi.listProjects(token), saasApi.listTasks({}, token), saasApi.listMeetings({}, token)]); setProjects(projectResult.projects || []); setTasks(taskResult.tasks || []); setMeetings(meetingResult.meetings || []); } catch (err) { setError(err instanceof ApiError ? err.message : 'Workspace data is unavailable.'); } finally { setLoading(false); } }, [getToken]);
  useEffect(() => { if (!status) load(); }, [load, status]);
  const focusTask = useMemo(() => { const open = openTasks(tasks); return open.slice().sort((a, b) => { const aScore = a.status === 'blocked' ? 0 : isOverdue(a) ? 1 : isDueToday(a) ? 2 : 3; const bScore = b.status === 'blocked' ? 0 : isOverdue(b) ? 1 : isDueToday(b) ? 2 : 3; return aScore - bScore || new Date(a.dueAt || '9999-12-31') - new Date(b.dueAt || '9999-12-31'); })[0]; }, [tasks]);
  const handled = tasks.filter((task) => task.status === 'done').length; const blocked = tasks.filter((task) => task.status === 'blocked').length;
  if (status) return <WorkspaceFrame orgSlug={orgSlug} active="Home"><p className="muted" role="status">{status}</p></WorkspaceFrame>;
  return <WorkspaceFrame orgSlug={orgSlug} active="Home"><div className="banani-home mx-auto max-w-[1380px] space-y-4"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow"><span aria-hidden="true" />HOME</p><p className="text-sm text-[var(--banani-text-secondary)]">A calm view of the commitments that matter next.</p></div><Link href={`/app/${orgSlug}/tasks`} className="text-sm font-medium text-[var(--banani-accent)] hover:underline">Open all work →</Link></header>{loading ? <HomeLoading /> : error ? <section className="rounded-[18px] border border-[var(--danger)]/40 bg-[var(--banani-surface)] p-6" role="alert"><h1 className="text-lg font-semibold text-[var(--banani-text)]">Workspace data could not load</h1><p className="mt-2 text-sm text-[var(--banani-text-secondary)]">{error}</p><Button variant="outline" className="mt-4 rounded-lg border-[var(--banani-border)]" onClick={load}>Retry</Button></section> : !projects.length ? <section className="rounded-[22px] border border-[var(--banani-border)] bg-[var(--banani-surface)] p-8"><p className="font-mono text-[11px] uppercase tracking-[.12em] text-[var(--banani-text-muted)]">First step</p><h1 className="mt-3 text-2xl font-semibold text-[var(--banani-text)]">Create your first project</h1><p className="mt-2 max-w-lg text-sm leading-6 text-[var(--banani-text-secondary)]">Projects give your team a shared outcome for the tasks and deadlines ahead.</p><Button asChild className="mt-6 rounded-xl bg-[var(--banani-accent)] text-[var(--primary-foreground)]"><Link href={`/app/${orgSlug}/projects`}>Create project</Link></Button></section> : <><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="grid gap-4"><FocusHero task={focusTask} user={user} orgSlug={orgSlug} /><TodayThree tasks={tasks} orgSlug={orgSlug} /><div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--banani-border)] px-4 py-3 text-xs text-[var(--banani-text-secondary)]"><span><strong className="font-medium text-[var(--banani-text)]">Everything else is handled.</strong> {handled} completed · {blocked} waiting on others.</span><Link href={`/app/${orgSlug}/my-work`} className="font-medium text-[var(--banani-accent)] hover:underline">Review work</Link></div></div><aside className="grid content-start gap-4"><UpNext meetings={meetings} orgSlug={orgSlug} /><ProjectPulse projects={projects} orgSlug={orgSlug} /></aside></div></>}</div></WorkspaceFrame>;
}

export default function WorkspaceHome() { const { orgSlug } = useRouter().query; if (!orgSlug || Array.isArray(orgSlug)) return <main className="loading-page" aria-busy="true"><p>Loading workspace…</p></main>; return clerkEnabled ? <HomeContent orgSlug={orgSlug} /> : <FeatureDisabled orgSlug={orgSlug} />; }

export { HomeContent, FocusHero, TodayThree };
