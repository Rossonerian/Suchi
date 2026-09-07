// Single responsibility: full-detail panel for one task, opened by clicking
// its title in any team column. Same update/delete actions as the inline
// row, just with room to see and edit everything at once.
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
];

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function TaskDetailModal({ task, members, teamName, onUpdate, onDelete, onClose }) {
  const [description, setDescription] = useState(task.description || '');

  // Keep the textarea in sync if the underlying task changes (e.g. after
  // a status update triggers a reload while this modal is still open).
  useEffect(() => {
    setDescription(task.description || '');
  }, [task._id, task.description]);

  function handleDescriptionBlur() {
    if (description !== (task.description || '')) {
      onUpdate(task._id, { description });
    }
  }

  function handleDelete() {
    onDelete(task._id);
    onClose();
  }

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto" aria-describedby="task-detail-description">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription id="task-detail-description">Review and update this task without losing your place in the work list.</DialogDescription>
        </DialogHeader>
        <div style={styles.topRow}>
          <span style={styles.teamTag}>{teamName}</span>
          {task.subProblemRef && (
            <span style={styles.subRef}>SP-{String(task.subProblemRef).padStart(2, '0')}</span>
          )}
          <button
            type="button"
            className={`highlight-toggle ${task.highlighted ? 'highlight-toggle--on' : ''}`}
            style={styles.modalHighlightBtn}
            onClick={() => onUpdate(task._id, { highlighted: !task.highlighted })}
            title={task.highlighted ? 'Remove highlight' : 'Highlight this task'}
            aria-label={task.highlighted ? 'Remove task highlight' : 'Highlight task'}
          >
            {task.highlighted ? '★' : '☆'}
          </button>
          <button type="button" style={styles.closeBtn} onClick={onClose} title="Close" aria-label="Close task details">✕</button>
        </div>

        <label style={styles.label} htmlFor="task-detail-description-input">Description</label>
        <textarea
          id="task-detail-description-input"
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          rows={5}
          placeholder="Add more detail about this task…"
        />

        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="task-detail-status">Status</label>
            <select
              id="task-detail-status"
              style={styles.input}
              value={task.status}
              onChange={(e) => onUpdate(task._id, { status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="task-detail-assignee">Assignee</label>
            <select
              id="task-detail-assignee"
              style={styles.input}
              value={task.assignee?._id || task.assignee || ''}
              onChange={(e) => onUpdate(task._id, { assignee: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.metaRow}>
          {task.createdBy?.name && <span>Created by {task.createdBy.name}</span>}
          {formatDate(task.createdAt) && <span>Created {formatDate(task.createdAt)}</span>}
          {formatDate(task.updatedAt) && <span>Updated {formatDate(task.updatedAt)}</span>}
        </div>

        <button type="button" style={styles.deleteBtn} onClick={() => { if (window.confirm(`Delete “${task.title}”?`)) handleDelete(); }}>Delete task</button>
      </DialogContent>
    </Dialog>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  panel: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflowY: 'auto',
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    padding: 22,
  },
  panelHighlighted: {
    borderColor: 'var(--highlight)',
    boxShadow: '0 0 0 1px var(--highlight-glow)',
  },
  topRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  teamTag: { fontSize: 11, color: 'var(--signal)', fontWeight: 600 },
  subRef: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--accent)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 3,
    padding: '1px 6px',
  },
  closeBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 15,
    padding: 4,
  },
  modalHighlightBtn: {
    marginLeft: 'auto',
    fontSize: 18,
  },
  title: { fontSize: 18, fontWeight: 700, margin: '0 0 16px' },
  label: { display: 'block', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 },
  textarea: {
    width: '100%',
    background: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 4,
    padding: '9px 10px',
    color: 'var(--text)',
    fontSize: 13,
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: 14,
  },
  fieldRow: { display: 'flex', gap: 12, marginBottom: 16 },
  field: { flex: 1 },
  input: {
    width: '100%',
    background: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 4,
    padding: '8px 10px',
    color: 'var(--text)',
    fontSize: 13,
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 18,
    paddingTop: 12,
    borderTop: '1px solid var(--line)',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid var(--status-blocked)',
    color: 'var(--status-blocked)',
    borderRadius: 4,
    padding: '8px 14px',
    fontSize: 12,
  },
};
