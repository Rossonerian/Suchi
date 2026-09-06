// Single responsibility: the signed-in member's own profile — edit email
// and role, see every task assigned to them across teams.
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../lib/api';
import TaskItem from '../components/TaskItem';
import TaskDetailModal from '../components/TaskDetailModal';

export default function Profile() {
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async (m) => {
    const [assignedTasks, teams] = await Promise.all([
      api.getTasksForMember(m._id),
      api.getTeams(),
    ]);
    setTasks(assignedTasks);
    const myTeam = teams.find((t) => t._id === (m.team?._id || m.team));
    setTeamMembers(myTeam?.members || []);
  }, []);

  useEffect(() => {
    api.getCurrentMember().then((data) => {
      const m = data.member || data;
      setMember(m);
      setEmail(m.email || '');
      setRole(m.role || '');
      return loadTasks(m);
    }).catch(() => router.replace('/')).finally(() => setLoading(false));
  }, [router, loadTasks]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const updated = await api.updateMember(member._id, { email: email.trim() });
      const merged = { ...member, email: updated.email, role: updated.role };
      setMember(merged);
      setSaveStatus({ ok: true, message: 'Profile updated.' });
    } catch (err) {
      setSaveStatus({ ok: false, message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTask(taskId, updates) {
    await api.updateTask(taskId, updates);
    const fresh = await api.getTasksForMember(member._id);
    setTasks(fresh);
    if (selectedTask?._id === taskId) {
      setSelectedTask(fresh.find((t) => t._id === taskId) || null);
    }
  }

  async function handleDeleteTask(taskId) {
    await api.deleteTask(taskId);
    const fresh = await api.getTasksForMember(member._id);
    setTasks(fresh);
    setSelectedTask(null);
  }

  if (loading || !member) {
    return <div style={styles.centered}>Loading profile…</div>;
  }

  return (
    <div style={styles.page}>
      <Link href="/dashboard" style={styles.backLink}>← Back to ops board</Link>

      <h1 style={styles.title}>{member.name}</h1>
      <p style={styles.teamLine}>{member.team?.displayName}</p>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Edit profile</h2>
        <form onSubmit={handleSave} style={styles.form}>
          <label style={styles.label}>Name</label>
          <input style={{ ...styles.input, opacity: 0.6 }} value={member.name} disabled />

          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={styles.label}>Role</label>
          <input
            style={styles.input}
            value={role}
            disabled
          />

          <button style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>

          {saveStatus && (
            <p style={{ ...styles.status, color: saveStatus.ok ? 'var(--done)' : 'var(--status-blocked)' }}>
              {saveStatus.message}
            </p>
          )}
        </form>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Assigned to me ({tasks.length})</h2>
        {tasks.length === 0 && <p style={styles.empty}>No tasks assigned to you yet.</p>}
        {tasks.map((task) => (
          <TaskItem
            key={task._id}
            task={task}
            members={teamMembers}
            onUpdate={handleUpdateTask}
            onDelete={handleDeleteTask}
            onOpenDetail={setSelectedTask}
          />
        ))}
      </section>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          members={teamMembers}
          teamName={member.team?.displayName || ''}
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
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  page: { maxWidth: 640, margin: '0 auto', padding: '24px 24px 60px' },
  backLink: { fontSize: 13, color: 'var(--signal)', textDecoration: 'none' },
  title: { fontSize: 26, fontWeight: 700, margin: '16px 0 2px' },
  teamLine: { fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' },
  panel: {
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { margin: '0 0 14px', fontSize: 16, fontWeight: 600 },
  form: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: 'var(--text-muted)', marginTop: 8 },
  input: {
    background: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 4,
    padding: '9px 10px',
    color: 'var(--text)',
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    background: 'var(--accent)',
    color: '#171006',
    border: 'none',
    borderRadius: 4,
    padding: '9px 16px',
    fontWeight: 600,
    fontSize: 13,
  },
  status: { fontSize: 13, margin: 0 },
  empty: { fontSize: 13, color: 'var(--text-muted)' },
};
