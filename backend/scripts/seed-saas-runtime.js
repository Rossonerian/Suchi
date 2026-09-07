/*
 * Seed a small, deterministic SaaS dataset for authenticated local/runtime
 * verification. This command is intentionally opt-in and refuses every
 * non-loopback database URL. Users and organizations are created through
 * Better Auth's supported server APIs; passwords and sessions are never fabricated.
 */
import 'dotenv/config';

import net from 'node:net';
import { getSaasDatabase } from '../saas/database.js';
import { createAuth } from '../saas/auth.js';

const RUNTIME_PROVIDER = 'nidar-runtime';

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

  if (!['development', 'test'].includes(env.NODE_ENV)) throw new Error('Refusing runtime seed outside development/test (including production).');
  if (env.AUTH_EMAIL_PASSWORD_ENABLED !== '1') throw new Error('AUTH_EMAIL_PASSWORD_ENABLED=1 is required for runtime authentication.');
  if (String(env.SAAS_RUNTIME_PASSWORD || '').length < 12) throw new Error('SAAS_RUNTIME_PASSWORD must contain at least 12 characters.');
  return { databaseUrl: env.DATABASE_URL, password: env.SAAS_RUNTIME_PASSWORD };
}

function addDays(date, days, hour = 17) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days, hour, 0, 0, 0));
  return result;
}

function buildRuntimeSeedPlan(config, now = new Date()) {
  const today = addDays(now, 0);
  const users = [
    { key: 'userA', displayName: 'Runtime User A', email: 'runtime-user-a@example.invalid' },
    { key: 'userB', displayName: 'Runtime User B', email: 'runtime-user-b@example.invalid' },
  ];
  const organizations = [
    { key: 'alpha', name: 'Workspace Alpha', slug: 'alpha-runtime', timezone: 'Asia/Kolkata' },
    { key: 'beta', name: 'Workspace Beta', slug: 'beta-runtime', timezone: 'America/New_York' },
  ];
  const memberships = [
    { key: 'alpha-userA', organizationKey: 'alpha', userKey: 'userA', role: 'owner' },
    // User A belongs to both workspaces so the authenticated shell can test switching.
    { key: 'beta-userA', organizationKey: 'beta', userKey: 'userA', role: 'owner' },
    // User B is intentionally confined to Beta for cross-tenant denial checks.
    { key: 'beta-userB', organizationKey: 'beta', userKey: 'userB', role: 'member' },
  ];
  const projects = [
    { key: 'alpha-operations', organizationKey: 'alpha', slug: 'alpha-operations', name: 'Alpha Launch', description: 'Synthetic project for populated workspace verification.', ownerKey: 'userA', targetDate: addDays(now, 21) },
    { key: 'alpha-empty', organizationKey: 'alpha', slug: 'alpha-empty', name: 'Alpha Empty Project', description: 'Synthetic project with no tasks for empty-state verification.', ownerKey: 'userA', targetDate: null },
    { key: 'beta-operations', organizationKey: 'beta', slug: 'beta-operations', name: 'Beta Migration', description: 'Synthetic project for tenant isolation verification.', ownerKey: 'userA', targetDate: addDays(now, 28) },
  ];
  const tasks = [
    { key: 'alpha-overdue', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha overdue task', description: 'Synthetic overdue work.', status: 'todo', priority: 'high', dueAt: addDays(now, -1), assigneeKey: 'alpha-userA' },
    { key: 'alpha-today', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha due today', description: 'Synthetic due-today work.', status: 'in_progress', priority: 'urgent', dueAt: today, assigneeKey: 'alpha-userA' },
    { key: 'alpha-upcoming', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha upcoming task', description: 'Synthetic upcoming work.', status: 'todo', priority: 'medium', dueAt: addDays(now, 5), assigneeKey: 'alpha-userA' },
    { key: 'alpha-blocked', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha blocked task', description: 'Synthetic blocked work.', status: 'blocked', priority: 'high', dueAt: addDays(now, 2), assigneeKey: 'alpha-userA' },
    { key: 'alpha-completed', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha completed task', description: 'Synthetic completed work.', status: 'done', priority: 'low', dueAt: addDays(now, -2), completedAt: addDays(now, -2), assigneeKey: 'alpha-userA' },
    { key: 'alpha-long-title', organizationKey: 'alpha', projectKey: 'alpha-operations', title: 'Alpha task with a deliberately long title for responsive and keyboard verification', description: 'Synthetic long-content work.', status: 'todo', priority: 'none', dueAt: null, assigneeKey: 'alpha-userA' },
    { key: 'beta-isolated', organizationKey: 'beta', projectKey: 'beta-operations', title: 'Beta task X', description: 'Synthetic task that must never appear in Alpha.', status: 'todo', priority: 'urgent', dueAt: addDays(now, 4), assigneeKey: 'beta-userB' },
    { key: 'beta-upcoming', organizationKey: 'beta', projectKey: 'beta-operations', title: 'Beta task Y', description: 'Synthetic Beta follow-up.', status: 'todo', priority: 'medium', dueAt: addDays(now, 6), assigneeKey: 'beta-userA' },
  ];
  const meetings = [
    { key: 'alpha-planning', organizationKey: 'alpha', projectKey: 'alpha-operations', externalEventId: 'runtime-alpha-planning', title: 'Alpha Weekly Planning', description: 'Synthetic meeting with internal and external attendees.', startAt: addDays(now, 7, 15), endAt: addDays(now, 7, 16), timezone: 'Asia/Kolkata', creatorKey: 'userA', attendees: [{ membershipKey: 'alpha-userA', email: users[0].email }, { membershipKey: null, email: 'external-alpha@example.invalid' }] },
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
      const saved = await tx.userProfile.findUniqueOrThrow({ where: { email: user.email } });
      userIds.set(user.key, saved.id);
    }
    const organizationIds = new Map();
    for (const organization of plan.organizations) {
      const saved = await tx.organization.findUniqueOrThrow({ where: { slug: organization.slug } });
      organizationIds.set(organization.key, saved.id);
      await tx.organizationSettings.upsert({ where: { organizationId: saved.id }, create: { organizationId: saved.id, timezone: organization.timezone }, update: { timezone: organization.timezone } });
    }
    const membershipIds = new Map();
    for (const membership of plan.memberships) {
      const saved = await tx.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: organizationIds.get(membership.organizationKey), userId: userIds.get(membership.userKey) } } });
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

async function ensureRuntimeIdentities(db, auth, config) {
  const plan = buildRuntimeSeedPlan(config);
  const users = new Map();
  for (const fixture of plan.users) {
    let user = await db.userProfile.findUnique({ where: { email: fixture.email } });
    if (!user) user = (await auth.api.signUpEmail({ body: { name: fixture.displayName, email: fixture.email, password: config.password } })).user;
    // A rerun must verify existing fixture credentials, not overwrite accounts.
    await auth.api.signInEmail({ body: { email: fixture.email, password: config.password } });
    users.set(fixture.key, user.id);
  }
  for (const fixture of plan.organizations) {
    let org = await db.organization.findUnique({ where: { slug: fixture.slug } });
    if (!org) org = await auth.api.createOrganization({ body: { userId: users.get('userA'), name: fixture.name, slug: fixture.slug } });
    for (const member of plan.memberships.filter(item => item.organizationKey === fixture.key)) {
      const userId = users.get(member.userKey);
      const existing = await db.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: org.id, userId } } });
      if (!existing) await auth.api.addMember({ body: { userId, organizationId: org.id, role: member.role } });
      else if (existing.role !== member.role) throw new Error('Existing runtime membership role differs; refusing to overwrite it.');
    }
  }
}

async function run({ env = process.env, databaseFactory = getSaasDatabase } = {}) {
  const config = validateRuntimeSeedConfig(env);
  const db = databaseFactory(config.databaseUrl);
  try {
    await ensureRuntimeIdentities(db, createAuth(db, env), config);
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

export { buildRuntimeSeedPlan, isLoopbackDatabaseUrl, seedRuntimeData, ensureRuntimeIdentities, run, validateRuntimeSeedConfig };
