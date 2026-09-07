export type NotificationResource = {
  organizationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
};

/**
 * Convert a server notification resource into an in-app destination. Keeping
 * this mapping pure makes push/deep-link behavior testable without a device.
 */
export function notificationDestination(notification: NotificationResource): string | null {
  if (!notification.resourceType || !notification.resourceId) return null;
  const id = encodeURIComponent(notification.resourceId);
  if (notification.resourceType === 'task') return `/tasks/${id}`;
  if (notification.resourceType === 'project') return `/tasks?projectId=${id}`;
  if (notification.resourceType === 'meeting') return `/meetings?meetingId=${id}`;
  return null;
}
