import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMigrationPlan, mapTaskStatus, parseArgs } from '../scripts/migrate-nidar-to-saas.js';

test('legacy task statuses map to intentional SaaS states', () => {
  assert.equal(mapTaskStatus('todo'), 'todo');
  assert.equal(mapTaskStatus('in-progress'), 'in_progress');
  assert.equal(mapTaskStatus('blocked'), 'blocked');
  assert.equal(mapTaskStatus('done'), 'done');
  assert.equal(mapTaskStatus('unexpected'), 'backlog');
});

test('migration planner reports counts, deterministic mappings, and plan exceptions', () => {
  const plan = buildMigrationPlan({
    organizationId: 'org_target',
    teams: [{ _id: 'team_1', key: 'core-technical', displayName: 'Core Technical' }],
    members: [{ _id: 'member_1', name: 'Alice', email: 'alice@example.com', role: 'admin', team: 'team_1' }],
    tasks: [{ _id: 'task_1', title: 'Legacy task', status: 'in-progress', team: 'team_1', createdBy: 'member_1', assignee: 'member_1' }],
    plans: [{ _id: 'plan_1', team: 'team_1', title: 'Plan', content: 'Notes' }],
    meetings: [{ _id: 'meeting_1', title: 'Sync', organizer: 'member_1', invitees: ['member_1'], scheduledAt: '2099-01-01T10:00:00.000Z' }],
  });
  assert.deepEqual(plan.counts, { teams: 1, members: 1, tasks: 1, plans: 1, meetings: 1 });
  assert.equal(plan.teamProjects['team_1'].slug, 'legacy-core-technical');
  assert.equal(plan.tasks[0].status, 'in_progress');
  assert.match(plan.exceptions[0], /plans become activity events/);
  assert.equal(plan.organizationId, 'org_target');
});

test('migration defaults to dry run and requires an explicit apply flag', () => {
  assert.deepEqual(parseArgs([]), { apply: false, dryRun: true, reportPath: null });
  assert.deepEqual(parseArgs(['--apply', '--report', 'tmp/report.json']), { apply: true, dryRun: false, reportPath: 'tmp/report.json' });
});
