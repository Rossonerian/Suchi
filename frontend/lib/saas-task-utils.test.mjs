import test from 'node:test';
import assert from 'node:assert/strict';
import { dateInputToIso, filterSaasTasks, isDueToday, isOverdue, taskProgress } from './saas-task-utils.mjs';

const tasks = [
  { id: 'a', title: 'Draft brief', description: 'Website', projectId: 'p1', status: 'todo', priority: 'high', dueAt: '2026-09-06T10:00:00.000Z' },
  { id: 'b', title: 'Ship build', description: '', projectId: 'p2', status: 'done', priority: 'urgent', dueAt: null },
  { id: 'c', title: 'Review copy', description: '', projectId: 'p1', status: 'blocked', priority: 'medium', dueAt: '2026-09-09T10:00:00.000Z' },
];

test('filters SaaS tasks by query and structured filters', () => {
  assert.deepEqual(filterSaasTasks(tasks, { query: 'website' }).map((task) => task.id), ['a']);
  assert.deepEqual(filterSaasTasks(tasks, { projectId: 'p1', status: 'blocked' }).map((task) => task.id), ['c']);
  assert.deepEqual(filterSaasTasks(tasks, { priority: 'urgent' }).map((task) => task.id), ['b']);
});

test('progress excludes cancelled work and reports no-work distinctly', () => {
  assert.equal(taskProgress([{ status: 'done' }, { status: 'todo' }, { status: 'cancelled' }]), 50);
  assert.equal(taskProgress([{ status: 'cancelled' }]), null);
});

test('deadline helpers use the supplied clock', () => {
  const now = new Date('2026-09-07T12:00:00.000Z');
  assert.equal(isOverdue(tasks[0], now), true);
  assert.equal(isDueToday({ ...tasks[2], dueAt: '2026-09-07T20:00:00.000Z' }, now), true);
  assert.equal(isDueToday(tasks[1], now), false);
});

test('date input conversion is deterministic and null-safe', () => {
  assert.match(dateInputToIso('2026-09-07'), /^2026-09-07T/);
  assert.equal(dateInputToIso(''), null);
  assert.equal(dateInputToIso('not-a-date'), null);
});
