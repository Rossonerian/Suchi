import { z } from 'zod';
import { AppError, parseSchema } from '../utils/validation.js';
import { resolveMembership } from './projects.js';

const notificationQuery = z.object({ unreadOnly: z.coerce.boolean().optional().default(false), limit: z.coerce.number().int().min(1).max(100).optional().default(50) }).strict();

async function listNotifications(db, context, query = {}) {
  const { membership } = await resolveMembership(db, context);
  const parsed = parseSchema(notificationQuery, query, 'Notification query is invalid.');
  return db.notification.findMany({
    where: { organizationId: context.organizationId, userId: membership.userId, ...(parsed.unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: 'desc' },
    take: parsed.limit,
  });
}

async function markNotificationRead(db, context, notificationId) {
  const { membership } = await resolveMembership(db, context);
  const existing = await db.notification.findFirst({ where: { id: notificationId, organizationId: context.organizationId, userId: membership.userId } });
  if (!existing) throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  return db.notification.update({ where: { id: existing.id }, data: { readAt: new Date() } });
}

export { notificationQuery, listNotifications, markNotificationRead };
