import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProgress } from '../utils/progress.js';

test('computeProgress returns zeros for an empty task list', () => {
  const result = computeProgress([]);
  assert.equal(result.total, 0);
  assert.equal(result.percent, 0);
});

test('computeProgress counts each status bucket correctly', () => {
  const tasks = [
    { status: 'todo' },
    { status: 'in-progress' },
    { status: 'blocked' },
    { status: 'done' },
    { status: 'done' },
  ];
  const result = computeProgress(tasks);
  assert.equal(result.total, 5);
  assert.equal(result.done, 2);
  assert.equal(result.inProgress, 1);
  assert.equal(result.blocked, 1);
  assert.equal(result.todo, 1);
  assert.equal(result.percent, 40); // 2/5 = 40%
});

test('computeProgress rounds percent to the nearest whole number', () => {
  const tasks = [{ status: 'done' }, { status: 'todo' }, { status: 'todo' }];
  const result = computeProgress(tasks);
  assert.equal(result.percent, 33); // 1/3 -> 33.33 -> 33
});
