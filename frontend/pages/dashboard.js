import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { api, ApiError } from '../lib/api';
import { clearMember } from '../lib/session';
import { filterTasks } from '../lib/dashboard-utils.mjs';
import Header from '../components/Header';
import TaskToolbar from '../components/TaskToolbar';
import MeetingScheduler from '../components/MeetingScheduler';
import MeetingsList from '../components/MeetingsList';
import PlanUpload from '../components/PlanUpload';
import PlansList from '../components/PlansList';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import AddTaskForm from '../components/AddTaskForm';
import TasksDataTable from '../components/tasks/TasksDataTable';
import TaskDetailSheet from '../components/tasks/TaskDetailSheet';
import TaskKanbanBoard from '../components/tasks/TaskKanbanBoard';
import CommandPalette from '../components/CommandPalette';
import MeetingAgenda from '../components/MeetingAgenda';
import MissionSidebar from '../components/MissionSidebar';
import { createDashboardMetrics } from '../lib/dashboard-metrics.mjs';
import { applyTaskUpdate } from '../lib/task-state.mjs';

const DashboardMetrics = dynamic(() => import('../components/DashboardMetrics'), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [tasksByTeam, setTasksByTeam] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState('');
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [taskView, setTaskView] = useState('table');

  const redirectToSignIn = useCallback(() => {
    clearMember();
    router.replace('/');
  }, [router]);

  const loadAll = useCallback(async ({ refresh = false } = {}) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [teamsData, tasks, meetingsData, missionData, plansData] = await Promise.all([
        api.getTeams(), api.getTasks(), api.getMeetings(), api.getMission(), api.getPlans(),
      ]);
      const byTeam = {};
      tasks.forEach((task) => { (byTeam[task.team] ||= []).push(task); });
      setTeams(teamsData);
      setTasksByTeam(byTeam);
      setMeetings(meetingsData);
      setDeadline(missionData.deadline);
      setPlans(plansData);
      return byTeam;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToSignIn();
        return;
      }
      setError(err.message || 'Unable to load the mission board. Try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [redirectToSignIn]);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      // Remove the pre-session identity cache during migration. The server
      // cookie remains the only authority for this page.
      clearMember();
      setLoading(true);
      setError('');
      try {
        const current = await api.getCurrentMember();
        if (!active) return;
        setMember(current.member || current);
        await loadAll();
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          redirectToSignIn();
        } else {
          setError(err.message || 'Unable to load the mission board. Try again.');
          setLoading(false);
        }
      }
    }
    bootstrap();
    return () => { active = false; };
  }, [loadAll, redirectToSignIn]);

  async function mutate(action, successMessage) {
    try {
      const result = await action();
      await loadAll({ refresh: true });
      toast.success(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        redirectToSignIn();
        return false;
      }
      toast.error(err.message || 'That change could not be saved. Try again.');
      return false;
    }
  }

  async function handleAddTask(teamId, payload) {
    await mutate(() => api.createTask({ ...payload, team: teamId, createdBy: member?._id }), 'Task added.');
  }

  async function handleSeedModules() {
    const result = await api.seedModules();
    await loadAll({ refresh: true });
    return result;
  }

  async function updateTaskOptimistically(taskId, updates) {
    const previousTasks = tasksByTeam;
    setTasksByTeam(applyTaskUpdate(previousTasks, taskId, updates, teams));
    setUpdatingTaskId(taskId);
    try {
      await api.updateTask(taskId, updates);
      await loadAll({ refresh: true });
      toast.success('Task updated.');
      return true;
    } catch (err) {
      setTasksByTeam(previousTasks);
      if (err instanceof ApiError && err.status === 401) {
        redirectToSignIn();
      } else {
        toast.error(err.message || 'That change could not be saved. Your task was restored.');
      }
      return false;
    } finally {
      setUpdatingTaskId('');
    }
  }

  const allTasks = useMemo(() => Object.values(tasksByTeam).flat(), [tasksByTeam]);

  const overallProgress = useMemo(() => {
    const done = allTasks.filter((task) => task.status === 'done').length;
    return { total: allTasks.length, done, percent: allTasks.length ? Math.round((done / allTasks.length) * 100) : 0 };
  }, [allTasks]);
  const metrics = useMemo(() => createDashboardMetrics({ tasks: allTasks, meetings, teams }), [allTasks, meetings, teams]);
  const visibleTasks = useMemo(() => filterTasks(allTasks, { query, status }), [allTasks, query, status]);

  const handleSignOut = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      // A revoked/expired session is already signed out. Other failures are
      // still surfaced before leaving the page so the user understands what
      // happened, while the local migration key is always removed.
      if (!(err instanceof ApiError && err.status === 401)) {
        setError(err.message || 'Unable to sign out cleanly. Try again.');
      }
    } finally {
      clearMember();
      router.replace('/');
    }
  }, [router]);

  if (loading) return <main className="loading-page" aria-busy="true"><div className="loading-card"><span className="skeleton-line" /><span className="skeleton-line short" /><span className="skeleton-grid" /></div><p>Loading mission board…</p></main>;

  return (
    <div className="app-shell">
      <MissionSidebar isAdmin={member?.role === 'admin'} mobileOpen={mobileNavigationOpen} onMobileOpenChange={setMobileNavigationOpen} />
      <div className="app-content">
      <Header member={member} overallProgress={overallProgress} deadline={deadline} onSignOut={handleSignOut} onOpenNavigation={() => setMobileNavigationOpen(true)} onOpenCommandPalette={() => setCommandOpen(true)} />
      <main className="dashboard-main">
        <div className="page-intro">
          <div><p className="eyebrow">OPERATIONS</p><h2>Team workboard</h2><p className="muted">Track work, unblock teammates, and keep the mission moving.</p></div>
          <TaskToolbar query={query} status={status} onQueryChange={setQuery} onStatusChange={setStatus} onRefresh={() => loadAll({ refresh: true })} refreshing={refreshing} />
        </div>
        <DashboardMetrics metrics={metrics} />
        {error && <div className="notice notice-error" role="alert"><span>{error}</span><Button variant="outline" onClick={() => loadAll({ refresh: true })}>Retry</Button></div>}
        <section aria-label="Team tasks"><div className="task-view-controls" role="group" aria-label="Task view"><span className="muted">View</span><Button variant={taskView === 'table' ? 'secondary' : 'outline'} size="sm" aria-pressed={taskView === 'table'} onClick={() => setTaskView('table')}>Table</Button><Button variant={taskView === 'board' ? 'secondary' : 'outline'} size="sm" aria-pressed={taskView === 'board'} onClick={() => setTaskView('board')}>Board</Button></div>{taskView === 'table' ? <TasksDataTable tasks={visibleTasks} teams={teams} onTaskClick={setSelectedTask} onStatusChange={updateTaskOptimistically} updatingTaskId={updatingTaskId} emptyAction={query || status !== 'all' ? <Button variant="outline" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</Button> : <Button asChild><a href="#create-task">Create task</a></Button>} /> : <TaskKanbanBoard tasks={visibleTasks} onTaskClick={setSelectedTask} onStatusChange={updateTaskOptimistically} updatingTaskId={updatingTaskId} emptyAction={query || status !== 'all' ? <Button variant="outline" onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</Button> : <Button asChild><a href="#create-task">Create task</a></Button>} />}<div className="task-create-grid" id="create-task" aria-label="Add a task by team">{teams.map((team) => <div key={team._id}><h3>{team.displayName}</h3><AddTaskForm onAdd={(payload) => mutate(() => api.createTask({ ...payload, team: team._id }), 'Task added.')} /></div>)}</div></section>
        <section className="dashboard-section" aria-labelledby="plans-heading"><div className="section-heading"><div><p className="eyebrow">ACCOUNTABILITY</p><h2 id="plans-heading">Plans and progress</h2></div></div><div className="detail-grid"><Card className="surface" id="post-plan"><h3>Post a team plan</h3><PlanUpload teams={teams} defaultTeamId={member?.team?._id} onUpload={(payload) => mutate(() => api.createPlan(payload), 'Plan posted.')} /></Card><Card className="surface"><h3>Recent plans</h3><PlansList plans={plans} onDelete={(id) => mutate(() => api.deletePlan(id), 'Plan deleted.')} /></Card></div></section>
        <section className="dashboard-section" aria-labelledby="meetings-heading"><div className="section-heading"><div><p className="eyebrow">COORDINATION</p><h2 id="meetings-heading">Meetings</h2></div></div><MeetingAgenda meetings={meetings} /><div className="detail-grid"><Card className="surface" id="schedule-meeting"><h3>Schedule a meeting</h3><MeetingScheduler teams={teams} onSchedule={async (payload) => { const meeting = await api.createMeeting(payload); await loadAll({ refresh: true }); return meeting; }} /></Card><Card className="surface"><h3>Schedule</h3><MeetingsList meetings={meetings} onRetry={(id) => mutate(() => api.retryMeeting(id), (meeting) => meeting?.emailStatus === 'sent' ? 'Invitation sent.' : 'Meeting is saved, but invitation delivery is still failing. Try again later.')} /></Card></div></section>
        <TaskDetailSheet task={selectedTask} team={teams.find((team) => team._id === (selectedTask?.team?._id || selectedTask?.team))} onClose={() => setSelectedTask(null)} onSave={updateTaskOptimistically} onDelete={(taskId) => mutate(() => api.deleteTask(taskId), 'Task deleted.')} />
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} tasks={allTasks} onTaskSelect={setSelectedTask} isAdmin={member?.role === 'admin'} />
      </main>
      </div>
    </div>
  );
}
