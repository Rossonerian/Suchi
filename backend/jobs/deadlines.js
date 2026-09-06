const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SOON_MS = 7 * ONE_DAY_MS;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildDeadlineNotifications(tasks, now = new Date()) {
  return tasks.flatMap((task) => {
    if (!task.dueAt || ['done', 'cancelled'].includes(task.status)) return [];
    const dueAt = new Date(task.dueAt);
    const delta = dueAt.getTime() - now.getTime();
    const overdue = delta < 0;
    if (!overdue && delta > DUE_SOON_MS) return [];
    const type = overdue ? 'task_overdue' : 'task_due_soon';
    return (task.assignees || []).map((assignee) => ({
      organizationId: task.organizationId,
      userId: assignee.membership?.userId || assignee.userId,
      type,
      title: overdue ? 'Task overdue' : 'Task due soon',
      body: task.title,
      resourceType: 'task',
      resourceId: task.id,
      dedupeKey: `${task.id}:${overdue ? 'overdue' : 'due'}:${dateKey(dueAt)}`,
    })).filter((notification) => notification.userId);
  });
}

async function runDeadlineSweep(db, now = new Date()) {
  const tasks = await db.task.findMany({
    where: { dueAt: { not: null }, status: { notIn: ['done', 'cancelled'] } },
    include: { assignees: { include: { membership: true } } },
  });
  const notifications = buildDeadlineNotifications(tasks, now);
  if (notifications.length) await db.notification.createMany({ data: notifications, skipDuplicates: true });
  return { scanned: tasks.length, generated: notifications.length };
}

module.exports = { buildDeadlineNotifications, runDeadlineSweep };
