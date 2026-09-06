// Single responsibility: full-page view of one team — reuses TeamColumn at
// full width instead of squeezed into the dashboard grid, plus the same
// task detail modal. Reached by clicking a team name on the dashboard.
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';
import TeamColumn from '../../components/TeamColumn';
import TaskDetailModal from '../../components/TaskDetailModal';

export default function TeamPage() {
  const router = useRouter();
  const { teamId } = router.query;
  const [member, setMember] = useState(null);
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    if (!teamId) return null;
    setError('');
    try {
      const teams = await api.getTeams();
      const found = teams.find((t) => t._id === teamId);
      setTeam(found || null);

      const taskList = await api.getTasks(teamId);
      setTasks(taskList);
      return taskList;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    let active = true;
    api.getCurrentMember().then((data) => {
      if (!active) return;
      setMember(data.member || data);
    }).catch(() => {
      router.replace('/');
    });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (member && teamId) loadAll();
  }, [member, teamId, loadAll]);

  async function handleAddTask(tId, payload) {
    await api.createTask({ ...payload, team: tId, createdBy: member._id });
    loadAll();
  }

  async function handleUpdateTask(taskId, updates) {
    await api.updateTask(taskId, updates);
    const list = await loadAll();
    if (list) {
      const refreshed = list.find((t) => t._id === taskId);
      if (refreshed) setSelectedTask(refreshed);
    }
  }

  async function handleDeleteTask(taskId) {
    await api.deleteTask(taskId);
    loadAll();
    setSelectedTask(null);
  }

  async function handleSeedModules() {
    const result = await api.seedModules();
    await loadAll();
    return result;
  }

  if (loading) {
    return <div style={styles.centered}>Loading team…</div>;
  }

  if (!team) {
    return (
      <div style={styles.centered}>
        <p>{error || 'Team not found.'}</p>
        <Link href="/dashboard" style={styles.backLink}>← Back to Ops Board</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={styles.topBar}>
        <Link href="/dashboard" style={styles.backLink}>← Back to Ops Board</Link>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.wrap}>
        <TeamColumn
          team={team}
          tasks={tasks}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onSeedModules={handleSeedModules}
          onOpenTask={(t) => setSelectedTask(t)}
          linkToPage={false}
        />
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={team.members}
          teamName={team.displayName}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

const styles = {
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    gap: 12,
  },
  topBar: { padding: '18px 24px 0' },
  backLink: { fontSize: 13, color: 'var(--signal)', textDecoration: 'none' },
  error: { color: 'var(--status-blocked)', padding: '0 24px', fontSize: 13 },
  wrap: { padding: 24, maxWidth: 720, margin: '0 auto' },
};
