/*
 * Migrate the legacy NIDAR Mongo collections into the PostgreSQL SaaS schema.
 *
 * Safety defaults: this command is a dry run unless --apply is supplied, and
 * an apply additionally requires ALLOW_SAAS_MIGRATION=1. It never creates a
 * database or changes production data by itself.
 */
require('dotenv').config();
const fs = require('node:fs');
const mongoose = require('mongoose');
const Member = require('../models/Member');
const Team = require('../models/Team');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const Meeting = require('../models/Meeting');
const { getSaasDatabase } = require('../saas/database');

const PROVIDER = 'nidar-mongo';

function refId(value) {
  return value?._id ? String(value._id) : value == null ? '' : String(value);
}

function mapTaskStatus(status) {
  return ({ todo: 'todo', 'in-progress': 'in_progress', blocked: 'blocked', done: 'done' })[status] || 'backlog';
}

function parseArgs(argv) {
  const apply = argv.includes('--apply');
  const reportIndex = argv.indexOf('--report');
  return {
    apply,
    dryRun: !apply,
    reportPath: reportIndex >= 0 ? argv[reportIndex + 1] || null : null,
  };
}

function buildMigrationPlan({ organizationId, teams, members, tasks, plans, meetings }) {
  if (!organizationId) throw new Error('organizationId is required.');
  const teamProjects = Object.fromEntries(teams.map((team) => [refId(team), {
    slug: `legacy-${String(team.key || team.displayName || refId(team)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    name: `${team.displayName || team.key || 'NIDAR'} legacy work`,
    teamKey: team.key || null,
  }]));
  const teamIds = new Set(Object.keys(teamProjects));
  const memberIds = new Set(members.map((member) => refId(member)));
  const plannedTasks = tasks.map((task) => ({
    legacyId: refId(task),
    title: task.title,
    status: mapTaskStatus(task.status),
    projectSlug: teamProjects[refId(task.team)]?.slug || null,
    creatorLegacyId: memberIds.has(refId(task.createdBy)) ? refId(task.createdBy) : null,
    assigneeLegacyIds: memberIds.has(refId(task.assignee)) ? [refId(task.assignee)] : [],
  }));
  const exceptions = [
    'Legacy plans have no direct SaaS entity; plans become activity events with content metadata.',
    'Legacy tasks without a known team are assigned to the fallback legacy project and flagged for review.',
    'Password hashes are not migrated into Clerk; legacy users receive a reactivation path after identity setup.',
  ];
  return {
    organizationId,
    counts: { teams: teams.length, members: members.length, tasks: tasks.length, plans: plans.length, meetings: meetings.length },
    teamProjects,
    members: members.map((member) => ({ legacyId: refId(member), email: member.email || null, role: member.role === 'admin' ? 'admin' : 'member' })),
    tasks: plannedTasks,
    plans: plans.map((plan) => ({ legacyId: refId(plan), teamLegacyId: refId(plan.team), title: plan.title, forDate: plan.forDate || null })),
    meetings: meetings.map((meeting) => ({ legacyId: refId(meeting), title: meeting.title, organizerLegacyId: refId(meeting.organizer), inviteeLegacyIds: (meeting.invitees || []).map(refId), scheduledAt: meeting.scheduledAt || null })),
    exceptions: [...new Set([
      ...exceptions,
      ...tasks.filter((task) => !teamIds.has(refId(task.team))).map(() => 'A task references a missing legacy team.'),
    ])],
  };
}

function report(output, reportPath) {
  const serialized = JSON.stringify(output, null, 2);
  if (reportPath) fs.writeFileSync(reportPath, `${serialized}\n`, { encoding: 'utf8', flag: 'wx' });
  console.log(serialized);
}

async function loadLegacyDocuments() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for the migration source.');
  await mongoose.connect(process.env.MONGODB_URI);
  const [teams, members, tasks, plans, meetings] = await Promise.all([
    Team.find().lean(), Member.find().select('+passwordHash').lean(), Task.find().lean(), Plan.find().lean(), Meeting.find().lean(),
  ]);
  return { teams, members, tasks, plans, meetings };
}

async function findMapping(tx, organizationId, resourceType, localId) {
  return tx.externalResourceMapping.findUnique({ where: {
    organizationId_resourceType_localId_provider: { organizationId, resourceType, localId, provider: PROVIDER },
  } });
}

async function createMapping(tx, organizationId, resourceType, localId, externalId) {
  return tx.externalResourceMapping.create({ data: { organizationId, resourceType, localId, externalId, provider: PROVIDER } });
}

async function applyMigration(raw, plan) {
  if (process.env.ALLOW_SAAS_MIGRATION !== '1') {
    throw new Error('Refusing to apply without ALLOW_SAAS_MIGRATION=1.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for --apply.');
  const db = getSaasDatabase();
  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({ where: { id: plan.organizationId } });
    if (!organization) throw new Error('Target organization was not found.');
    const teamMap = new Map();
    for (const team of raw.teams) {
      const target = await tx.team.upsert({
        where: { organizationId_slug: { organizationId: plan.organizationId, slug: plan.teamProjects[refId(team)]?.slug || `legacy-${refId(team)}` } },
        create: { organizationId: plan.organizationId, name: team.displayName || team.key || 'Legacy team', slug: plan.teamProjects[refId(team)]?.slug || `legacy-${refId(team)}` },
        update: { name: team.displayName || team.key || 'Legacy team' },
      });
      teamMap.set(refId(team), target.id);
      if (!await findMapping(tx, plan.organizationId, 'team', refId(team))) await createMapping(tx, plan.organizationId, 'team', refId(team), target.id);
    }

    const userMap = new Map();
    const membershipMap = new Map();
    for (const member of raw.members) {
      const legacyId = refId(member);
      const user = await tx.userProfile.upsert({
        where: { clerkUserId: `legacy:${legacyId}` },
        create: { clerkUserId: `legacy:${legacyId}`, displayName: member.name, email: member.email || null },
        update: { displayName: member.name, email: member.email || null },
      });
      const membership = await tx.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: plan.organizationId, userId: user.id } },
        create: { organizationId: plan.organizationId, userId: user.id, role: member.role === 'admin' ? 'admin' : 'member' },
        update: { role: member.role === 'admin' ? 'admin' : 'member' },
      });
      userMap.set(legacyId, user.id);
      membershipMap.set(legacyId, membership.id);
      if (!await findMapping(tx, plan.organizationId, 'member', legacyId)) await createMapping(tx, plan.organizationId, 'member', legacyId, user.id);
    }

    const ownerId = userMap.get(raw.members.find((member) => member.role === 'admin')?._id?.toString()) || [...userMap.values()][0];
    if (!ownerId) throw new Error('Cannot migrate without at least one legacy member.');
    const projectMap = new Map();
    for (const team of raw.teams) {
      const projectData = plan.teamProjects[refId(team)] || { slug: `legacy-${refId(team)}`, name: 'Legacy NIDAR work' };
      const project = await tx.project.upsert({
        where: { organizationId_slug: { organizationId: plan.organizationId, slug: projectData.slug } },
        create: { organizationId: plan.organizationId, teamId: teamMap.get(refId(team)) || null, name: projectData.name, slug: projectData.slug, ownerId },
        update: { teamId: teamMap.get(refId(team)) || null, name: projectData.name },
      });
      projectMap.set(refId(team), project.id);
      const ownerMembershipId = membershipMap.get(raw.members.find((member) => userMap.get(refId(member)) === ownerId)?._id?.toString());
      if (ownerMembershipId) await tx.projectMember.upsert({ where: { projectId_membershipId: { projectId: project.id, membershipId: ownerMembershipId } }, create: { projectId: project.id, membershipId: ownerMembershipId, role: 'owner' }, update: { role: 'owner' } });
    }
    const fallbackProject = [...projectMap.values()][0];

    const counts = { teams: 0, members: 0, projects: projectMap.size, tasks: 0, plans: 0, meetings: 0, skipped: 0 };
    for (const task of raw.tasks) {
      const legacyId = refId(task);
      if (await findMapping(tx, plan.organizationId, 'task', legacyId)) { counts.skipped += 1; continue; }
      const projectId = projectMap.get(refId(task.team)) || fallbackProject;
      if (!projectId) continue;
      const created = await tx.task.create({ data: { organizationId: plan.organizationId, projectId, creatorId: userMap.get(refId(task.createdBy)) || ownerId, title: task.title, description: task.description || '', status: mapTaskStatus(task.status), priority: 'none', dueAt: task.dueDate || null } });
      const assigneeId = membershipMap.get(refId(task.assignee));
      if (assigneeId) await tx.taskAssignee.create({ data: { taskId: created.id, membershipId: assigneeId } });
      await createMapping(tx, plan.organizationId, 'task', legacyId, created.id);
      counts.tasks += 1;
    }
    for (const planItem of raw.plans) {
      const legacyId = refId(planItem);
      if (await findMapping(tx, plan.organizationId, 'plan', legacyId)) { counts.skipped += 1; continue; }
      const projectId = projectMap.get(refId(planItem.team)) || fallbackProject;
      if (!projectId) continue;
      await tx.activityEvent.create({ data: { organizationId: plan.organizationId, actorId: userMap.get(refId(planItem.createdBy)) || ownerId, action: 'legacy_plan_published', resourceType: 'project', resourceId: projectId, metadata: { title: planItem.title, content: planItem.content || '', fileUrl: planItem.fileUrl || '', forDate: planItem.forDate || null } } });
      await createMapping(tx, plan.organizationId, 'plan', legacyId, projectId);
      counts.plans += 1;
    }
    for (const meeting of raw.meetings) {
      const legacyId = refId(meeting);
      if (await findMapping(tx, plan.organizationId, 'meeting', legacyId)) { counts.skipped += 1; continue; }
      const startAt = new Date(meeting.scheduledAt);
      const created = await tx.meeting.create({ data: { organizationId: plan.organizationId, creatorId: userMap.get(refId(meeting.organizer)) || ownerId, title: meeting.title, description: meeting.agenda || '', startAt, endAt: new Date(startAt.getTime() + 60 * 60 * 1000), timezone: 'UTC', videoUrl: meeting.meetLink || '', provider: 'legacy', externalEventId: `legacy:${legacyId}` } });
      for (const invitee of meeting.invitees || []) await tx.meetingAttendee.create({ data: { meetingId: created.id, membershipId: membershipMap.get(refId(invitee)) || null, email: raw.members.find((member) => refId(member) === refId(invitee))?.email || 'unknown@example.invalid' } });
      await createMapping(tx, plan.organizationId, 'meeting', legacyId, created.id);
      counts.meetings += 1;
    }
    counts.teams = raw.teams.length;
    counts.members = raw.members.length;
    return counts;
  });
  return result;
}

async function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const organizationId = process.env.SAAS_ORGANIZATION_ID;
  if (!organizationId) throw new Error('SAAS_ORGANIZATION_ID is required and must identify the target organization.');
  const raw = await loadLegacyDocuments();
  const plan = buildMigrationPlan({ ...raw, organizationId });
  const output = { mode: options.dryRun ? 'dry-run' : 'apply', plan };
  if (options.dryRun) return report(output, options.reportPath);
  const result = await applyMigration(raw, plan);
  return report({ ...output, result }, options.reportPath);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildMigrationPlan, mapTaskStatus, parseArgs, run };
