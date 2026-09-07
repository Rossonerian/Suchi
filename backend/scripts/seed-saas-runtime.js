/*
 * Seed a small, deterministic SaaS dataset for authenticated local/runtime
 * verification. This command is intentionally opt-in and refuses every
 * non-loopback database URL. It never creates Clerk users or organizations;
 * all identifiers must be supplied from an already-configured Clerk
 * development instance.
 */
import 'dotenv/config';

import net from 'node:net';
import { getSaasDatabase } from '../saas/database.js';

const RUNTIME_PROVIDER = 'nidar-runtime';
const REQUIRED_IDS = [
  ['SAAS_RUNTIME_USER_A_CLERK_ID', 'userA'],
  ['SAAS_RUNTIME_USER_B_CLERK_ID', 'userB'],
  ['SAAS_RUNTIME_ALPHA_ORG_CLERK_ID', 'alpha'],
  ['SAAS_RUNTIME_BETA_ORG_CLERK_ID', 'beta'],
];

function isLoopbackDatabaseUrl(value) {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost') return true;
    if (net.isIP(host) === 4) return host.split('.').length === 4 && host.split('.')[0] === '127';
    return net.isIP(host) === 6 && host === '::1';
  } catch {
    return false;
  }
}

function validateRuntimeSeedConfig(env = process.env) {
  if (env.SAAS_RUNTIME_SEED !== '1') {
    throw new Error('Refusing runtime seed: set SAAS_RUNTIME_SEED=1 for explicit local opt-in.');
  }
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for the runtime seed.');
  if (!isLoopbackDatabaseUrl(env.DATABASE_URL)) {
    throw new Error('Refusing runtime seed: DATABASE_URL must point to a loopback PostgreSQL instance.');
  }

  const clerk = {};
  for (const [variable, key] of REQUIRED_IDS) {
    if (!String(env[variable] || '').trim()) throw new Error(`${variable} is required and must be a real Clerk identifier.`);
    clerk[key] = String(env[variable]).trim();
  }
  if (new Set(Object.values(clerk)).size !== Object.values(clerk).length) {
    throw new Error('Runtime seed Clerk identifiers must be distinct.');
  }
  return { databaseUrl: env.DATABASE_URL, clerk };
}

function addDays(date, days, hour = 17) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, hour, 0, 0, 0));
  return result;
}

function buildRuntimeSeedPlan(config, now = new Date()) {
  const { clerk } = config;
  const today = addDays(now, 0);
  const users = [
    { key: 'userA', clerkUserId: clerk.userA, displayName: 'Runtime User A', email: 'runtime-user-a@example.invalid' },
    { key: 'userB', clerkUserId: clerk.userB, displayName: 'Runtime User B', email: 'runtime-user-b@example.invalid' },
  ];
  const organizations = [
    { key: 'alpha', clerkOrgId: clerk.alpha, name: 'Alpha Runtime', slug: 'alpha-runtime', timezone: 'Asia/Kolkata' },
    { key: 'beta', clerkOrgId: clerk.beta, name: 'Beta Runtime', slug: 'beta-runtime', timezone: 'America/New_York' },
  ];
  const memberships = [
    { key: 'alpha-userA', organizationKey: 'alpha', userKey: 'userA', role: 'owner' },
    // User A belongs to both workspaces so the authenticated shell can test switching.
    { key: 'beta-userA', organizationKey: 'beta', userKey: 'userA', role: 'owner' },
    // User B is intentionally confined to Beta for cross-tenant denial checks.
    { key: 'beta-userB', organizationKey: 'beta', userKey: 'userB', role: 'member' },
  ];
  const projects = [
    { key: 'alpha-operations', organizationKey: 'alpha', slug: 'alpha-operations', name: 'Alpha Operations', description: 'Synthetic project for populated workspace verification.', ownerKey: 'userA', targetDate: addDays(now, 21) },
    { key: 'alpha-empty', organizationKey: 'alpha', slug: 'alpha-empty', name: 'Alpha Empty Project', description: 'Synthetic project with no tasks for empty-state verification.', ownerKey: 'userA', targetDate: null },
    { key: 'beta-operations', organizationKey: 'beta', slug: 'beta-operations', name: 'Beta Operations', description: 'Synthetic project for tenant isolation verification.', ownerKey: 'userA', targetDate: addDays(now, 28) },
  ];
  const tasks = [
    { key: 'alpha-overdue', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha overdue task', description: 'Synthetic overdue work.', status: 'todo', priority: 'high', dueAt: addDays(now, -1), assigneeKey: 'alpha-userA' },
    { key: 'alpha-today', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha due today', description: 'Synthetic due-today work.', status: 'in_progress', priority: 'urgent', dueAt: today, assigneeKey: 'alpha-userA' },
    { key: 'alpha-upcoming', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha upcoming task', description: 'Synthetic upcoming work.', status: 'todo', priority: 'medium', dueAt: addDays(now, 5), assigneeKey: 'alpha-userA' },
    { key: 'alpha-blocked', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha blocked task', description: 'Synthetic blocked work.', status: 'blocked', priority: 'high', dueAt: addDays(now, 2), assigneeKey: 'alpha-userA' },
    { key: 'alpha-completed', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha completed task', description: 'Synthetic completed work.', status: 'done', priority: 'low', dueAt: addDays(now, -2), completedAt: addDays(now, -2), assigneeKey: 'alpha-userA' },
    { key: 'alpha-long-title', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha task with a deliberately long title for responsive and keyboard verification', description: 'Synthetic long-content work.', status: 'todo', priority: 'none', dueAt: null, assigneeKey: 'alpha-userA' },
    { key: 'beta-isolated', organizationKey: 'beta', projectKey: 'beta-operations', title: 'Beta isolated task', description: 'Synthetic task that must never appear in Alpha.', status: 'todo', priority: 'urgent', dueAt: addDays(now, 4), assigneeKey: 'beta-userB' },
  ];
  const meetings = [
    { key: 'alpha-planning', organizationKey: 'alpha', projectKey: 'alpha-operations', externalEventId: 'runtime-alpha-planning', title: 'Alpha planning meeting', description: 'Synthetic meeting with internal and external attendees.', startAt: addDays(now, 7, 15), endAt: addDays(now, 7, 16), timezone: 'Asia/Kolkata', creatorKey: 'userA', attendees: [{ membershipKey: 'alpha-userA', email: users[0].email }, { membershipKey: null, email: 'external-alpha@example.invalid' }] },
    { key: 'beta-planning', organizationKey: 'beta', projectKey: 'beta-operations', externalEventId: 'runtime-beta-planning', title: 'Beta planning meeting', description: 'Synthetic Beta meeting.', startAt: addDays(now, 8, 14), endAt: addDays(now, 8, 15), timezone: 'America/New_York', creatorKey: 'userA', attendees: [{ membershipKey: 'beta-userA', email: users[0].email }, { membershipKey: 'beta-userB', email: users[1].email }] },
  ];
  const notifications = [
    { key: 'alpha-overdue', organizationKey: 'alpha', userKey: 'userA', type: 'task_overdue', title: 'Alpha task is overdue', body: 'Alpha overdue task needs attention.', resourceType: 'task', resourceKey: 'alpha-overdue' },
    { key: 'beta-isolated', organizationKey: 'beta', userKey: 'userA', type: 'task_assigned', title: 'Beta task assigned', body: 'Beta isolated task is ready for review.', resourceType: 'task', resourceKey: 'beta-isolated' },
  ];
  return { users, organizations, memberships, projects, tasks, meetings, notifications };
}

function mappingWhere(organizationId, resourceType, localId) {
  return { organizationId_resourceType_localId_provider: { organizationId, resourceType, localId, provider: RUNTIME_PROVIDER } };
}

async function upsertMappedTask(tx, fixture, organizationId, projectId, creatorId, membershipIds) {
  const where = mappingWhere(organizationId, 'runtime-task', fixture.key);
  const existingMapping = await tx.externalResourceMapping.findUnique({ where });
  let task = existingMapping ? await tx.task.findUnique({ where: { id: existingMapping.externalId } }) : null;
  const data = { organizationId, projectId, creatorId, title: fixture.title, description: fixture.description, status: fixture.status, priority: fixture.priority, dueAt: fixture.dueAt, completedAt: fixture.completedAt || null };
  task = task
    ? await tx.task.update({ where: { id: task.id }, data })
    : await tx.task.create({ data });
  if (existingMapping) await tx.externalResourceMapping.update({ where: { id: existingMapping.id }, data: { externalId: task.id } });
  else await tx.externalResourceMapping.create({ data: { organizationId, provider: RUNTIME_PROVIDER, resourceType: 'runtime-task', localId: fixture.key, externalId: task.id } });
  await tx.taskAssignee.deleteMany({ where: { taskId: task.id } });
  if (membershipIds.length) await tx.taskAssignee.createMany({ data: membershipIds.map((membershipId) => ({ taskId: task.id, membershipId })), skipDuplicates: true });
  return task;
}

async function seedRuntimeData(db, config, now = new Date()) {
  const plan = buildRuntimeSeedPlan(config, now);
  const counts = await db.$transaction(async (tx) => {
    const userIds = new Map();
    for (const user of plan.users) {
      const saved = await tx.userProfile.upsert({ where: { clerkUserId: user.clerkUserId }, create: { clerkUserId: user.clerkUserId, displayName: user.displayName, email: user.email }, update: { displayName: user.displayName, email: user.email } });
      userIds.set(user.key, saved.id);
    }
    const organizationIds = new Map();
    for (const organization of plan.organizations) {
      const saved = await tx.organization.upsert({ where: { clerkOrgId: organization.clerkOrgId }, create: { clerkOrgId: organization.clerkOrgId, name: organization.name, slug: organization.slug }, update: { name: organization.name, slug: organization.slug } });
      organizationIds.set(organization.key, saved.id);
      await tx.organizationSettings.upsert({ where: { organizationId: saved.id }, create: { organizationId: saved.id, timezone: organization.timezone }, update: { timezone: organization.timezone } });
    }
    const membershipIds = new Map();
    for (const membership of plan.memberships) {
      const saved = await tx.organizationMembership.upsert({ where: { organizationId_userId: { organizationId: organizationIds.get(membership.organizationKey), userId: userIds.get(membership.userKey) } }, create: { organizationId: organizationIds.get(membership.organizationKey), userId: userIds.get(membership.userKey), role: membership.role }, update: { role: membership.role } });
      membershipIds.set(membership.key, saved.id);
    }
    const projectIds = new Map();
    for (const project of plan.projects) {
      const saved = await tx.project.upsert({ where: { organizationId_slug: { organizationId: organizationIds.get(project.organizationKey), slug: project.slug } }, create: { organizationId: organizationIds.get(project.organizationKey), slug: project.slug, name: project.name, description: project.description, ownerId: userIds.get(project.ownerKey), targetDate: project.targetDate }, update: { name: project.name, description: project.description, ownerId: userIds.get(project.ownerKey), targetDate: project.targetDate, archivedAt: null } });
      projectIds.set(project.key, saved.id);
      const ownerMembership = plan.memberships.find((item) => item.organizationKey === project.organizationKey && item.userKey === project.ownerKey);
      if (ownerMembership) await tx.projectMember.upsert({ where: { projectId_membershipId: { projectId: saved.id, membershipId: membershipIds.get(ownerMembership.key) } }, create: { projectId: saved.id, membershipId: membershipIds.get(ownerMembership.key), role: 'owner' }, update: { role: 'owner' } });
    }
    const taskIds = new Map();
    for (const task of plan.tasks) {
      const assignee = task.assigneeKey ? membershipIds.get(task.assigneeKey) : null;
      const saved = await upsertMappedTask(tx, task, organizationIds.get(task.organizationKey), projectIds.get(task.projectKey), userIds.get('userA'), assignee ? [assignee] : []);
      taskIds.set(task.key, saved.id);
    }
    for (const meeting of plan.meetings) {
      const saved = await tx.meeting.upsert({ where: { organizationId_provider_externalEventId: { organizationId: organizationIds.get(meeting.organizationKey), provider: RUNTIME_PROVIDER, externalEventId: meeting.externalEventId } }, create: { organizationId: organizationIds.get(meeting.organizationKey), projectId: projectIds.get(meeting.projectKey), creatorId: userIds.get(meeting.creatorKey), title: meeting.title, description: meeting.description, startAt: meeting.startAt, endAt: meeting.endAt, timezone: meeting.timezone, provider: RUNTIME_PROVIDER, externalEventId: meeting.externalEventId }, update: { projectId: projectIds.get(meeting.projectKey), creatorId: userIds.get(meeting.creatorKey), title: meeting.title, description: meeting.description, startAt: meeting.startAt, endAt: meeting.endAt, timezone: meeting.timezone, status: 'scheduled', cancelledAt: null } });
      await tx.meetingAttendee.deleteMany({ where: { meetingId: saved.id } });
      await tx.meetingAttendee.createMany({ data: meeting.attendees.map((attendee) => ({ meetingId: saved.id, membershipId: attendee.membershipKey ? membershipIds.get(attendee.membershipKey) : null, email: attendee.email })) });
    }
    for (const notification of plan.notifications) {
      await tx.notification.upsert({ where: { dedupeKey: `${RUNTIME_PROVIDER}:${notification.key}` }, create: { organizationId: organizationIds.get(notification.organizationKey), userId: userIds.get(notification.userKey), type: notification.type, title: notification.title, body: notification.body, resourceType: notification.resourceType, resourceId: taskIds.get(notification.resourceKey), dedupeKey: `${RUNTIME_PROVIDER}:${notification.key}` }, update: { organizationId: organizationIds.get(notification.organizationKey), userId: userIds.get(notification.userKey), type: notification.type, title: notification.title, body: notification.body, resourceType: notification.resourceType, resourceId: taskIds.get(notification.resourceKey) } });
    }
    return { users: plan.users.length, organizations: plan.organizations.length, memberships: plan.memberships.length, projects: plan.projects.length, tasks: plan.tasks.length, meetings: plan.meetings.length, notifications: plan.notifications.length };
  });
  return { counts, idempotent: true };
}

async function run({ env = process.env, databaseFactory = getSaasDatabase } = {}) {
  const config = validateRuntimeSeedConfig(env);
  const db = databaseFactory(config.databaseUrl);
  try {
    return { mode: 'runtime-seed', ...(await seedRuntimeData(db, config)) };
  } finally {
    await db.$disconnect?.();
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  run().then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(`[seed-saas-runtime] ${error.message}`);
    process.exitCode = 1;
  });
}

export { buildRuntimeSeedPlan, isLoopbackDatabaseUrl, seedRuntimeData, run, validateRuntimeSeedConfig };
